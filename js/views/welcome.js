/* =========================================================================
 * views/welcome.js — Onboarding: dil modu seçimi + 3 adımda nasıl çalışır
 * İlkeler: tek karar, büyük dokunma alanları, sıfır bilişsel yük.
 * ========================================================================= */
"use strict";

const WelcomeView = {
  async render(root) {
    const { h } = UI;

    const pick = async (mode) => {
      App.settings.langMode = mode;
      await App.saveSettings();
      UI.toast(mode === "bilingual" ? "Türkçe destek açık — hazırsın!" : "Salt İngilizce mod — hazırsın!");
      UI.navigate("/home");
    };

    root.appendChild(h("div", { class: "page" },
      h("div", { class: "hero center", style: { marginTop: "24px" } },
        h("div", { class: "big-emoji" }, "🇺🇸"),
        h("h1", {}, "US Citizenship"),
        h("p", { class: "sub" }, "2025 vatandaşlık sınavına bilimsel yöntemle hazırlan")),

      h("div", { class: "card" },
        h("h3", {}, "Nasıl çalışır?"),
        h("ul", { class: "rules" },
          h("li", {}, h("b", {}, "7 blok:"), " 128 resmi soru konularına göre 7 kutuda. Sıradakini açmak için öncekini bitir."),
          h("li", {}, h("b", {}, "İngilizce mührü:"), " Gerçek sınav İngilizce ve sözlü. Her blok, salt İngilizce testle \"mühürlenince\" tamamlanır."),
          h("li", {}, h("b", {}, "Renkli ipuçları:"), " Her soruda o soruyu ele veren anahtar öbek renklidir — onu duyunca cevap aklına gelir."))),

      h("div", { class: "card" },
        h("h3", {}, "İngilizce seviyeni seç"),
        h("p", { class: "muted small" }, "Sorular her zaman İngilizce (sınav dili). Türkçe destek, anlamı öğrenmeni sağlar; sen ilerledikçe İngilizce mühür testleriyle desteksiz hale gelirsin."),
        h("button", { class: "btn btn-primary btn-big", onclick: () => pick("bilingual") },
          "🇹🇷 + 🇺🇸 Türkçe destekle öğren", h("div", { class: "btn-sub" }, "Önerilen — soruyu önce Türkçe, sonra İngilizce görürsün")),
        h("button", { class: "btn btn-outline btn-big", onclick: () => pick("en") },
          "🇺🇸 Yalnız İngilizce", h("div", { class: "btn-sub" }, "Yeterli İngilizcem var, doğrudan sınav dilinde çalışacağım"))),

      h("p", { class: "small muted center" }, "Bu seçimi Ayarlar'dan her zaman değiştirebilirsin.")
    ));
  }
};
