/* =========================================================================
 * views/study.js — Çalışma: ÖĞRET + HATIRLA modları
 *
 * İLKE: Çalış bölümü TEST ETMEZ, ÖĞRETİR. Hiç görülmemiş soru önce
 * öğretilir; test yalnız daha önce öğretilmiş kartlara yapılır.
 *
 * ÖĞRET modu (kart hiç görülmemişse):
 *   1) Türkçe soru (görsel + sesli) — anlam önce
 *   2) İngilizce soru — ezberlenecek kelimeler RENKLİ + "bu kelimelere
 *      dikkat" tek satırı (göstererek anlatma)
 *   3) Cevap DOĞRUDAN verilir: kocaman renkli İngilizce cevap + altında
 *      Türkçesi. Sesli: Türkçe cevap → İngilizce cevap.
 *   4) Tek buton: "Devam". Kart aynı oturumun sonuna eklenir → birazdan
 *      HATIRLA modunda geri gelir (öğren → dakikalar içinde test).
 *
 * HATIRLA modu (kart daha önce görülmüşse): klasik aktif hatırlama —
 * soru → (sesli/zihinsel cevap) → cevabı göster → kendini notla.
 *
 * Ekranda İÇ JARGON YOK: soru numarası, kategori, yıldız rozetleri yok.
 * ========================================================================= */
"use strict";

const StudyView = {
  queue: [], idx: 0, targetBlock: null, sessionDone: 0, freeMode: false,

  async render(root) {
    const { h } = UI;
    this.root = root;
    this.freeMode = false;
    const block = this.targetBlock ? Blocks.byId(this.targetBlock) : await Blocks.current();
    this.queue = await App.buildStudyQueue({ blockId: block ? block.id : null });
    this.idx = 0;
    this.sessionDone = 0;

    if (!this.queue.length) {
      root.appendChild(h("div", { class: "page center-page" },
        h("div", { class: "big-emoji" }, "🎉"),
        h("h2", {}, "Bugünlük bitti!"),
        h("p", { class: "muted" }, "Tekrar edilecek kart yok. Blok sınavına girebilir veya serbest tekrar yapabilirsin."),
        block ? h("button", { class: "btn btn-primary btn-big", onclick: () => { App.selectedBlock = block.id; UI.navigate("/block"); } }, `${block.icon} ${block.name} bloğuna git`) : null,
        h("button", { class: "btn btn-outline btn-big", onclick: () => this.freeSession() }, "🔁 Serbest Tekrar (20 kart)"),
        h("button", { class: "btn btn-ghost", onclick: () => UI.navigate("/home") }, "← Ana sayfa")
      ));
      return;
    }
    this.renderCard();
  },

  async freeSession() {
    const states = await Blocks.getAllStates();
    const unlocked = new Set(BLOCKS.filter(b => states.get(b.id).status !== "locked").flatMap(b => b.ids));
    const pool = QUESTIONS.filter(q => unlocked.has(q.id));
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    this.queue = pool.slice(0, 20);
    this.idx = 0;
    this.sessionDone = 0;
    this.freeMode = true;
    this.renderCard();
  },

  async renderCard() {
    const { h } = UI;
    const root = this.root;
    root.innerHTML = "";
    Speech.stopSpeaking();
    Speech.stopListening();

    if (this.idx >= this.queue.length) {
      const doneBlock = this.targetBlock ? Blocks.byId(this.targetBlock) : null;
      this.targetBlock = null;
      root.appendChild(h("div", { class: "page center-page" },
        h("div", { class: "big-emoji" }, "🏁"),
        h("h2", {}, "Oturum tamamlandı!"),
        h("p", { class: "muted" }, `${this.sessionDone} kart çalıştın.`),
        doneBlock ? h("button", { class: "btn btn-primary btn-big", onclick: () => { App.selectedBlock = doneBlock.id; UI.navigate("/block"); } }, "Blok sınavına hazır mısın? →") : null,
        h("button", { class: "btn btn-outline btn-big", onclick: () => UI.navigate("/home") }, "Ana sayfa"),
        h("button", { class: "btn btn-ghost", onclick: () => this.render(root) }, "Devam et")
      ));
      return;
    }

    const q = this.queue[this.idx];
    const card = (await App.cards()).get(q.id);
    const isNew = !card || card.seen === 0;

    if (isNew) this.renderTeach(q);
    else this.renderRecall(q);
  },

  /* ---------- ortak üst çubuk: yalnız ilerleme, jargon yok ---------- */
  topBar() {
    const { h } = UI;
    return [
      h("div", { class: "study-top" },
        h("button", { class: "btn btn-ghost small-btn", onclick: () => { this.targetBlock = null; UI.navigate("/home"); } }, "← Çık"),
        h("span", { class: "muted" }, `${this.idx + 1} / ${this.queue.length}`),
        h("span", { style: { width: "52px" } })),
      h("div", { class: "progressbar" }, h("div", { class: "progressbar-fill", style: { width: `${(this.idx / this.queue.length) * 100}%` } }))
    ];
  },

  /* Parantezleri metinden arındır (sesli okuma için) */
  cleanForSpeech(s) { return s.replace(/[()]/g, "").replace(/\s+/g, " ").trim(); },

  /* ================= ÖĞRET modu ================= */
  renderTeach(q) {
    const { h } = UI;
    const root = this.root;
    const bilingual = App.isBilingual();
    const nat = Lang.native(q, "tr");
    const cue = CUES[q.id];
    const pairs = Lang.answerPairs(q, App.settings.officials, "tr");
    const heroes = pairs.filter(p => p.best);
    const heroList = heroes.length ? heroes : pairs;

    root.appendChild(h("div", { class: "page" },
      ...this.topBar(),
      h("div", { class: "teach-label" }, "🆕 Yeni soru — önce öğren"),

      h("div", { class: "card qcard" },
        q.dyn ? UI.dynBadge() : null,
        (bilingual && nat) ? h("div", { class: "qtext qtext-native", lang: "tr", html: Lang.qHTMLNative(q, "tr") }) : null,
        h("div", { class: `qtext ${bilingual && nat ? "qtext-en-second" : ""}`, lang: "en", html: Lang.qHTMLEn(q) }),
        h("div", { class: "attention-line" },
          "👀 Bu kelimelere dikkat: ",
          h("span", { class: `cue cue-${q.cat}` }, cue),
          " — bunu duyduğunda cevap aklına gelsin."),
        h("div", { class: "qcontrols" },
          Speech.ttsAvailable ? h("button", { class: "btn btn-circle", title: "Tekrar dinle", onclick: () => this.speakTeach(q, heroList) }, "🔊") : null)),

      UI.answerCard(q, { natLang: "tr" }),

      h("button", {
        class: "btn btn-primary btn-big",
        onclick: async () => {
          /* Öğretilen kart sessizce zamanlanır (SRS: İyi) ve oturum sonunda
           * HATIRLA modunda geri gelir — öğren → dakikalar içinde test */
          await App.gradeCard(q.id, 2, { enMode: !App.isBilingual() });
          this.sessionDone++;
          this.queue.push(q);
          this.idx++;
          this.renderCard();
        }
      }, "Devam →")
    ));

    if (App.settings.autoTTS && Speech.ttsAvailable) this.speakTeach(q, heroList);
  },

  /* Öğretim ses akışı: TR soru → EN soru → TR cevap → EN cevap */
  speakTeach(q, heroList) {
    const parts = [];
    const nat = App.isBilingual() ? Lang.native(q, "tr") : null;
    if (nat) parts.push({ text: nat.q, lang: "tr" });
    parts.push({ text: q.q, lang: "en" });
    const first = heroList[0];
    if (first) {
      const trAns = first.nat || first.en; // TR karşılık yoksa (isimler) aynen
      if (App.isBilingual()) parts.push({ text: "Cevap: " + this.cleanForSpeech(trAns), lang: "tr" });
      parts.push({ text: this.cleanForSpeech(first.en), lang: "en" });
    }
    Speech.speakSequence(parts, { rate: App.settings.ttsRate });
  },

  /* ================= HATIRLA modu ================= */
  renderRecall(q) {
    const { h } = UI;
    const root = this.root;
    const bilingual = App.isBilingual();
    const answers = effectiveAnswers(q, App.settings.officials);
    this.lastSpeechMatch = undefined;
    const natHTML = bilingual ? Lang.qHTMLNative(q, "tr") : null;

    const speechStatus = h("div", { class: "speech-status", id: "speech-status" });
    const answerArea = h("div", { id: "answer-area" },
      h("button", { class: "btn btn-primary btn-big", onclick: () => this.reveal(q, answers) }, "Cevabı Göster"));

    root.appendChild(h("div", { class: "page" },
      ...this.topBar(),
      h("div", { class: "card qcard" },
        q.dyn ? UI.dynBadge() : null,
        natHTML ? h("div", { class: "qtext qtext-native", lang: "tr", html: natHTML }) : null,
        h("div", { class: `qtext ${natHTML ? "qtext-en-second" : ""}`, lang: "en", html: Lang.qHTMLEn(q) }),
        h("div", { class: "qcontrols" },
          Speech.ttsAvailable ? h("button", { class: "btn btn-circle", title: "Soruyu dinle", onclick: () => this.speakQuestion(q) }, "🔊") : null,
          Speech.micUsable() ? h("button", { class: "btn btn-circle", id: "mic-btn", title: "İngilizce sesli cevapla", onclick: () => this.listenAnswer(q, answers) }, "🎤") : null),
        speechStatus),
      answerArea
    ));
    UI.tapGuard(answerArea);

    if (App.settings.autoTTS && Speech.ttsAvailable) this.speakQuestion(q);
  },

  speakQuestion(q) {
    const parts = [];
    if (App.isBilingual()) {
      const n = Lang.native(q, "tr");
      if (n) parts.push({ text: n.q, lang: "tr" });
    }
    parts.push({ text: q.q, lang: "en" });
    Speech.speakSequence(parts, { rate: App.settings.ttsRate });
  },

  listenAnswer(q, answers) {
    const status = document.getElementById("speech-status");
    const mic = document.getElementById("mic-btn");
    status.textContent = "🎙️ Dinliyorum... İngilizce cevap ver";
    mic.classList.add("listening");
    Speech.listen({
      onResult: (alts) => {
        const echo = Speech.compareDictation(q.q, alts[0]);
        if (echo.ratio > 0.55) {
          status.innerHTML = "🔁 Sorunun sesi algılandı — soru bittikten sonra 🎤'a basıp CEVABI söyle";
          status.className = "speech-status";
          return;
        }
        const res = Speech.matchAnswer(alts, answers);
        this.lastSpeechMatch = res.match;
        if (res.match) {
          status.innerHTML = `✅ <b>Doğru görünüyor!</b> Duyulan: “${UI.esc(alts[0])}”`;
          status.className = "speech-status ok";
        } else {
          status.innerHTML = `🤔 Eşleşmedi. Duyulan: “${UI.esc(alts[0])}” — cevabı görüp kendin karar ver`;
          status.className = "speech-status";
        }
      },
      onError: (err) => {
        status.textContent = Speech.sttErrorMessage(err);
        mic.classList.remove("listening");
        if (!Speech.micUsable()) mic.style.display = "none";
      },
      onEnd: () => { const m = document.getElementById("mic-btn"); if (m) m.classList.remove("listening"); }
    });
  },

  async reveal(q, answers) {
    const { h } = UI;
    const area = document.getElementById("answer-area");
    area.innerHTML = "";
    UI.tapGuard(area);

    /* Not butonlarında GERÇEK süreler (bu kartın geçmişine göre) */
    const cardState = (await App.cards()).get(q.id) || SRS.newCard(q.id);
    const ivs = SRS.previewIntervals(cardState);
    const grades = [
      { g: 0, label: "Tekrar", sub: SRS.fmtInterval(ivs[0]), cls: "grade-again" },
      { g: 1, label: "Zor", sub: SRS.fmtInterval(ivs[1]), cls: "grade-hard" },
      { g: 2, label: "İyi", sub: SRS.fmtInterval(ivs[2]), cls: "grade-good" },
      { g: 3, label: "Kolay", sub: SRS.fmtInterval(ivs[3]), cls: "grade-easy" }
    ];

    area.appendChild(UI.answerCard(q, { natLang: App.nativeLang() }));

    if (this.lastSpeechMatch === true) {
      area.appendChild(h("div", { class: "speech-status ok" }, "🎤 Sesli cevabın eşleşmişti — 'İyi' veya 'Kolay' seç"));
    }

    /* İlk kullanımda not butonlarını TEK SEFER anlat */
    if (!App.settings.gradeHelpSeen) {
      const helpCard = h("div", { class: "card grade-help" },
        h("b", {}, "Bu 4 düğme ne işe yarar?"),
        h("p", { class: "small", style: { margin: "6px 0" } },
          "Ne kadar iyi bildiğini SEN söylersin; uygulama kartı ona göre tam zamanında tekrar sorar. Düğmenin altındaki süre = kartın ne zaman geri geleceği."),
        h("ul", { class: "small", style: { margin: "0 0 8px", paddingLeft: "18px" } },
          h("li", {}, h("b", {}, "Tekrar"), " — bilemedim, birazdan yine sor"),
          h("li", {}, h("b", {}, "Zor"), " — bildim ama zorlandım"),
          h("li", {}, h("b", {}, "İyi"), " — normal hatırladım (çoğu zaman bu)"),
          h("li", {}, h("b", {}, "Kolay"), " — anında bildim, uzun süre sorma")),
        h("button", {
          class: "btn btn-primary small-btn", style: { width: "auto" },
          onclick: async () => { App.settings.gradeHelpSeen = true; await App.saveSettings(); helpCard.remove(); }
        }, "Anladım 👍"));
      area.appendChild(helpCard);
    }

    area.appendChild(h("div", { class: "grade-row" },
      grades.map(x => h("button", {
        class: `btn grade-btn ${x.cls}`,
        onclick: async () => {
          await App.gradeCard(q.id, x.g, { enMode: !App.isBilingual() });
          this.lastSpeechMatch = undefined;
          this.sessionDone++;
          if (x.g === 0) this.queue.push(q);
          this.idx++;
          this.renderCard();
        }
      }, h("div", {}, x.label), h("div", { class: "grade-sub" }, x.sub)))
    ));

    if (Speech.ttsAvailable) {
      area.appendChild(h("button", {
        class: "btn btn-ghost", style: { marginTop: "8px" },
        onclick: () => Speech.speak(this.cleanForSpeech(Lang.speakableAnswers(q, App.settings.officials).join(". ")), { lang: "en", rate: App.settings.ttsRate })
      }, "🔊 Cevabı dinle"));
    }
  }
};
