/* =========================================================================
 * views/billing.js — Faturalama: mevcut plan, yenileme, yönetim, hatalar
 * Kart/iptal/fatura geçmişi Stripe Customer Portal'da yönetilir (PCI yükü
 * bizde değil). Dunning (ödeme başarısız) ve grace (çevrimdışı hoşgörü)
 * durumları burada ve ana sayfa banner'ında Türkçe anlatılır.
 * ========================================================================= */
"use strict";

const BillingView = {
  async render(root) {
    const { h } = UI;
    const ent = Entitlements.current();
    const active = ent && Entitlements.isActive(ent);
    const planId = Entitlements.plan();
    const plan = PRICING.plans[planId];

    const banners = [];
    if (ent && ent.status === "past_due") {
      banners.push(h("div", { class: "banner banner-err" },
        "💳 Son ödemen alınamadı. Erişimin kısa süreliğine devam ediyor — kart bilgini güncelle.",
        h("button", { class: "btn small-btn btn-primary", style: { marginLeft: "auto", width: "auto" }, onclick: () => this.portal() }, "Kartı Güncelle")));
    }
    if (ent && Entitlements.inGrace(ent)) {
      banners.push(h("div", { class: "banner banner-warn" },
        "⏳ Aboneliğin doğrulanamadı (çevrimdışı olabilirsin). 7 günlük hoşgörü penceresindesin — internete bağlanınca otomatik yenilenir."));
    }
    if (ent && ent.status === "invalid") {
      banners.push(h("div", { class: "banner banner-err" },
        "Aboneliğin doğrulanamadı. Yenilemek için geri yükle veya yeni plan seç."));
    }

    root.appendChild(h("div", { class: "page" },
      h("h1", {}, "💳 Faturalama"),
      ...banners,

      h("div", { class: "card" },
        h("div", { class: "row-between" },
          h("h3", { style: { margin: 0 } }, "Mevcut plan"),
          h("span", { class: `badge ${active ? "badge-star" : ""}` }, plan.name)),
        active && ent.expiresAt && planId !== "lifetime"
          ? h("p", { class: "small muted" }, `Yenileme/bitiş: ${UI.fmtDate(ent.expiresAt)}`)
          : null,
        planId === "lifetime" ? h("p", { class: "small ok" }, "Süresiz erişim — yenileme yok 🎉") : null,
        ent && ent.email ? h("p", { class: "small muted" }, `Hesap: ${ent.email}`) : null,
        ent && ent.source === "dev" ? h("p", { class: "small fail" }, "⚠️ DEV UNLOCK aktif (yalnız test)") : null),

      active && ent.source === "stripe" && planId !== "lifetime" ? h("div", { class: "card" },
        h("h3", {}, "Aboneliği yönet"),
        h("p", { class: "small muted" }, "Kart güncelleme, fatura geçmişi, plan değişikliği ve iptal Stripe'ın güvenli portalında yapılır."),
        h("button", { class: "btn btn-outline", onclick: () => this.portal() }, "🔧 Stripe Portalını Aç"),
        h("p", { class: "small muted", style: { marginTop: "10px" } },
          "💡 İptal etmeden önce: yıllık planın bittiği güne kadar erişimin sürer. Bütçe daralddıysa iptal yerine ", h("b", {}, "aylığa geçmek"), " ilerlemeni kesintisiz korur — portalda 'Update plan' ile yapılır.")) : null,

      !active ? h("div", { class: "card" },
        h("h3", {}, "Plan seç"),
        h("p", { class: "small muted" }, "Şu an ücretsiz plandasın (Blok 1)."),
        h("button", { class: "btn btn-primary btn-big", onclick: () => UI.navigate("/paywall") }, "Planları Gör")) : null,

      h("div", { class: "card" },
        h("h3", {}, "Satın alımı geri yükle"),
        h("p", { class: "small muted" }, "Telefon değiştirdiysen veya erişim kaybolduysa, satın alırken kullandığın e-postayla geri yükle."),
        h("button", { class: "btn btn-outline", onclick: () => PaywallView.restoreFlow() }, "📥 Geri Yükle")),

      h("p", { class: "small muted center" },
        h("a", { href: "legal/terms.html", target: "_blank" }, "Kullanım Şartları"), " · ",
        h("a", { href: "legal/privacy.html", target: "_blank" }, "Gizlilik"), " · ",
        h("a", { href: "legal/refund.html", target: "_blank" }, "İade Politikası"),
        h("br"), "Ardaluna Holding LLC")
    ));
  },

  async portal() {
    try {
      UI.toast("Portal açılıyor...");
      await Payments.openPortal();
    } catch (e) {
      UI.toast("⚠️ " + e.message);
    }
  }
};
