/* =========================================================================
 * payments.js — Stripe Checkout istemci akışı (backend üzerinden)
 *
 * Akış:
 *  1) checkout(plan, interval) → backend /create-checkout-session → Stripe
 *     Checkout sayfasına yönlendir (kart bilgisi ASLA bize gelmez).
 *  2) Stripe başarıda ?checkout=success&session_id=... ile geri döner.
 *  3) handleReturn() → backend /session-status → imzalı entitlement token
 *     → Entitlements.applyToken → kilitler anında açılır.
 *     (Webhook gecikirse session-status senkron doğrular — "işleniyor"
 *     durumuna takılma yok.)
 * ========================================================================= */
"use strict";

const Payments = (() => {

  function appBaseUrl() {
    return location.origin + location.pathname;
  }

  async function checkout(planId, interval) {
    const email = (Entitlements.current() && Entitlements.current().email) || "";
    const res = await fetch(Entitlements.backendUrl() + "/create-checkout-session", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        plan: planId,
        interval,                    // "monthly" | "yearly" | "onetime"
        email,
        successUrl: appBaseUrl() + "?checkout=success&session_id={CHECKOUT_SESSION_ID}",
        cancelUrl: appBaseUrl() + "?checkout=cancel#/paywall"
      })
    });
    if (!res.ok) {
      const t = await res.text().catch(() => "");
      throw new Error("Ödeme başlatılamadı (" + res.status + "): " + t.slice(0, 140));
    }
    const data = await res.json();
    if (!data.url) throw new Error("Ödeme adresi alınamadı");
    location.href = data.url; // Stripe Checkout'a git
  }

  /* Açılışta checkout dönüşünü yakala. true dönerse yönlendirme yapıldı. */
  async function handleReturn() {
    const params = new URLSearchParams(location.search);
    const flag = params.get("checkout");
    if (!flag) return false;

    /* URL'i hemen temizle (yenilemede tekrar işlenmesin) */
    const cleanUrl = location.pathname + (location.hash || "#/home");
    if (flag === "cancel") {
      history.replaceState(null, "", cleanUrl);
      UI.toast("Ödeme iptal edildi — istediğin zaman devam edebilirsin");
      return false;
    }

    const sessionId = params.get("session_id");
    history.replaceState(null, "", location.pathname + "#/home");
    if (!sessionId) return false;

    UI.toast("Ödemen doğrulanıyor...");
    try {
      const res = await fetch(Entitlements.backendUrl() + "/session-status", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ sessionId })
      });
      if (!res.ok) throw new Error("doğrulama " + res.status);
      const data = await res.json();
      if (data.status === "processing") {
        /* webhook henüz düşmedi — kısa tekrar dene */
        await new Promise(r => setTimeout(r, 2500));
        return handleReturnRetry(sessionId, 3);
      }
      if (data.token) {
        await Entitlements.applyToken(data);
        UI.toast(`🎉 ${PRICING.plans[data.plan].name} planın aktif — hoş geldin!`);
        return true;
      }
      throw new Error("ödeme tamamlanmamış görünüyor");
    } catch (e) {
      UI.toast("Doğrulama tamamlanamadı: " + e.message + " — Ayarlar > Geri Yükle'yi dene");
      return false;
    }
  }

  async function handleReturnRetry(sessionId, left) {
    if (left <= 0) {
      UI.toast("Ödeme işleniyor — birkaç dakika içinde Ayarlar > Geri Yükle ile etkinleştir");
      return false;
    }
    try {
      const res = await fetch(Entitlements.backendUrl() + "/session-status", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ sessionId })
      });
      const data = await res.json();
      if (data.token) {
        await Entitlements.applyToken(data);
        UI.toast(`🎉 ${PRICING.plans[data.plan].name} planın aktif!`);
        return true;
      }
    } catch (_) {}
    await new Promise(r => setTimeout(r, 2500));
    return handleReturnRetry(sessionId, left - 1);
  }

  /* Stripe Customer Portal (iptal / kart / faturalar — Stripe barındırır) */
  async function openPortal() {
    const ent = Entitlements.current();
    if (!ent || !ent.email) throw new Error("Aktif abonelik bulunamadı");
    const res = await fetch(Entitlements.backendUrl() + "/portal", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: ent.email, returnUrl: appBaseUrl() + "#/billing" })
    });
    if (!res.ok) throw new Error("Portal açılamadı (" + res.status + ")");
    const data = await res.json();
    location.href = data.url;
  }

  return { checkout, handleReturn, openPortal };
})();
