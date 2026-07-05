/* =========================================================================
 * views/paywall.js — Dönüşüm ekranı (satış kalbi)
 * Davranışsal tasarım gerekçeleri pricing.js başlığında belgelidir:
 * goal-gradient ilerleme başlığı, N-400 harç çıpası, center-stage "EN
 * POPÜLER", yıllık varsayılan + aylık daima görünür, ömür boyu tavan çıpası.
 * ========================================================================= */
"use strict";

const PaywallView = {
  interval: "yearly",

  async render(root) {
    const { h } = UI;
    this.root = root;

    /* goal-gradient: Çekirdek ilerlemesi */
    const cards = await App.cards();
    const b1 = BLOCKS[0];
    const b1m = Blocks.masteryOf(b1, cards);
    const b1st = await Blocks.getState(1);
    const progressLine = b1st.status === "sealed"
      ? "★ En Önemli 20'yi TAMAMLADIN — en zor kısmı bitirdin."
      : `★ En Önemli 20'nin ${b1m.seen} tanesini gördün.`;

    root.appendChild(h("div", { class: "page" },
      h("div", { class: "study-top" },
        h("button", { class: "btn btn-ghost small-btn", onclick: () => UI.navigate("/home") }, "← Geri"),
        h("span", {}), h("span", { style: { width: "52px" } })),

      h("div", { class: "pay-hero" },
        h("div", { class: "big-emoji" }, "🗽"),
        h("h1", {}, "Yolun kalanını aç"),
        h("p", { class: "pay-progress" }, progressLine),
        h("div", { class: "progressbar" },
          h("div", { class: "progressbar-fill", style: { width: `${Math.max(8, (b1m.seen / 20) * 100)}%` } })),
        h("p", { class: "muted small" },
          "Kalan 108 soru + 6 blok + İngilizce mühürleri seni bekliyor. N-400 başvurusuna ",
          h("b", {}, "$710+"), " ödedin — mülakatı ilk seferde geçmek bu yatırımın küçük bir sigortası.")),

      /* dönem seçici */
      h("div", { class: "interval-toggle" },
        h("button", {
          class: "int-btn" + (this.interval === "yearly" ? " int-active" : ""),
          onclick: () => { this.interval = "yearly"; this.rerender(); }
        }, "Yıllık ", h("span", { class: "save-tag" }, `%${PRICING.yearlySavingsPct("pro")}'e varan tasarruf`)),
        h("button", {
          class: "int-btn" + (this.interval === "monthly" ? " int-active" : ""),
          onclick: () => { this.interval = "monthly"; this.rerender(); }
        }, "Aylık")),

      h("div", { id: "plan-cards" }, this.planCards()),

      h("div", { class: "trust-row small muted" },
        "🔒 Stripe ile güvenli ödeme · İstediğin an iptal · 7 gün koşulsuz iade"),

      h("button", { class: "btn btn-ghost", onclick: () => this.restoreFlow() }, "Zaten satın aldın mı? Geri yükle"),
      h("p", { class: "small muted center" },
        h("a", { href: "legal/terms.html", target: "_blank" }, "Kullanım Şartları"), " · ",
        h("a", { href: "legal/privacy.html", target: "_blank" }, "Gizlilik"), " · ",
        h("a", { href: "legal/refund.html", target: "_blank" }, "İade Politikası"),
        h("br"), "Ardaluna Holding LLC")
    ));
  },

  rerender() {
    const holder = document.getElementById("plan-cards");
    if (holder) { holder.innerHTML = ""; this.planCards().forEach(c => holder.appendChild(c)); }
    document.querySelectorAll(".int-btn").forEach((b, i) =>
      b.classList.toggle("int-active", (i === 0) === (this.interval === "yearly")));
  },

  planCards() {
    const { h } = UI;
    const yearly = this.interval === "yearly";

    const card = (planId, opts = {}) => {
      const p = PRICING.plans[planId];
      const isLifetime = planId === "lifetime";
      const price = isLifetime ? p.oneTime : (yearly ? p.yearly : p.monthly);
      const per = isLifetime ? "tek ödeme" : (yearly ? "/yıl" : "/ay");
      const subline = isLifetime
        ? "abonelik yok, süresiz"
        : yearly
          ? `ayda ${PRICING.fmt(PRICING.perMonthOfYearly(planId))}'e denk gelir`
          : `yıllıkta ${PRICING.fmt(p.yearly)} — %${PRICING.yearlySavingsPct(planId)} daha ucuz`;

      return h("div", { class: "plan-card" + (p.popular ? " plan-popular" : "") },
        p.popular ? h("div", { class: "pop-badge" }, "EN POPÜLER") : null,
        h("div", { class: "plan-name" }, p.name),
        h("div", { class: "plan-tagline muted small" }, p.tagline),
        h("div", { class: "plan-price" }, PRICING.fmt(price),
          h("span", { class: "plan-per" }, " " + per)),
        h("div", { class: "plan-subline small muted" }, subline),
        h("ul", { class: "plan-feats" }, p.features.map(f => h("li", {}, f))),
        h("button", {
          class: "btn btn-big " + (p.popular ? "btn-primary" : "btn-outline"),
          onclick: () => this.buy(planId, isLifetime ? "onetime" : (yearly ? "yearly" : "monthly"))
        }, isLifetime ? "Tek Seferde Al" : "Başla"));
    };

    /* sıra: Hazırlık → Vatandaşlık (popüler, ortada) → Ömür Boyu (çıpa) */
    return [card("prep"), card("pro"), card("lifetime")];
  },

  async buy(planId, interval) {
    try {
      UI.toast("Stripe'a yönlendiriliyorsun...");
      await Payments.checkout(planId, interval);
    } catch (e) {
      UI.toast("⚠️ " + e.message);
      const dev = document.getElementById("pay-error");
      if (!dev) {
        const el = UI.h("div", { id: "pay-error", class: "card small", style: { borderColor: "var(--fail)" } },
          UI.h("b", {}, "Ödeme sunucusuna ulaşılamadı. "),
          "İnternet bağlantını kontrol et ve tekrar dene. Sorun sürerse Ayarlar > Faturalama'dan 'Geri Yükle'yi deneyebilirsin.");
        this.root.querySelector(".page").insertBefore(el, document.getElementById("plan-cards"));
      }
    }
  },

  async restoreFlow() {
    const email = prompt("Satın alırken kullandığın e-posta adresi:");
    if (!email) return;
    try {
      UI.toast("Abonelik aranıyor...");
      await Entitlements.restore(email.trim());
      UI.toast("🎉 Aboneliğin geri yüklendi!");
      UI.navigate("/home");
    } catch (e) {
      UI.toast("⚠️ " + e.message);
    }
  }
};
