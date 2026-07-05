/* =========================================================================
 * local-server.mjs — worker.js'i Node'da çalıştıran yerel adaptör.
 * Kullanım:  node backend/local-server.mjs   (varsayılan port 8787)
 *
 * - .env dosyası varsa okur (backend/.env — repoya girmez)
 * - Varsayılan MOCK_STRIPE=true → Stripe anahtarı olmadan uçtan uca test
 * - KV: bellek içi Map + diske yazma (backend/.kv.json) — yeniden
 *   başlatmada entitlement kayıtları kaybolmasın
 * ========================================================================= */
import { createServer } from "node:http";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const { handle } = await import(join(here, "worker.js"));

/* ---- .env yükle ---- */
const envFile = join(here, ".env");
const fileEnv = {};
if (existsSync(envFile)) {
  for (const line of readFileSync(envFile, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/);
    if (m && !line.trim().startsWith("#")) fileEnv[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

const PORT = Number(process.env.PORT || fileEnv.PORT || 8787);

/* ---- kalıcı bellek-içi KV ---- */
const kvPath = join(here, ".kv.json");
const kvData = existsSync(kvPath) ? JSON.parse(readFileSync(kvPath, "utf8")) : {};
const ENTITLEMENTS = {
  async get(k) { return kvData[k] ?? null; },
  async put(k, v) { kvData[k] = v; writeFileSync(kvPath, JSON.stringify(kvData, null, 2)); }
};

const env = {
  MOCK_STRIPE: "true",
  JWT_SECRET: "dev-secret-change-me",
  ALLOWED_ORIGINS: "*",
  MOCK_BASE_URL: `http://localhost:${PORT}`,
  ...fileEnv,
  ...Object.fromEntries(Object.entries(process.env).filter(([k]) =>
    /^(STRIPE_|JWT_|PRICE_|ALLOWED_|MOCK_|RESEND_|MAIL_)/.test(k))),
  ENTITLEMENTS
};

createServer(async (req, res) => {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const body = Buffer.concat(chunks);
  const request = new Request(`http://localhost:${PORT}${req.url}`, {
    method: req.method,
    headers: req.headers,
    body: ["GET", "HEAD"].includes(req.method) ? undefined : body,
    duplex: "half"
  });
  try {
    const response = await handle(request, env);
    /* Response.redirect üretimi dahil */
    res.writeHead(response.status, Object.fromEntries(response.headers));
    const buf = Buffer.from(await response.arrayBuffer());
    res.end(buf);
  } catch (e) {
    res.writeHead(500, { "content-type": "application/json" });
    res.end(JSON.stringify({ error: e.message }));
  }
}).listen(PORT, () => {
  console.log(`✅ Backend hazır: http://localhost:${PORT}  (mod: ${env.MOCK_STRIPE === "true" ? "MOCK — Stripe anahtarsız test" : "STRIPE"})`);
  console.log(`   Sağlık: curl http://localhost:${PORT}/health`);
});
