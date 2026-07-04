/* =========================================================================
 * worker.js — US Citizenship abonelik backend'i (Ardaluna Holding LLC)
 *
 * Cloudflare Workers modül formatı; local-server.mjs aynı handler'ı Node'da
 * çalıştırır (test/mock modu). Stripe SDK YOK — raw REST (fetch), bağımlılık
 * sıfır. JWT HS256, WebCrypto ile (Workers + Node 18+ ortak).
 *
 * ENDPOINT'LER
 *   POST /create-checkout-session {plan, interval, email?, successUrl, cancelUrl}
 *   POST /webhook                 (Stripe imza doğrulamalı)
 *   POST /session-status          {sessionId}  → ödeme senkron doğrulama
 *   POST /verify                  {token}      → entitlement tazele
 *   POST /restore                 {email}      → aboneliği e-postayla geri yükle
 *   POST /portal                  {email, returnUrl} → Stripe Customer Portal
 *
 * ENV (wrangler.toml / .env — ASLA repoya gerçek değer koyma):
 *   STRIPE_SECRET_KEY      sk_test_... / sk_live_...
 *   STRIPE_WEBHOOK_SECRET  whsec_...
 *   JWT_SECRET             uzun rastgele dize
 *   ALLOWED_ORIGINS        virgüllü liste veya *
 *   MOCK_STRIPE            "true" → Stripe'sız yerel test (mock ödeme sayfası)
 *   PRICE_PREP_MONTHLY / PRICE_PREP_YEARLY / PRICE_PRO_MONTHLY /
 *   PRICE_PRO_YEARLY / PRICE_LIFETIME   → Stripe Price ID'leri
 *
 * KV: env.ENTITLEMENTS  (Cloudflare KV; local adaptör Map sağlar)
 *   anahtar  email:<posta>  →  {plan,status,currentPeriodEnd,customerId,subscriptionId}
 *   anahtar  mock:<sid>     →  mock checkout oturumları (yalnız MOCK modda)
 * ========================================================================= */
"use strict";

const PLAN_FEATURES = ["free", "prep", "pro", "lifetime"];
const LIFETIME_EXPIRES = 4102444800000; // 2100-01-01 — "süresiz" temsili

/* ------------------------------ yardımcılar ------------------------------ */

const te = new TextEncoder();

function b64url(buf) {
  const bytes = buf instanceof ArrayBuffer ? new Uint8Array(buf) : buf;
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function b64urlDecodeToString(s) {
  s = s.replace(/-/g, "+").replace(/_/g, "/");
  while (s.length % 4) s += "=";
  return atob(s);
}

async function hmacKey(secret) {
  return crypto.subtle.importKey("raw", te.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
}

async function jwtSign(payload, secret) {
  const header = b64url(te.encode(JSON.stringify({ alg: "HS256", typ: "JWT" })));
  const body = b64url(te.encode(JSON.stringify(payload)));
  const key = await hmacKey(secret);
  const sig = await crypto.subtle.sign("HMAC", key, te.encode(`${header}.${body}`));
  return `${header}.${body}.${b64url(sig)}`;
}

async function jwtVerify(token, secret) {
  const parts = (token || "").split(".");
  if (parts.length !== 3) return null;
  const key = await hmacKey(secret);
  const sigBytes = Uint8Array.from(b64urlDecodeToString(parts[2]), c => c.charCodeAt(0));
  const ok = await crypto.subtle.verify("HMAC", key, sigBytes, te.encode(`${parts[0]}.${parts[1]}`));
  if (!ok) return null;
  try { return JSON.parse(b64urlDecodeToString(parts[1])); } catch { return null; }
}

/* Stripe REST çağrısı (form-encoded) */
async function stripe(env, method, path, params = null) {
  const opts = {
    method,
    headers: {
      "authorization": "Bearer " + env.STRIPE_SECRET_KEY,
      "content-type": "application/x-www-form-urlencoded"
    }
  };
  if (params) {
    const usp = new URLSearchParams();
    const flat = (obj, prefix = "") => {
      for (const [k, v] of Object.entries(obj)) {
        const key = prefix ? `${prefix}[${k}]` : k;
        if (v && typeof v === "object") flat(v, key);
        else if (v !== undefined && v !== null) usp.append(key, String(v));
      }
    };
    flat(params);
    if (method === "GET") path += (path.includes("?") ? "&" : "?") + usp.toString();
    else opts.body = usp.toString();
  }
  const res = await fetch("https://api.stripe.com" + path, opts);
  const data = await res.json();
  if (!res.ok) {
    const msg = (data.error && data.error.message) || res.statusText;
    throw new StripeError(msg, res.status);
  }
  return data;
}
class StripeError extends Error {
  constructor(msg, status) { super(msg); this.status = status; }
}

/* Stripe webhook imzası: HMAC-SHA256("timestamp.payload") */
async function verifyStripeSignature(payload, sigHeader, secret) {
  if (!sigHeader) return false;
  const parts = Object.fromEntries(sigHeader.split(",").map(p => p.split("=")));
  const t = parts.t, v1 = parts.v1;
  if (!t || !v1) return false;
  /* 5 dk tolerans — tekrar oynatma saldırısına karşı */
  if (Math.abs(Date.now() / 1000 - Number(t)) > 300) return false;
  const key = await hmacKey(secret);
  const sig = await crypto.subtle.sign("HMAC", key, te.encode(`${t}.${payload}`));
  const hex = [...new Uint8Array(sig)].map(b => b.toString(16).padStart(2, "0")).join("");
  return hex === v1;
}

function priceIdFor(env, plan, interval) {
  const map = {
    "prep:monthly": env.PRICE_PREP_MONTHLY, "prep:yearly": env.PRICE_PREP_YEARLY,
    "pro:monthly": env.PRICE_PRO_MONTHLY,   "pro:yearly": env.PRICE_PRO_YEARLY,
    "lifetime:onetime": env.PRICE_LIFETIME
  };
  return map[`${plan}:${interval}`] || null;
}

/* ---------------------------- KV kayıtları ---------------------------- */

async function kvGet(env, key) {
  const raw = await env.ENTITLEMENTS.get(key);
  return raw ? JSON.parse(raw) : null;
}
async function kvPut(env, key, val) {
  await env.ENTITLEMENTS.put(key, JSON.stringify(val));
}

function entKey(email) { return "email:" + email.trim().toLowerCase(); }

/* Kayıttan istemci token yükü üret */
async function mintTokenPayload(env, email, rec) {
  const expiresAt = rec.plan === "lifetime" ? LIFETIME_EXPIRES : (rec.currentPeriodEnd || 0);
  const token = await jwtSign({ email, plan: rec.plan, expiresAt, status: rec.status, iat: Date.now() }, env.JWT_SECRET);
  return { token, plan: rec.plan, expiresAt, email, status: rec.status };
}

function isRecActive(rec, graceMs = 7 * 86400000) {
  if (!rec) return false;
  if (rec.plan === "lifetime") return rec.status !== "refunded";
  if (!["active", "trialing", "past_due"].includes(rec.status)) return false;
  return (rec.currentPeriodEnd || 0) + graceMs > Date.now();
}

/* ------------------------------- CORS ------------------------------- */

function corsHeaders(env, req) {
  const origin = req.headers.get("origin") || "";
  const allowed = (env.ALLOWED_ORIGINS || "*").split(",").map(s => s.trim());
  const allow = allowed.includes("*") ? "*" : (allowed.includes(origin) ? origin : allowed[0] || "");
  return {
    "access-control-allow-origin": allow,
    "access-control-allow-methods": "GET, POST, OPTIONS",
    "access-control-allow-headers": "content-type",
    "content-type": "application/json"
  };
}

function json(data, status, headers) {
  return new Response(JSON.stringify(data), { status, headers });
}

/* =============================== HANDLER =============================== */

async function handle(req, env) {
  const url = new URL(req.url);
  const path = url.pathname;
  const H = corsHeaders(env, req);
  const mock = env.MOCK_STRIPE === "true";

  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: H });

  try {
    /* ------------------------------------------------ sağlık */
    if (path === "/health") {
      return json({ ok: true, mode: mock ? "MOCK" : "STRIPE", ts: Date.now() }, 200, H);
    }

    /* ------------------------------------------------ checkout başlat */
    if (path === "/create-checkout-session" && req.method === "POST") {
      const { plan, interval, email, successUrl, cancelUrl } = await req.json();
      if (!PLAN_FEATURES.includes(plan) || plan === "free") return json({ error: "geçersiz plan" }, 400, H);
      if (!successUrl || !cancelUrl) return json({ error: "successUrl/cancelUrl gerekli" }, 400, H);

      if (mock) {
        /* MOCK: yerel sahte checkout sayfasına yönlendir */
        const sid = "cs_mock_" + crypto.randomUUID().slice(0, 12);
        await kvPut(env, "mock:" + sid, {
          plan, interval, email: email || null, paid: false,
          successUrl, cancelUrl, createdAt: Date.now()
        });
        const base = env.MOCK_BASE_URL || url.origin;
        return json({ url: `${base}/mock-checkout?sid=${sid}`, sessionId: sid, mock: true }, 200, H);
      }

      const price = priceIdFor(env, plan, interval);
      if (!price) return json({ error: `fiyat tanımsız: ${plan}/${interval} — Stripe Price ID'lerini env'e ekle` }, 400, H);
      const isSub = interval !== "onetime";
      const session = await stripe(env, "POST", "/v1/checkout/sessions", {
        mode: isSub ? "subscription" : "payment",
        "line_items[0][price]": price,
        "line_items[0][quantity]": 1,
        success_url: successUrl,
        cancel_url: cancelUrl,
        ...(email ? { customer_email: email } : {}),
        "metadata[plan]": plan,
        "metadata[interval]": interval,
        allow_promotion_codes: "true",
        billing_address_collection: "auto"
      });
      return json({ url: session.url, sessionId: session.id }, 200, H);
    }

    /* ------------------------------------------------ MOCK checkout sayfası + ödeme simülasyonu */
    if (mock && path === "/mock-checkout" && req.method === "GET") {
      const sid = url.searchParams.get("sid");
      const rec = await kvGet(env, "mock:" + sid);
      if (!rec) return new Response("mock session yok", { status: 404 });
      const html = `<!doctype html><meta charset="utf8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>MOCK Stripe Checkout</title>
<body style="font-family:system-ui;max-width:420px;margin:40px auto;padding:0 16px">
<h2>🧪 MOCK Stripe Checkout</h2>
<p>Plan: <b>${rec.plan}</b> (${rec.interval})</p>
<p style="background:#fef3c7;padding:10px;border-radius:8px">Bu sayfa TEST içindir — gerçek Stripe anahtarları girildiğinde yerini gerçek Stripe Checkout alır.</p>
<form method="POST" action="/mock-checkout?sid=${sid}">
<label>E-posta: <input name="email" type="email" required value="${rec.email || "test@example.com"}" style="width:100%;padding:8px;margin:6px 0"></label>
<label>Kart: <input value="4242 4242 4242 4242" disabled style="width:100%;padding:8px;margin:6px 0"></label>
<button style="width:100%;padding:12px;background:#635bff;color:#fff;border:none;border-radius:8px;font-size:16px">Öde (test)</button>
</form>
<form method="POST" action="/mock-checkout?sid=${sid}&cancel=1"><button style="width:100%;padding:10px;margin-top:8px;background:none;border:1px solid #ccc;border-radius:8px">İptal</button></form>
</body>`;
      return new Response(html, { status: 200, headers: { "content-type": "text/html; charset=utf-8" } });
    }

    if (mock && path === "/mock-checkout" && req.method === "POST") {
      const sid = url.searchParams.get("sid");
      const rec = await kvGet(env, "mock:" + sid);
      if (!rec) return new Response("mock session yok", { status: 404 });
      if (url.searchParams.get("cancel")) {
        return Response.redirect(rec.cancelUrl, 303);
      }
      const form = await req.formData();
      const email = String(form.get("email") || rec.email || "test@example.com");
      rec.paid = true; rec.email = email;
      await kvPut(env, "mock:" + sid, rec);
      /* webhook eşdeğeri: entitlement kaydını yaz (gerçekte webhook yazar) */
      const periodEnd = rec.interval === "yearly" ? Date.now() + 365 * 86400000
                       : rec.interval === "monthly" ? Date.now() + 30 * 86400000
                       : LIFETIME_EXPIRES;
      await kvPut(env, entKey(email), {
        plan: rec.plan, status: "active",
        currentPeriodEnd: rec.plan === "lifetime" ? null : periodEnd,
        customerId: "cus_mock", subscriptionId: rec.interval === "onetime" ? null : "sub_mock",
        updatedAt: Date.now()
      });
      return Response.redirect(rec.successUrl.replace("{CHECKOUT_SESSION_ID}", sid), 303);
    }

    /* ------------------------------------------------ dönüş doğrulama */
    if (path === "/session-status" && req.method === "POST") {
      const { sessionId } = await req.json();
      if (!sessionId) return json({ error: "sessionId gerekli" }, 400, H);

      if (mock) {
        const rec = await kvGet(env, "mock:" + sessionId);
        if (!rec) return json({ error: "oturum bulunamadı" }, 404, H);
        if (!rec.paid) return json({ status: "processing" }, 200, H);
        const ent = await kvGet(env, entKey(rec.email));
        return json(await mintTokenPayload(env, rec.email, ent), 200, H);
      }

      const session = await stripe(env, "GET", `/v1/checkout/sessions/${encodeURIComponent(sessionId)}`);
      if (session.payment_status !== "paid") return json({ status: "processing" }, 200, H);
      const email = (session.customer_details && session.customer_details.email) || session.customer_email;
      const plan = session.metadata && session.metadata.plan;
      if (!email || !plan) return json({ error: "oturum verisi eksik" }, 500, H);

      let currentPeriodEnd = null;
      if (session.mode === "subscription" && session.subscription) {
        const sub = await stripe(env, "GET", `/v1/subscriptions/${session.subscription}`);
        currentPeriodEnd = sub.current_period_end * 1000;
      }
      const rec = {
        plan, status: "active", currentPeriodEnd,
        customerId: session.customer, subscriptionId: session.subscription || null,
        updatedAt: Date.now()
      };
      await kvPut(env, entKey(email), rec);
      return json(await mintTokenPayload(env, email, rec), 200, H);
    }

    /* ------------------------------------------------ Stripe webhook */
    if (path === "/webhook" && req.method === "POST") {
      const payload = await req.text();
      if (!mock) {
        const ok = await verifyStripeSignature(payload, req.headers.get("stripe-signature"), env.STRIPE_WEBHOOK_SECRET);
        if (!ok) return json({ error: "imza geçersiz" }, 400, H);
      }
      const event = JSON.parse(payload);
      const obj = event.data && event.data.object;

      if (event.type === "checkout.session.completed" && obj.payment_status === "paid") {
        const email = (obj.customer_details && obj.customer_details.email) || obj.customer_email;
        const plan = obj.metadata && obj.metadata.plan;
        if (email && plan) {
          let currentPeriodEnd = null;
          if (obj.mode === "subscription" && obj.subscription && !mock) {
            const sub = await stripe(env, "GET", `/v1/subscriptions/${obj.subscription}`);
            currentPeriodEnd = sub.current_period_end * 1000;
          }
          await kvPut(env, entKey(email), {
            plan, status: "active", currentPeriodEnd,
            customerId: obj.customer, subscriptionId: obj.subscription || null,
            updatedAt: Date.now()
          });
        }
      }

      if (event.type === "customer.subscription.updated" || event.type === "customer.subscription.deleted") {
        /* e-postayı customer'dan çöz */
        let email = null;
        if (!mock && obj.customer) {
          const cust = await stripe(env, "GET", `/v1/customers/${obj.customer}`);
          email = cust.email;
        }
        if (email) {
          const key = entKey(email);
          const rec = await kvGet(env, key);
          if (rec && rec.plan !== "lifetime") {
            rec.status = event.type.endsWith("deleted") ? "canceled" : obj.status;
            rec.currentPeriodEnd = obj.current_period_end ? obj.current_period_end * 1000 : rec.currentPeriodEnd;
            rec.updatedAt = Date.now();
            await kvPut(env, key, rec);
          }
        }
      }

      if (event.type === "invoice.payment_failed") {
        let email = null;
        if (!mock && obj.customer) {
          const cust = await stripe(env, "GET", `/v1/customers/${obj.customer}`);
          email = cust.email;
        }
        if (email) {
          const rec = await kvGet(env, entKey(email));
          if (rec && rec.plan !== "lifetime") {
            rec.status = "past_due"; // dunning: /verify bunu istemciye taşır
            rec.updatedAt = Date.now();
            await kvPut(env, entKey(email), rec);
          }
        }
      }

      return json({ received: true }, 200, H);
    }

    /* ------------------------------------------------ token doğrula/tazele */
    if (path === "/verify" && req.method === "POST") {
      const { token } = await req.json();
      const payload = await jwtVerify(token, env.JWT_SECRET);
      if (!payload || !payload.email) return json({ error: "token geçersiz" }, 401, H);
      const rec = await kvGet(env, entKey(payload.email));
      if (!rec || !isRecActive(rec)) return json({ error: "abonelik aktif değil" }, 403, H);
      return json(await mintTokenPayload(env, payload.email, rec), 200, H);
    }

    /* ------------------------------------------------ e-postayla geri yükle */
    if (path === "/restore" && req.method === "POST") {
      const { email } = await req.json();
      if (!email || !email.includes("@")) return json({ error: "geçerli e-posta gerekli" }, 400, H);
      const rec = await kvGet(env, entKey(email));
      if (!rec || !isRecActive(rec)) return json({ error: "aktif abonelik bulunamadı" }, 404, H);
      return json(await mintTokenPayload(env, email, rec), 200, H);
    }

    /* ------------------------------------------------ Customer Portal */
    if (path === "/portal" && req.method === "POST") {
      const { email, returnUrl } = await req.json();
      const rec = await kvGet(env, entKey(email || ""));
      if (!rec || !rec.customerId) return json({ error: "müşteri bulunamadı" }, 404, H);
      if (mock) return json({ url: (returnUrl || "/") + "?portal=mock" }, 200, H);
      const session = await stripe(env, "POST", "/v1/billing_portal/sessions", {
        customer: rec.customerId,
        return_url: returnUrl || "https://loadwizz.github.io/us-citizenship/"
      });
      return json({ url: session.url }, 200, H);
    }

    return json({ error: "bulunamadı" }, 404, H);
  } catch (e) {
    const status = e instanceof StripeError ? 502 : 500;
    return json({ error: e.message }, status, H);
  }
}

export default { fetch: handle };
export { handle, jwtSign, jwtVerify, verifyStripeSignature, isRecActive };
