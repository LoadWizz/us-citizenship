/* =========================================================================
 * views/study.js — Çalışma: adım adım ÖĞRET + mikrofon-öncelikli TEST
 * (5 Tem 2026 — Erkan'ın akış tarifi birebir)
 *
 * İKİ NET FAZ (karışık kuyruk karmaşası bitti):
 *  ÖĞRET — bugünün yeni kartları, adım adım AÇILAN ekran:
 *    1) Yalnız Türkçe soru (istersen 🔊 Türkçe dinle) → "İngilizce sor"
 *    2) İngilizce soru + renkli kritik kelimeler + "sesli dinlerken bu
 *       kelimelere dikkat" — henüz ses de cevap da yok
 *    3) "Sesli oku" → karaoke şeridi kelime kelime ilerler
 *    4) "Tekrar dinle" ya da "Cevabı ver"
 *    5) Cevap metni + karaoke dinleme (istediği kadar tekrar)
 *  GEÇİŞ — "şimdi test" ekranı; kullanıcı ne olacağını BİLİR.
 *  TEST — Türkçe yok. İngilizce soru + karaoke; cevap MİKROFONLA:
 *    ses biter → dinleme başlar → hüküm: Doğru! / eşleşmedi.
 *    "yakın" hükümde telaffuz parlatma önerilir (heceleme + yavaş dinleme).
 *    Not butonu yok: "Bu soruyu öğrendim" / "Çalışırken tekrar sor".
 *    Yanlışta kart oturum bitmeden yeniden sorulur (doğrulanana kadar).
 *
 * Ekranda İÇ JARGON YOK. Her hüküm App.logAttempt ile kaydedilir.
 * ========================================================================= */
"use strict";

const StudyView = {
  teach: [], review: [], tIdx: 0, rIdx: 0, phase: "teach",
  taughtToday: [], stats: null, targetBlock: null, freeMode: false,
  kara: null, karaAns: null,

  async render(root) {
    const { h } = UI;
    this.root = root;
    this.freeMode = false;
    this.taughtToday = [];
    this.stats = { done: 0, correct: 0, learned: 0 };
    const block = this.targetBlock ? Blocks.byId(this.targetBlock) : await Blocks.current();
    const { teach, review } = await App.buildStudyQueues({ blockId: block ? block.id : null });
    this.teach = teach; this.review = review;
    this.tIdx = 0; this.rIdx = 0;
    this.phase = teach.length ? "teach" : "review";

    if (!teach.length && !review.length) {
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
    this.renderNext();
  },

  async freeSession() {
    const states = await Blocks.getAllStates();
    const unlocked = new Set(BLOCKS.filter(b => states.get(b.id).status !== "locked").flatMap(b => b.ids));
    const cards = await App.cards();
    const pool = QUESTIONS.filter(q => unlocked.has(q.id) && !(cards.get(q.id) || {}).learned);
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    this.teach = [];
    this.review = pool.slice(0, 20);
    this.tIdx = 0; this.rIdx = 0;
    this.phase = "review";
    this.freeMode = true;
    this.taughtToday = [];
    this.stats = { done: 0, correct: 0, learned: 0 };
    this.renderNext();
  },

  cleanup() {
    Speech.stopSpeaking();
    Speech.stopListening();
    if (this.kara) Karaoke.stop(this.kara);
    if (this.karaAns) Karaoke.stop(this.karaAns);
    this.kara = this.karaAns = null;
  },

  renderNext() {
    this.cleanup();
    if (this.phase === "teach") {
      if (this.tIdx < this.teach.length) return this.renderTeach(this.teach[this.tIdx]);
      /* ÖĞRET bitti → geçiş ekranı, sonra TEST (öğretilenler + tekrarlar) */
      if (this.taughtToday.length || this.review.length) return this.renderTransition();
      return this.renderSummary();
    }
    if (this.rIdx < this.review.length) return this.renderRecall(this.review[this.rIdx]);
    return this.renderSummary();
  },

  topBar(label, pos, total) {
    const { h } = UI;
    return [
      h("div", { class: "study-top" },
        h("button", { class: "btn btn-ghost small-btn", onclick: () => { this.targetBlock = null; this.cleanup(); UI.navigate("/home"); } }, "← Çık"),
        h("span", { class: "muted" }, `${label} ${pos} / ${total}`),
        h("span", { style: { width: "52px" } })),
      h("div", { class: "progressbar" }, h("div", { class: "progressbar-fill", style: { width: `${((pos - 1) / Math.max(1, total)) * 100}%` } }))
    ];
  },

  /* ================= ÖĞRET — adım adım açılan kart ================= */
  renderTeach(q) {
    const { h } = UI;
    const root = this.root;
    root.innerHTML = "";
    const bilingual = App.isBilingual();
    const nat = Lang.native(q, "tr");
    const cue = CUES[q.id];
    const pairs = Lang.answerPairs(q, App.settings.officials, "tr");
    const heroes = pairs.filter(p => p.best);
    const heroList = heroes.length ? heroes : pairs;

    const steps = h("div", {});
    root.appendChild(h("div", { class: "page" },
      ...this.topBar("Öğren", this.tIdx + 1, this.teach.length),
      h("div", { class: "teach-label" }, "🆕 Yeni soru — önce öğren"),
      steps
    ));

    /* ---- Adım: Türkçe soru ---- */
    const stepTR = () => {
      const box = h("div", { class: "card qcard" },
        q.dyn ? UI.dynBadge() : null,
        h("div", { class: "qtext qtext-native", lang: "tr", html: Lang.qHTMLNative(q, "tr") }),
        h("div", { class: "step-btns" },
          (Speech.ttsAvailable && Speech.hasVoice("tr") && nat)
            ? h("button", { class: "btn btn-outline", onclick: () => Speech.speak(nat.q, { lang: "tr", rate: App.settings.ttsRate }) }, "🔊 Türkçe dinle")
            : null,
          h("button", { class: "btn btn-primary", onclick: () => { Speech.stopSpeaking(); stepEN(); } }, "🇺🇸 İngilizce sor →")));
      steps.appendChild(box);
      UI.tapGuard(box);
    };

    /* ---- Adım: İngilizce soru + kritik kelimeler (ses henüz yok) ---- */
    const stepEN = () => {
      this.kara = Karaoke.line(q.q, { cue, cat: q.cat });
      const listenBtnRow = h("div", { class: "step-btns", id: "teach-listen-row" },
        Speech.ttsAvailable
          ? h("button", { class: "btn btn-primary", onclick: () => playQuestion() }, "🔊 Sesli oku")
          : h("button", { class: "btn btn-primary", onclick: () => stepAnswer() }, "Cevabı ver →"));
      const box = h("div", { class: "card qcard" },
        h("div", { class: "qtext", lang: "en" }, this.kara.el),
        h("div", { class: "attention-line" },
          "🎧 Sesli dinlerken ",
          h("span", { class: `cue cue-${q.cat}` }, cue),
          " kelimelerine dikkat et — bunları duyduğunda cevap aklına gelsin."),
        listenBtnRow);
      steps.appendChild(box);
      /* önceki adımın butonlarını kilitle */
      const prev = steps.children[steps.children.length - 2];
      if (prev) prev.querySelectorAll(".step-btns .btn").forEach(b => b.disabled = true);
      box.scrollIntoView({ behavior: "smooth", block: "start" });
      UI.tapGuard(box);
    };

    /* ---- Adım: karaoke okuma → tekrar dinle / cevabı ver ---- */
    let asked = false;
    const playQuestion = () => {
      Karaoke.play(this.kara, {
        rate: App.settings.ttsRate,
        onend: () => { if (!asked) { asked = true; afterListen(); } }
      });
    };
    const afterListen = () => {
      const row = document.getElementById("teach-listen-row");
      if (!row) return;
      row.innerHTML = "";
      row.appendChild(UI.h("button", { class: "btn btn-outline", onclick: () => playQuestion() }, "🔁 Soruyu tekrar dinle"));
      row.appendChild(UI.h("button", { class: "btn btn-primary", onclick: () => stepAnswer() }, "Cevabı ver →"));
      UI.tapGuard(row);
    };

    /* ---- Adım: cevap + karaoke dinleme ---- */
    const stepAnswer = () => {
      Speech.stopSpeaking();
      const catColor = CATEGORIES[q.cat].color;
      const heroLines = heroList.map(p => {
        const k = Karaoke.line(p.en, {});
        return { k, p, el: UI.h("div", { class: "answer-hero" },
          UI.h("div", { class: `hero-text cue-${q.cat}`, lang: "en" }, k.el),
          p.nat ? UI.h("div", { class: "hero-nat", lang: "tr" }, p.nat) : null) };
      });
      const others = heroes.length ? pairs.filter(p => !p.best) : [];

      const playAnswers = (i = 0) => {
        if (i >= heroLines.length) return;
        this.karaAns = heroLines[i].k;
        Karaoke.play(heroLines[i].k, { rate: App.settings.ttsRate, onend: () => playAnswers(i + 1) });
      };
      const natTexts = heroList.map(p => p.nat).filter(Boolean);

      const box = UI.h("div", { class: "card acard" },
        heroLines.map(x => x.el),
        others.length ? UI.h("div", { class: "answer-others" },
          UI.h("div", { class: "others-label" }, "Bunlar da kabul edilir:"),
          UI.h("ul", { class: "others-list", lang: "en" }, others.map(p => UI.h("li", {}, p.en)))) : null,
        q.dyn ? UI.dynBadge() : null,
        q.note ? UI.h("div", { class: "anote muted small" }, "ℹ️ " + q.note) : null,
        UI.h("div", { class: "step-btns" },
          Speech.ttsAvailable ? UI.h("button", { class: "btn btn-outline", onclick: () => playAnswers(0) }, "🔊 Cevabı dinle") : null,
          (Speech.ttsAvailable && Speech.hasVoice("tr") && natTexts.length)
            ? UI.h("button", { class: "btn btn-ghost", onclick: () => Speech.speak(natTexts.join(". "), { lang: "tr", rate: App.settings.ttsRate }) }, "🔊 Türkçesini dinle")
            : null));

      steps.appendChild(box);
      if (FREQ.noteOf(q.id)) steps.appendChild(UI.h("div", { class: "leverage-line" }, "💡 " + FREQ.noteOf(q.id)));
      const mn = MNEMO.of(q.id);
      if (mn) steps.appendChild(UI.h("div", { class: "card mnemo-card", html: mn.svg }));
      steps.appendChild(UI.h("button", {
        class: "btn btn-primary btn-big",
        onclick: async () => {
          this.cleanup();
          await App.gradeCard(q.id, 2, { enMode: !App.isBilingual() });
          this.taughtToday.push(q);
          this.stats.done++;
          this.tIdx++;
          this.renderNext();
        }
      }, "Devam →"));
      const row = document.getElementById("teach-listen-row");
      if (row) row.querySelectorAll(".btn").forEach(b => { if (b.textContent.includes("Cevabı ver")) b.disabled = true; });
      box.scrollIntoView({ behavior: "smooth", block: "start" });
      UI.tapGuard(box);
    };

    if (bilingual && nat) stepTR(); else stepEN();
  },

  /* ================= GEÇİŞ — öğret bitti, test başlıyor ================= */
  renderTransition() {
    const { h } = UI;
    const root = this.root;
    root.innerHTML = "";
    /* bugün öğretilenler test kuyruğuna karışır */
    this.review = [...this.review, ...this.taughtToday];
    for (let i = this.review.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.review[i], this.review[j]] = [this.review[j], this.review[i]];
    }
    this.taughtToday = [];
    this.phase = "review";
    this.rIdx = 0;
    root.appendChild(h("div", { class: "page center-page" },
      h("div", { class: "big-emoji" }, "🎯"),
      h("h2", {}, "Şimdi test zamanı"),
      h("p", { class: "muted" }, `${this.review.length} soru soracağım — az önce öğrendiklerin ve tekrarı gelenler. Bundan sonrası yalnız İngilizce: gerçek sınavdaki gibi soruyu dinleyip cevabı SESLİ vereceksin.`),
      h("button", { class: "btn btn-primary btn-big", onclick: () => this.renderNext() }, "▶ Başla"),
      h("button", { class: "btn btn-ghost", onclick: () => { this.cleanup(); UI.navigate("/home"); } }, "Sonra devam ederim")
    ));
  },

  /* ================= TEST — mikrofon öncelikli, salt İngilizce ================= */
  renderRecall(q) {
    const { h } = UI;
    const root = this.root;
    root.innerHTML = "";
    const answers = effectiveAnswers(q, App.settings.officials);
    const cue = CUES[q.id];
    this.kara = Karaoke.line(q.q, { cue, cat: q.cat });
    this.recallStart = Date.now();

    const status = h("div", { class: "speech-status", id: "speech-status" });
    const actionRow = h("div", { class: "step-btns", id: "recall-actions" },
      Speech.ttsAvailable
        ? h("button", { class: "btn btn-primary", id: "ask-btn", onclick: () => this.askAloud(q, answers) }, "🔊 Sesli sor")
        : null,
      Speech.micUsable() && !Speech.ttsAvailable
        ? h("button", { class: "btn btn-primary", onclick: () => this.listenFor(q, answers) }, "🎤 Cevabı söyle")
        : null);
    const answerArea = h("div", { id: "answer-area" },
      h("button", { class: "btn btn-ghost", onclick: () => this.reveal(q, answers, { viaShow: true }) }, "Cevabı göster"));

    root.appendChild(h("div", { class: "page" },
      ...this.topBar("Test", this.rIdx + 1, this.review.length),
      h("div", { class: "card qcard" },
        q.dyn ? UI.dynBadge() : null,
        h("div", { class: "qtext", lang: "en" }, this.kara.el),
        actionRow,
        status),
      answerArea
    ));
    UI.tapGuard(answerArea);
  },

  /* Soruyu karaoke ile oku; bitince mikrofonu otomatik aç */
  askAloud(q, answers) {
    const status = document.getElementById("speech-status");
    status.textContent = "";
    status.className = "speech-status";
    Karaoke.play(this.kara, {
      rate: App.settings.ttsRate,
      onend: () => {
        /* yankı riskine karşı kısa nefes payı, sonra dinle */
        if (Speech.micUsable()) setTimeout(() => this.listenFor(q, answers), 350);
        else {
          status.textContent = "Cevabı yüksek sesle söyle, sonra kontrol et.";
        }
      }
    });
  },

  listenFor(q, answers) {
    const status = document.getElementById("speech-status");
    if (!status) return;
    status.innerHTML = "🎙️ <b>Cevabını söyle...</b>";
    status.className = "speech-status listening";
    Speech.listen({
      onResult: async (alts) => {
        const ms = Date.now() - this.recallStart;
        const res = Speech.matchAnswer(alts, answers);
        if (res.match) {
          this.stats.correct++;
          await App.logAttempt({ qid: q.id, mode: this.freeMode ? "free" : "study", heard: res.heard, expected: res.best.answer, verdict: res.tier, ms });
          return this.reveal(q, answers, { correct: true, tier: res.tier, heard: res.heard, matched: res.best.answer });
        }
        /* eşleşmedi — önce yankı mı diye bak */
        if (Speech.looksLikeEcho(q.q, res.heard, answers)) {
          status.innerHTML = "🔁 Sorunun sesi algılandı — okuma bittikten sonra CEVABI söyle";
          status.className = "speech-status";
          status.appendChild(UI.h("div", { class: "step-btns" },
            UI.h("button", { class: "btn btn-outline small-btn", onclick: () => this.listenFor(q, answers) }, "🎤 Tekrar dene")));
          return;
        }
        await App.logAttempt({ qid: q.id, mode: this.freeMode ? "free" : "study", heard: res.heard, expected: answers[0] || null, verdict: "eşleşmedi", ms });
        status.innerHTML = `🤔 Duyulan: “${UI.esc(res.heard)}” — eşleşmedi.`;
        status.className = "speech-status";
        status.appendChild(UI.h("div", { class: "step-btns" },
          UI.h("button", { class: "btn btn-outline small-btn", onclick: () => this.listenFor(q, answers) }, "🎤 Tekrar dene"),
          UI.h("button", { class: "btn btn-ghost small-btn", onclick: () => this.reveal(q, answers, { viaShow: true }) }, "Cevabı göster")));
      },
      onError: (err) => {
        status.textContent = Speech.sttErrorMessage(err);
        status.className = "speech-status";
        if (err === "no-speech") {
          status.appendChild(UI.h("div", { class: "step-btns" },
            UI.h("button", { class: "btn btn-outline small-btn", onclick: () => this.listenFor(q, answers) }, "🎤 Tekrar dene")));
        }
      },
      onEnd: () => {}
    });
  },

  /* Cevap ekranı. opts: {correct, tier, heard, matched} | {viaShow} */
  async reveal(q, answers, opts = {}) {
    const { h } = UI;
    const area = document.getElementById("answer-area");
    if (!area) return;
    area.innerHTML = "";
    UI.tapGuard(area);
    Speech.stopListening();

    /* hüküm şeridi */
    if (opts.correct) {
      area.appendChild(h("div", { class: "verdict verdict-ok" }, "✅ Doğru!"));
      if (opts.tier === "yakın") {
        /* telaffuz parlatma önerisi — kabul edildi ama daha iyi söylenebilir */
        const target = Speech.speakable(opts.matched);
        const hard = target.split(" ").sort((a, b) => b.length - a.length)[0] || target;
        area.appendChild(h("div", { class: "card pron-card" },
          h("b", {}, "Söyleyişini parlatmak ister misin?"),
          h("p", { class: "small muted" }, `Duyulan: “${UI.esc(opts.heard)}”. Hedef: `, h("b", { lang: "en" }, target)),
          h("div", { class: "pron-syll", lang: "en" }, Speech.syllabify(hard)),
          h("div", { class: "step-btns" },
            Speech.ttsAvailable ? h("button", { class: "btn btn-outline small-btn", onclick: () => Speech.speak(target, { lang: "en", rate: 0.55 }) }, "🐢 Yavaş dinle") : null,
            Speech.micUsable() ? h("button", { class: "btn btn-outline small-btn", onclick: () => this.pronRetry(q, answers, target) }, "🎤 Tekrar söyle") : null)));
      }
    } else if (!opts.viaShow) {
      area.appendChild(h("div", { class: "verdict verdict-no" }, "Bilemedin — cevap bu:"));
    }

    area.appendChild(UI.answerCard(q, { natLang: null })); // test salt İngilizce
    const mn = MNEMO.of(q.id);
    if (mn) area.appendChild(h("div", { class: "card mnemo-card", html: mn.svg }));

    if (Speech.ttsAvailable) {
      area.appendChild(h("button", {
        class: "btn btn-ghost",
        onclick: () => Speech.speak(Lang.speakableAnswers(q, App.settings.officials).map(Speech.speakable).join(". "), { lang: "en", rate: App.settings.ttsRate })
      }, "🔊 Cevabı dinle"));
    }

    if (opts.correct) {
      /* Doğru → kullanıcı karar verir: öğrendim / çalışırken tekrar sor */
      area.appendChild(h("div", { class: "grade-row" },
        h("button", {
          class: "btn grade-btn grade-easy btn-big",
          onclick: async () => {
            await App.gradeCard(q.id, 3, { enMode: true, learned: true });
            await App.logAttempt({ qid: q.id, mode: "study", verdict: "öğrendim" });
            this.stats.learned++;
            this.stats.done++;
            this.rIdx++;
            this.renderNext();
          }
        }, h("div", {}, "✔ Bu soruyu öğrendim"), h("div", { class: "grade-sub" }, "çalışmada bir daha çıkmaz")),
        h("button", {
          class: "btn grade-btn grade-good btn-big",
          onclick: async () => {
            await App.gradeCard(q.id, 1, { enMode: true });
            this.stats.done++;
            this.rIdx++;
            this.renderNext();
          }
        }, h("div", {}, "🔁 Çalışırken tekrar sor"), h("div", { class: "grade-sub" }, "yakında yine gelir"))));
    } else {
      /* Yanlış / cevabı gördü → doğrulayana kadar sorulur: oturum sonuna ekle */
      const viaShow = !!opts.viaShow;
      area.appendChild(h("button", {
        class: "btn btn-primary btn-big",
        onclick: async () => {
          await App.gradeCard(q.id, 0, { enMode: true });
          if (viaShow) await App.logAttempt({ qid: q.id, mode: "study", verdict: "gösterildi" });
          this.review.push(q);       // doğru cevaplanana kadar tekrar sorulur
          this.stats.done++;
          this.rIdx++;
          this.renderNext();
        }
      }, "Devam — bu soru yine sorulacak"));
    }
  },

  /* Telaffuz tekrar denemesi — hedef metinle eşleşme arar, cesaret verir */
  pronRetry(q, answers, target) {
    const status = document.getElementById("speech-status");
    if (status) { status.innerHTML = "🎙️ <b>Şimdi sen söyle:</b> " + UI.esc(target); status.className = "speech-status listening"; }
    Speech.listen({
      onResult: async (alts) => {
        const res = Speech.matchAnswer(alts, [target]);
        await App.logAttempt({ qid: q.id, mode: "pron", heard: alts[0], expected: target, verdict: res.match ? res.tier : "eşleşmedi" });
        if (!status) return;
        if (res.match && res.tier === "tam") {
          status.innerHTML = "🌟 Harika söyledin!";
          status.className = "speech-status ok";
        } else if (res.match) {
          status.innerHTML = "👍 Daha iyi! Bir kez daha ister misin?";
          status.className = "speech-status ok";
          status.appendChild(UI.h("div", { class: "step-btns" },
            UI.h("button", { class: "btn btn-outline small-btn", onclick: () => this.pronRetry(q, answers, target) }, "🎤 Tekrar")));
        } else {
          status.innerHTML = `Duyulan: “${UI.esc(alts[0])}” — 🐢 yavaş dinleyip bir daha dene.`;
          status.className = "speech-status";
          status.appendChild(UI.h("div", { class: "step-btns" },
            UI.h("button", { class: "btn btn-outline small-btn", onclick: () => Speech.speak(target, { lang: "en", rate: 0.55 }) }, "🐢 Yavaş dinle"),
            UI.h("button", { class: "btn btn-outline small-btn", onclick: () => this.pronRetry(q, answers, target) }, "🎤 Tekrar söyle")));
        }
      },
      onError: (err) => { if (status) status.textContent = Speech.sttErrorMessage(err); },
      onEnd: () => {}
    });
  },

  /* ================= ÖZET ================= */
  renderSummary() {
    const { h } = UI;
    const root = this.root;
    root.innerHTML = "";
    this.cleanup();
    const s = this.stats || { done: 0, correct: 0, learned: 0 };
    const doneBlock = this.targetBlock ? Blocks.byId(this.targetBlock) : null;
    this.targetBlock = null;
    root.appendChild(h("div", { class: "page center-page" },
      h("div", { class: "big-emoji" }, "🏁"),
      h("h2", {}, "Oturum tamamlandı!"),
      h("p", { class: "muted" },
        `${s.done} kart çalıştın` +
        (s.correct ? ` · ${s.correct} sesli doğru` : "") +
        (s.learned ? ` · ${s.learned} soruyu "öğrendim" olarak işaretledin` : "") + "."),
      doneBlock ? h("button", { class: "btn btn-primary btn-big", onclick: () => { App.selectedBlock = doneBlock.id; UI.navigate("/block"); } }, "Blok sınavına hazır mısın? →") : null,
      h("button", { class: "btn btn-outline btn-big", onclick: () => this.render(root) }, "Devam et"),
      h("button", { class: "btn btn-ghost", onclick: () => UI.navigate("/home") }, "← Ana sayfa")
    ));
  }
};
