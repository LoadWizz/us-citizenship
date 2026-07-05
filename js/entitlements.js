/* =========================================================================
 * entitlements.js — Hibrit yetkilendirme dikişi (entitlement seam)
 *
 * TEK ARAYÜZ: Entitlements.has("feature") — TÜM içerik kilitleri buradan.
 * Sağlayıcılar:
 *   - StripeProvider  : backend /verify ile imzalı JWT doğrular (AKTİF)
 *   - AppleIAPStub    : gelecekteki App Store IAP (Capacitor) — aynı kilide
 *   - GooglePlayStub  : gelecekteki Play Billing (TWA) — aynı kilide
 *   - DevUnlock       : açıkça işaretli geliştirme/test kilidi açma
 *
 * Çevrimdışı davranış: son doğrulanan entitlement IndexedDB'de saklanır;
 * süre bitiminden sonra 7 GÜN GRACE penceresi vardır — ödeyen kullanıcı
 * uçakta/çevrimdışıyken asla kilitlenmez. Grace bitince kibarca yeniden
 * doğrulama istenir (Faz D banner'ı).
 * ========================================================================= */
"use strict";

const Entitlements = (() => {
  const GRACE_MS = 7 * 24 * 60 * 60 * 1000; // 7 gün çevrimdışı hoşgörü
  let state = null; // {plan, expiresAt, token, email, source, status, verifiedAt}

  /* ---------- saf mantık (selfcheck bunları test eder) ---------- */
  function planHas(plan, feature) {
    const allowed = PRICING.featureMatrix[feature];
    return !!allowed && allowed.includes(plan);
  }

  function isActive(ent, now = Date.now()) {
    if (!ent || !ent.plan || ent.plan === "free") return false;
    if (ent.plan === "lifetime") return true;
    if (!ent.expiresAt) return false;
    return now < ent.expiresAt + GRACE_MS;
  }

  /* Grace penceresinde miyiz? (banner için) */
  function inGrace(ent, now = Date.now()) {
    return !!ent && ent.expiresAt && now >= ent.expiresAt && now < ent.expiresAt + GRACE_MS;
  }

  /* ---------- durum ---------- */
  async function load() {
    state = await DB.getKV("entitlement", null);
    return state;
  }

  function current() { return state; }

  function has(feature) {
    if (!state) return false;
    if (!isActive(state)) return false;
    return planHas(state.plan, feature);
  }

  function plan() { return (state && isActive(state)) ? state.plan : "free"; }

  async function set(ent) {
    state = ent;
    await DB.setKV("entitlement", ent);
  }

  async function clear() {
    state = null;
    await DB.setKV("entitlement", null);
  }

  /* ---------- Stripe sağlayıcısı (backend üzerinden) ---------- */
  function backendUrl() {
    return (App.settings && App.settings.backendUrl) || PRICING.defaultBackendUrl;
  }

  /* Checkout dönüşünde veya periyodik açılışta token doğrula/yenile */
  async function verifyWithBackend() {
    if (!state || !state.token || state.source !== "stripe") return state;
    try {
      const res = await fetch(backendUrl() + "/verify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token: state.token })
      });
      if (res.status === 401 || res.status === 403) {
        /* Token geçersiz/abonelik bitmiş — grace devam edebilir, durumu işaretle */
        await set({ ...state, status: "invalid", verifiedAt: Date.now() });
        return state;
      }
      if (!res.ok) return state; // sunucu hatası: mevcut önbelleğe dokunma
      const data = await res.json();
      await set({
        plan: data.plan, expiresAt: data.expiresAt, token: data.token || state.token,
        email: data.email || state.email, source: "stripe",
        status: data.status || "active", verifiedAt: Date.now()
      });
    } catch (_) {
      /* çevrimdışı — son bilinen entitlement + grace penceresi geçerli */
    }
    return state;
  }

  /* Checkout başarı dönüşü: backend'in verdiği tokenı işle */
  async function applyToken(tokenPayload) {
    await set({
      plan: tokenPayload.plan,
      expiresAt: tokenPayload.expiresAt,
      token: tokenPayload.token,
      email: tokenPayload.email || null,
      source: "stripe",
      status: "active",
      verifiedAt: Date.now()
    });
    return state;
  }

  /* E-posta ile geri yükleme.
   * Backend Resend yapılandırılmışsa {sent:true} döner → kullanıcı e-postasına
   * gelen 6 haneli kodu restoreVerify ile doğrular. Yapılandırılmamışsa
   * (eski davranış) token doğrudan gelir ve hemen uygulanır. */
  async function restore(email) {
    const res = await fetch(backendUrl() + "/restore", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email })
    });
    if (!res.ok) {
      const t = await res.text().catch(() => "");
      throw new Error(res.status === 404 ? "Bu e-postayla aktif abonelik bulunamadı" : "Geri yükleme başarısız: " + t.slice(0, 120));
    }
    const data = await res.json();
    if (data.token) {
      await applyToken(data);
      return { done: true };
    }
    return data; // {sent:true, mockCode?}
  }

  /* Geri yükleme kodunu doğrula → token uygula */
  async function restoreVerify(email, code) {
    const res = await fetch(backendUrl() + "/restore-verify", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, code })
    });
    if (!res.ok) {
      let msg = "Kod doğrulanamadı";
      try { msg = (await res.json()).error || msg; } catch (_) {}
      throw new Error(msg);
    }
    return applyToken(await res.json());
  }

  /* ---------- Gelecek IAP sağlayıcıları (hibrit dikiş) ----------
   * Mağaza sürümlerinde (Capacitor iOS / TWA Android) satın alma bu
   * stub'ların gerçek implementasyonuyla yapılır ve applyStoreEntitlement()
   * AYNI kilidi besler — UI ve featureMatrix hiç değişmez. */
  const AppleIAPStub = {
    available: false,
    async purchase() { throw new Error("App Store sürümünde etkinleşecek"); }
  };
  const GooglePlayStub = {
    available: false,
    async purchase() { throw new Error("Google Play sürümünde etkinleşecek"); }
  };
  async function applyStoreEntitlement({ plan, expiresAt, source }) {
    await set({ plan, expiresAt, token: null, source, status: "active", verifiedAt: Date.now() });
  }

  /* ---------- DEV UNLOCK (açıkça işaretli, yalnız test) ---------- */
  async function devUnlock(planId) {
    await set({
      plan: planId, expiresAt: Date.now() + 365 * 86400000, token: null,
      email: "dev@test", source: "dev", status: "active", verifiedAt: Date.now()
    });
    console.warn("[DEV UNLOCK] Entitlement test amaçlı açıldı:", planId);
    return state;
  }

  return { load, current, has, plan, planHas, isActive, inGrace,
           verifyWithBackend, applyToken, restore, restoreVerify, clear,
           AppleIAPStub, GooglePlayStub, applyStoreEntitlement, devUnlock, GRACE_MS, backendUrl };
})();
