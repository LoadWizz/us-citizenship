/* =========================================================================
 * views/settings.js — Ayarlar: güncel yetkililer (TN kişiselleştirme),
 * çalışma tercihleri, API anahtarı, veri yönetimi, kendini-doğrulama
 * ========================================================================= */
"use strict";

const SettingsView = {
  async render(root) {
    const { h } = UI;
    const s = App.settings;

    const officialField = (key, label, placeholder) => {
      const input = h("input", {
        type: "text", class: "input", value: s.officials[key] || "", placeholder,
        onchange: async (e) => { s.officials[key] = e.target.value.trim(); await App.saveSettings(); UI.toast("Kaydedildi"); }
      });
      return h("label", { class: "field" }, h("span", { class: "field-label" }, label), input);
    };

    const numField = (key, label, min, max) => h("label", { class: "field" },
      h("span", { class: "field-label" }, label),
      h("input", {
        type: "number", class: "input", value: s[key], min, max,
        onchange: async (e) => { s[key] = Math.max(min, Math.min(max, +e.target.value || min)); await App.saveSettings(); UI.toast("Kaydedildi"); }
      }));

    const toggleField = (key, label, desc) => h("label", { class: "field toggle-field" },
      h("div", {},
        h("span", { class: "field-label" }, label),
        desc ? h("div", { class: "small muted" }, desc) : null),
      h("input", {
        type: "checkbox", class: "toggle", checked: !!s[key],
        onchange: async (e) => { s[key] = e.target.checked; await App.saveSettings(); UI.toast("Kaydedildi"); }
      }));

    const sc = App.selfCheck;

    /* Geliştirici bölümü: başlığa 7 kez dokununca görünür (yalnız test) */
    let titleTaps = 0;
    const devCard = h("div", { class: "card", id: "dev-card", style: { display: App._devVisible ? "" : "none" } },
      h("h3", {}, "🛠️ Geliştirici (yalnız test)"),
      h("label", { class: "field" },
        h("span", { class: "field-label" }, "Backend URL"),
        h("input", {
          type: "text", class: "input", value: s.backendUrl || PRICING.defaultBackendUrl,
          onchange: async (e) => { s.backendUrl = e.target.value.trim(); await App.saveSettings(); UI.toast("Backend güncellendi"); }
        })),
      h("div", { class: "row-btns" },
        h("button", { class: "btn btn-outline small-btn", onclick: async () => { await Entitlements.devUnlock("prep"); UI.toast("DEV: prep açık"); } }, "DEV: Prep"),
        h("button", { class: "btn btn-outline small-btn", onclick: async () => { await Entitlements.devUnlock("pro"); UI.toast("DEV: pro açık"); } }, "DEV: Pro"),
        h("button", { class: "btn btn-outline small-btn", onclick: async () => { await Entitlements.clear(); UI.toast("Entitlement temizlendi"); } }, "Temizle")),
      h("p", { class: "small muted" }, "Bu bölüm üretim kullanıcısına kapalıdır; başlığa 7 dokunuşla açılır ve yalnız test içindir."));

    root.appendChild(h("div", { class: "page" },
      h("h1", {
        onclick: () => {
          titleTaps++;
          if (titleTaps >= 7) { App._devVisible = true; devCard.style.display = ""; UI.toast("🛠️ Geliştirici modu görünür"); }
        }
      }, "⚙️ Ayarlar"),

      h("div", { class: "card" },
        h("h3", {}, "🏛️ Güncel Yetkililer"),
        UI.dynBadge(),
        h("p", { class: "small muted" }, "Bu isimler kalıcı gerçek DEĞİLDİR — seçim/atamayla değişir. Mülakat haftasında testupdates sayfasından doğrula ve burada güncelle. Cevaplar bu alanlardan beslenir."),
        officialField("president", "ABD Başkanı (S.38)", "örn. Donald Trump"),
        officialField("vicepresident", "Başkan Yardımcısı (S.39)", "örn. JD Vance"),
        officialField("speaker", "Meclis Başkanı / Speaker (S.30)", "örn. Mike Johnson"),
        officialField("chiefjustice", "Yüksek Mahkeme Başkanı (S.57)", "örn. John Roberts"),
        h("hr", { class: "sep" }),
        h("p", { class: "small" }, h("b", {}, "Tennessee / Chattanooga:")),
        officialField("governor", "Tennessee Valisi (S.61)", "örn. Bill Lee"),
        officialField("senator1", "TN Senatörü 1 (S.23)", "örn. Marsha Blackburn"),
        officialField("senator2", "TN Senatörü 2 (S.23)", "örn. Bill Hagerty"),
        officialField("representative", "TN-3 Temsilcisi — Chattanooga (S.29)", "örn. Chuck Fleischmann"),
        officialField("capital", "Eyalet Başkenti (S.62)", "Nashville")),

      h("div", { class: "card" },
        h("h3", {}, "📖 Çalışma Tercihleri"),
        h("label", { class: "field" },
          h("span", { class: "field-label" }, "Dil modu"),
          h("select", {
            class: "input",
            onchange: async (e) => {
              s.langMode = e.target.value;
              await App.saveSettings();
              UI.toast(s.langMode === "bilingual" ? "Türkçe destek açık" : "Salt İngilizce mod");
            }
          },
            h("option", { value: "bilingual", selected: s.langMode === "bilingual" }, "🇹🇷+🇺🇸 Türkçe destekli (soru önce Türkçe)"),
            h("option", { value: "en", selected: s.langMode === "en" }, "🇺🇸 Yalnız İngilizce")),
          h("div", { class: "small muted" }, "Deneme sınavları ve mühür testleri her zaman salt İngilizcedir — gerçek sınav öyle.")),
        numField("newPerDay", "Günlük yeni soru sayısı", 3, 40),
        toggleField("autoTTS", "Soruları otomatik sesli oku", "Memur simülasyonu — kart açılınca soru okunur"),
        h("label", { class: "field" },
          h("span", { class: "field-label" }, `Konuşma hızı: ${s.ttsRate.toFixed(2)}`),
          h("input", {
            type: "range", min: 0.6, max: 1.2, step: 0.02, value: s.ttsRate,
            oninput: (e) => { s.ttsRate = +e.target.value; e.target.previousSibling.textContent = `Konuşma hızı: ${s.ttsRate.toFixed(2)}`; },
            onchange: async () => { await App.saveSettings(); Speech.speak("What is the supreme law of the land?", { rate: s.ttsRate }); }
          })),
        toggleField("realisticExam", "Gerçekçi sınav modu", "12 doğruda veya 9 yanlışta sınavı erken bitir (gerçek mülakat gibi)"),
        h("label", { class: "field" },
          h("span", { class: "field-label" }, "Tema"),
          h("select", {
            class: "input",
            onchange: async (e) => { s.theme = e.target.value; await App.saveSettings(); }
          },
            h("option", { value: "auto", selected: s.theme === "auto" }, "Otomatik (sistem)"),
            h("option", { value: "light", selected: s.theme === "light" }, "Açık"),
            h("option", { value: "dark", selected: s.theme === "dark" }, "Koyu")))),

      h("div", { class: "card" },
        h("h3", {}, "🤖 Claude Koç (isteğe bağlı)"),
        h("p", { class: "small muted" }, "Anthropic API anahtarı eklersen her deneme sınavından sonra kişisel Türkçe koçluk alırsın. Anahtar yalnızca bu cihazda (IndexedDB) saklanır ve sadece api.anthropic.com'a gönderilir. Anahtarsız uygulama tamamen çevrimdışı çalışır."),
        h("label", { class: "field" },
          h("span", { class: "field-label" }, "API Anahtarı"),
          h("input", {
            type: "password", class: "input", value: s.apiKey, placeholder: "sk-ant-...",
            onchange: async (e) => { s.apiKey = e.target.value.trim(); await App.saveSettings(); UI.toast(s.apiKey ? "Anahtar kaydedildi" : "Anahtar silindi"); }
          })),
        h("label", { class: "field" },
          h("span", { class: "field-label" }, "Model"),
          h("input", {
            type: "text", class: "input", value: s.coachModel, placeholder: Coach.DEFAULT_MODEL,
            onchange: async (e) => { s.coachModel = e.target.value.trim() || Coach.DEFAULT_MODEL; await App.saveSettings(); UI.toast("Kaydedildi"); }
          }))),

      h("div", { class: "card" },
        h("h3", {}, "💾 Veri"),
        h("button", { class: "btn btn-outline", onclick: () => this.exportData() }, "⬇️ İlerlemeyi dışa aktar (JSON)"),
        h("button", { class: "btn btn-outline", onclick: () => this.importData() }, "⬆️ Yedekten geri yükle"),
        h("button", {
          class: "btn btn-danger",
          onclick: async () => {
            if (!confirm("TÜM ilerleme silinecek (ayarlar korunur). Emin misin?")) return;
            await DB.resetAll();
            App.invalidateCards();
            UI.toast("İlerleme sıfırlandı");
            UI.navigate("/home");
          }
        }, "🗑️ İlerlemeyi sıfırla")),

      h("div", { class: "card" },
        h("h3", {}, "🔍 Veri Doğrulama (kendini-test)"),
        h("p", { class: sc.allPass ? "ok" : "fail" },
          sc.allPass ? `✅ ${sc.passed}/${sc.total} kontrol geçti` : `❌ ${sc.passed}/${sc.total} kontrol geçti`),
        sc.results.map(r => h("div", { class: "small " + (r.pass ? "muted" : "fail") },
          `${r.pass ? "✓" : "✗"} ${r.name}${r.detail ? " — " + r.detail : ""}`)),
        h("p", { class: "small muted" }, `Yıldızlı 20 soru: ${STAR_IDS.join(", ")}`)),

      devCard,

      h("div", { class: "card small muted" },
        h("p", {}, "Kaynak: USCIS M-1778 (09/25) — 128 Civics Questions and Answers, 2025 version."),
        h("p", {}, "Bu uygulama resmi bir USCIS ürünü değildir; çalışma yardımcısıdır."),
        h("p", {}, "© Ardaluna Holding LLC · ",
          h("a", { href: "legal/terms.html", target: "_blank" }, "Şartlar"), " · ",
          h("a", { href: "legal/privacy.html", target: "_blank" }, "Gizlilik"), " · ",
          h("a", { href: "legal/refund.html", target: "_blank" }, "İade")))
    ));
  },

  async exportData() {
    const data = await DB.exportAll();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `us-citizenship-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
    UI.toast("Yedek indirildi");
  },

  importData() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "application/json";
    input.onchange = async () => {
      try {
        const text = await input.files[0].text();
        await DB.importAll(JSON.parse(text));
        App.invalidateCards();
        await App.loadSettings();
        UI.toast("Yedek geri yüklendi ✅");
        UI.navigate("/home");
      } catch (e) {
        UI.toast("Geri yükleme başarısız: " + e.message);
      }
    };
    input.click();
  }
};
