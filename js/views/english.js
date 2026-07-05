/* =========================================================================
 * views/english.js — İngilizce Testi: okuma/yazma kelimeleri + dikte pratiği
 * ========================================================================= */
"use strict";

const EnglishView = {
  mode: "menu",

  async render(root) {
    const { h } = UI;
    this.root = root;
    this.mode = "menu";

    root.appendChild(h("div", { class: "page" },
      h("h1", {}, "🇬🇧 İngilizce Testi"),
      h("p", { class: "muted" }, "Gerçek sınavda: 1 cümle okursun + 1 cümle yazarsın (her biri için 3 hak, 1 doğru yeter)."),

      h("button", { class: "btn btn-primary btn-big", onclick: () => this.dictation() }, "✍️ Dikte Pratiği (Yazma)"),
      h("button", { class: "btn btn-outline btn-big", onclick: () => this.reading() }, "📖 Sesli Okuma Pratiği"),

      h("div", { class: "card" },
        h("h3", {}, "📚 Okuma kelime listesi (resmi)"),
        h("p", { class: "muted small" }, "Okuma testindeki cümleler yalnızca bu kelimelerden oluşur:"),
        READING_VOCAB.map(g => h("div", { class: "vocab-group" },
          h("b", {}, g.group), h("div", { class: "vocab-words" }, g.words.join(" · "))))),

      h("div", { class: "card" },
        h("h3", {}, "✏️ Yazma kelime listesi (resmi)"),
        h("p", { class: "muted small" }, "Yazma testindeki cümleler yalnızca bu kelimelerden oluşur:"),
        WRITING_VOCAB.map(g => h("div", { class: "vocab-group" },
          h("b", {}, g.group), h("div", { class: "vocab-words" }, g.words.join(" · ")))))
    ));
  },

  /* ---------- Dikte: TTS okur, kullanıcı yazar ---------- */
  dictation() {
    const { h } = UI;
    const root = this.root;
    const pool = [...ENGLISH_SENTENCES].sort(() => Math.random() - 0.5).slice(0, 10);
    let idx = 0, correct = 0;

    const renderOne = () => {
      root.innerHTML = "";
      Speech.stopSpeaking();
      if (idx >= pool.length) {
        root.appendChild(h("div", { class: "page center-page" },
          h("div", { class: "big-emoji" }, correct >= 7 ? "🎉" : "💪"),
          h("h2", {}, `${correct} / ${pool.length} doğru`),
          h("p", { class: "muted" }, "Gerçek sınavda 3 haktan 1 doğru yeter — sen 10'da " + correct + " yaptın."),
          h("button", { class: "btn btn-primary btn-big", onclick: () => this.dictation() }, "🔄 Tekrar"),
          h("button", { class: "btn btn-ghost", onclick: () => this.render(root) }, "← Geri")));
        DB.markToday();
        return;
      }
      const s = pool[idx];
      const input = h("textarea", { class: "dictation-input", rows: 2, placeholder: "Duyduğun cümleyi buraya yaz...", lang: "en", autocapitalize: "sentences" });
      const feedback = h("div", { id: "dict-feedback" });

      const check = () => {
        const res = Speech.compareDictation(s.en, input.value);
        const pass = res.ratio >= 0.8 && Math.abs(res.extra) <= 1;
        if (pass) correct++;
        feedback.innerHTML = "";
        feedback.appendChild(h("div", { class: `card ${pass ? "ok-bg" : "fail-bg2"}` },
          h("b", {}, pass ? "✅ Doğru!" : "❌ Tam değil"),
          h("div", { class: "dict-words" },
            res.words.map(w => h("span", { class: w.ok ? "w-ok" : "w-bad" }, w.word + " "))),
          h("div", { class: "small muted" }, "Doğrusu: " + s.en),
          h("div", { class: "small muted" }, "🇹🇷 " + s.tr),
          h("button", { class: "btn btn-primary", style: { marginTop: "10px" }, onclick: () => { idx++; renderOne(); } }, "Sonraki →")));
        input.disabled = true;
      };

      root.appendChild(h("div", { class: "page" },
        h("div", { class: "study-top" },
          h("button", { class: "btn btn-ghost small-btn", onclick: () => this.render(root) }, "← Çık"),
          h("span", { class: "muted" }, `${idx + 1} / ${pool.length}`),
          h("span", { style: { width: "52px" } })),
        h("div", { class: "card center" },
          h("p", { class: "muted" }, "Memur cümleyi okuyor — dinle ve yaz:"),
          h("button", { class: "btn btn-outline btn-big", onclick: () => Speech.speak(s.en, { rate: App.rateFor("en") }) }, "Cümleyi Dinle"),
          h("p", { class: "small muted" }, "İstediğin kadar tekrar dinleyebilirsin")),
        input,
        h("button", { class: "btn btn-primary btn-big", onclick: check }, "Kontrol Et"),
        feedback
      ));

      if (Speech.ttsAvailable) setTimeout(() => Speech.speak(s.en, { rate: App.rateFor("en") }), 400);
    };
    renderOne();
  },

  /* ---------- Sesli okuma: cümleyi göster, kullanıcı okur ---------- */
  reading() {
    const { h } = UI;
    const root = this.root;
    const pool = [...ENGLISH_SENTENCES].sort(() => Math.random() - 0.5).slice(0, 10);
    let idx = 0, correct = 0;

    const renderOne = () => {
      root.innerHTML = "";
      Speech.stopSpeaking();
      Speech.stopListening();
      if (idx >= pool.length) {
        root.appendChild(h("div", { class: "page center-page" },
          h("div", { class: "big-emoji" }, "🏁"),
          h("h2", {}, `Okuma turu bitti (${correct}/${pool.length})`),
          h("button", { class: "btn btn-primary btn-big", onclick: () => this.reading() }, "🔄 Tekrar"),
          h("button", { class: "btn btn-ghost", onclick: () => this.render(root) }, "← Geri")));
        DB.markToday();
        return;
      }
      const s = pool[idx];
      const status = h("div", { class: "speech-status", id: "speech-status" });

      const next = (ok) => { if (ok) correct++; idx++; renderOne(); };

      root.appendChild(h("div", { class: "page" },
        h("div", { class: "study-top" },
          h("button", { class: "btn btn-ghost small-btn", onclick: () => this.render(root) }, "← Çık"),
          h("span", { class: "muted" }, `${idx + 1} / ${pool.length}`),
          h("span", { style: { width: "52px" } })),
        h("div", { class: "card" },
          h("p", { class: "muted small" }, "Bu cümleyi YÜKSEK SESLE oku:"),
          h("div", { class: "read-sentence", lang: "en" }, s.en),
          h("div", { class: "small muted" }, "🇹🇷 " + s.tr),
          h("div", { class: "step-btns" },
            Speech.ttsAvailable ? h("button", { class: "btn btn-outline", onclick: () => Speech.speak(s.en, { rate: App.rateFor("en") }) }, "Doğru Telaffuzu Dinle") : null,
            Speech.sttAvailable ? h("button", {
              class: "btn btn-primary", id: "mic-btn",
              onclick: () => {
                status.textContent = "🎙️ Dinliyorum — cümleyi oku";
                document.getElementById("mic-btn").classList.add("listening");
                Speech.listen({
                  onResult: (alts) => {
                    const res = Speech.compareDictation(s.en, alts[0]);
                    if (res.ratio >= 0.7) { status.innerHTML = "✅ Güzel okudun!"; status.className = "speech-status ok"; }
                    else { status.innerHTML = `Duyulan: “${UI.esc(alts[0])}” — tekrar dene veya doğru telaffuzu dinle`; status.className = "speech-status"; }
                  },
                  onError: () => { status.textContent = "Ses tanıma çalışmadı — kendin değerlendir"; },
                  onEnd: () => { const m = document.getElementById("mic-btn"); if (m) m.classList.remove("listening"); }
                });
              }
            }, "Okuyuşumu Kontrol Et") : null),
          status),
        h("div", { class: "exam-btns" },
          h("button", { class: "btn grade-btn grade-good btn-big", onclick: () => next(true) }, "✓ Rahat okudum"),
          h("button", { class: "btn grade-btn grade-hard btn-big", onclick: () => next(false) }, "~ Zorlandım"))
      ));
    };
    renderOne();
  }
};
