/* =========================================================================
 * views/home.js — Ana sayfa: "7 kutu, sıradakini aç" yol haritası
 * Kullanıcı SRS mekaniğini görmez; sadece blok haritasını, bugünkü tekrar
 * sayısını ve tek bir önerilen adımı görür (bilişsel yük minimum).
 * ========================================================================= */
"use strict";

const HomeView = {
  async render(root) {
    const { h } = UI;
    const stats = await App.planStats();
    const streak = await App.streak();
    const states = await Blocks.getAllStates();
    const cards = await App.cards();
    const recs = await Advisor.recommendations();
    const hasFull = (typeof Entitlements !== "undefined") ? Entitlements.has("full_blocks") : true;

    const STATUS_META = {
      locked:      { label: "Kilitli",  cls: "bstat-locked" },
      learning:    { label: "Çalışılıyor", cls: "bstat-learning" },
      test_passed: { label: "Mühür bekliyor", cls: "bstat-passed" },
      sealed:      { label: "Mühürlü ✓", cls: "bstat-sealed" }
    };

    const blockRows = BLOCKS.map(b => {
      const st = states.get(b.id);
      const m = Blocks.masteryOf(b, cards);
      const meta = STATUS_META[st.status];
      const paywalled = b.id > 1 && !hasFull;
      const isLocked = st.status === "locked" || paywalled;

      return h("button", {
        class: `block-row ${isLocked ? "block-locked" : ""} ${st.status === "sealed" ? "block-sealed" : ""}`,
        onclick: () => {
          if (paywalled) { UI.navigate("/paywall"); return; }
          if (st.status === "locked") { UI.toast("Önce önceki bloğu mühürle 🔏"); return; }
          App.selectedBlock = b.id;
          UI.navigate("/block");
        }
      },
        h("div", { class: "block-icon" }, paywalled ? "🔒" : (st.status === "locked" ? "🔒" : b.icon)),
        h("div", { class: "block-main" },
          h("div", { class: "block-title" }, `${b.id}. ${b.name}`,
            h("span", { class: `block-status ${meta.cls}` }, paywalled ? "Premium" : meta.label)),
          h("div", { class: "block-bar" },
            h("div", { class: "block-bar-fill", style: { width: `${(m.mastered / m.total) * 100}%` } })),
          h("div", { class: "block-sub muted" }, `${b.ids.length} soru · ${m.mastered} ustalaşıldı`)),
        h("div", { class: "block-chev" }, "›"));
    });

    root.appendChild(h("div", { class: "page" },
      h("div", { class: "hero" },
        h("h1", {}, "🇺🇸 US Citizenship"),
        h("p", { class: "sub" }, "2025 sınavı · 20 soruda 12 doğru = geçer · test sözlü ve İngilizce")),

      h("div", { class: "card stat-row" },
        h("div", { class: "stat" },
          h("div", { class: "stat-num accent" }, String(stats.due)),
          h("div", { class: "stat-label" }, "Bugün tekrar")),
        h("div", { class: "stat" },
          h("div", { class: "stat-num" }, `${stats.masteredTotal}/${stats.total}`),
          h("div", { class: "stat-label" }, "Ustalaşılan")),
        h("div", { class: "stat" },
          h("div", { class: "stat-num" }, streak > 0 ? `🔥 ${streak}` : "0"),
          h("div", { class: "stat-label" }, "Gün serisi"))),

      recs.length ? h("div", { class: "rec-strip" },
        recs.map(r => h("button", {
          class: "rec-chip",
          onclick: () => {
            if (r.action.blockId) App.selectedBlock = r.action.blockId;
            if (r.action.mode) App.testMode = r.action.mode;
            UI.navigate(r.action.route);
          }
        }, h("span", { class: "rec-icon" }, r.icon),
           h("span", {}, r.text),
           h("span", { class: "rec-tag" }, "Önerilen")))) : null,

      h("button", { class: "btn btn-primary btn-big", onclick: () => UI.navigate("/study") },
        stats.due > 0 ? `▶ Çalış (${stats.due} tekrar + yeni)` : "▶ Çalış"),

      h("h3", { class: "section-title" }, "Yol Haritası — 7 Blok"),
      h("div", { class: "block-map" }, blockRows),

      h("div", { class: "row-btns" },
        h("button", { class: "btn btn-outline", onclick: () => UI.navigate("/exam") }, "🎓 Deneme Sınavı"),
        h("button", {
          class: "btn btn-outline",
          onclick: async () => {
            const pool = await Blocks.sealedQuestionIds();
            if (!pool.length) { UI.toast("Önce en az bir bloğu mühürle"); return; }
            App.testMode = "mixed"; UI.navigate("/blocktest");
          }
        }, "🔀 Karma Tekrar")),

      (typeof Entitlements !== "undefined" && Entitlements.has("weakness_drill"))
        ? h("button", { class: "btn btn-outline", onclick: () => { App.testMode = "drill"; UI.navigate("/blocktest"); } },
            "🎯 Zayıflık Drili (en zayıf 10 sorun)")
        : null
    ));
  }
};
