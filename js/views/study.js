/* =========================================================================
 * views/study.js — Çalışma modu: aktif hatırlama + aralıklı tekrar
 *
 * Bilingual akış (langMode="bilingual"):
 *   1) Türkçe soru (renkli ipucu) gösterilir ve okunur — ANLAM önce
 *   2) İngilizce soru (renkli ipucu) gösterilir ve okunur — SINAV DİLİ sonra
 *   3) Kullanıcı sesli/zihinsel cevaplar → çevirir → kendini notlar
 * EN modda yalnız İngilizce. Cevaplar her zaman İngilizce esaslı;
 * bilingual modda altlarında Türkçe karşılık.
 *
 * Renkli ipucu = Von Restorff izolasyonu: kartta YALNIZ ipucu öbeği renkli.
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
    this.activeBlockName = block ? `${block.icon} ${block.name}` : "";
    this.idx = 0;
    this.sessionDone = 0;

    if (!this.queue.length) {
      root.appendChild(h("div", { class: "page center-page" },
        h("div", { class: "big-emoji" }, "🎉"),
        h("h2", {}, "Bugünlük bitti!"),
        h("p", { class: "muted" }, "Vadesi gelen kart yok. Blok sınavına girebilir veya serbest tekrar yapabilirsin."),
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

  renderCard() {
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
    const bilingual = App.isBilingual();
    const answers = effectiveAnswers(q, App.settings.officials);
    this.lastSpeechMatch = undefined;

    const speechStatus = h("div", { class: "speech-status", id: "speech-status" });

    /* Soru kartı: bilingual modda ÖNCE Türkçe, SONRA İngilizce */
    const natHTML = bilingual ? Lang.qHTMLNative(q, "tr") : null;
    const front = h("div", { class: "card qcard" },
      h("div", { class: "qmeta" },
        h("span", { class: "qnum" }, `#${q.id}`),
        UI.catBadge(q.cat),
        q.star ? h("span", { class: "badge badge-star" }, "★ Çekirdek") : null),
      q.dyn ? UI.dynBadge() : null,
      natHTML ? h("div", { class: "qtext qtext-native", lang: "tr", html: natHTML }) : null,
      h("div", { class: `qtext ${natHTML ? "qtext-en-second" : ""}`, lang: "en", html: Lang.qHTMLEn(q) }),
      h("div", { class: "qcontrols" },
        Speech.ttsAvailable ? h("button", { class: "btn btn-circle", title: "Soruyu dinle", onclick: () => this.speakQuestion(q) }, "🔊") : null,
        Speech.micUsable() ? h("button", { class: "btn btn-circle", id: "mic-btn", title: "İngilizce sesli cevapla", onclick: () => this.listenAnswer(q, answers) }, "🎤") : null),
      speechStatus
    );

    const answerArea = h("div", { id: "answer-area" },
      h("button", { class: "btn btn-primary btn-big", onclick: () => this.reveal(q, answers) }, "Cevabı Göster"));

    root.appendChild(h("div", { class: "page" },
      h("div", { class: "study-top" },
        h("button", { class: "btn btn-ghost small-btn", onclick: () => { this.targetBlock = null; UI.navigate("/home"); } }, "← Çık"),
        h("span", { class: "muted" }, `${this.activeBlockName ? this.activeBlockName + " · " : ""}${this.idx + 1} / ${this.queue.length}`),
        h("span", { style: { width: "52px" } })),
      h("div", { class: "progressbar" }, h("div", { class: "progressbar-fill", style: { width: `${(this.idx / this.queue.length) * 100}%` } })),
      front,
      answerArea
    ));
    UI.tapGuard(answerArea);

    if (App.settings.autoTTS && Speech.ttsAvailable) this.speakQuestion(q);
  },

  /* Bilingual: önce Türkçe soru, ardından İngilizce; EN modda yalnız İngilizce */
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
        if (!Speech.micUsable()) mic.style.display = "none"; // izin yok → butonu kaldır
      },
      onEnd: () => { const m = document.getElementById("mic-btn"); if (m) m.classList.remove("listening"); }
    });
  },

  async reveal(q, answers) {
    const { h } = UI;
    const area = document.getElementById("answer-area");
    area.innerHTML = "";
    UI.tapGuard(area);

    const pairs = Lang.answerPairs(q, App.settings.officials, App.nativeLang());
    const hasBest = pairs.some(p => p.best);
    /* Not butonlarında GERÇEK süreler: bu kart için her notun kartı ne zaman
     * geri getireceği hesaplanır ("kısa/uzun" yerine somut bilgi) */
    const cardState = (await App.cards()).get(q.id) || SRS.newCard(q.id);
    const ivs = SRS.previewIntervals(cardState);
    const grades = [
      { g: 0, label: "Tekrar", sub: SRS.fmtInterval(ivs[0]), cls: "grade-again" },
      { g: 1, label: "Zor", sub: SRS.fmtInterval(ivs[1]), cls: "grade-hard" },
      { g: 2, label: "İyi", sub: SRS.fmtInterval(ivs[2]), cls: "grade-good" },
      { g: 3, label: "Kolay", sub: SRS.fmtInterval(ivs[3]), cls: "grade-easy" }
    ];

    area.appendChild(h("div", { class: "card acard" },
      h("div", { class: "alabel" }, hasBest ? "Kabul edilen cevaplar — renkli olanı ezberle:" : "Kabul edilen cevap(lar):"),
      h("ul", { class: "alist" }, pairs.map(p =>
        h("li", { lang: "en", class: p.best ? "a-best-li" : "" },
          p.best
            ? h("span", { class: `a-best cue-${q.cat}` }, p.en)
            : p.en,
          p.best ? h("span", { class: "best-tag" }, "en kolayı") : null,
          p.nat ? h("div", { class: "a-nat", lang: "tr" }, p.nat) : null))),
      q.note ? h("div", { class: "anote muted small" }, "ℹ️ " + q.note) : null,
      h("div", { class: "trbox" },
        h("div", { class: "tr-explain" }, "🇹🇷 " + q.tr),
        h("div", { class: "tr-hook" }, "🧠 " + q.hook)),
      this.lastSpeechMatch === true ? h("div", { class: "speech-status ok" }, "🎤 Sesli cevabın eşleşmişti — 'İyi' veya 'Kolay' seç") : null
    ));

    /* İlk kullanımda not butonlarının ne işe yaradığını TEK SEFER anlat */
    if (!App.settings.gradeHelpSeen) {
      const helpCard = h("div", { class: "card grade-help" },
        h("b", {}, "Bu 4 düğme ne işe yarar?"),
        h("p", { class: "small", style: { margin: "6px 0" } },
          "Ne kadar iyi bildiğini SEN söylersin; uygulama kartı ona göre tam zamanında tekrar sorar (unutma eğrisi bilimi). Düğmenin altındaki süre = kartın ne zaman geri geleceği."),
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
          /* EN-only modda tüm çalışma İngilizce bağlamdır → ustalık günlüğü işler */
          await App.gradeCard(q.id, x.g, { enMode: !App.isBilingual() });
          this.lastSpeechMatch = undefined;
          this.sessionDone++;
          if (x.g === 0) this.queue.push(q); // Tekrar → oturum sonuna geri koy
          this.idx++;
          this.renderCard();
        }
      }, h("div", {}, x.label), h("div", { class: "grade-sub" }, x.sub)))
    ));

    if (Speech.ttsAvailable) {
      area.appendChild(h("button", {
        class: "btn btn-ghost", style: { marginTop: "8px" },
        onclick: () => Speech.speak(Lang.speakableAnswers(q, App.settings.officials).join(". "), { lang: "en", rate: App.settings.ttsRate })
      }, hasBest ? "🔊 En kolay cevabı dinle" : "🔊 Cevabı dinle (İngilizce)"));
    }
  }
};
