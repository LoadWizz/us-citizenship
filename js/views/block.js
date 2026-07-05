/* =========================================================================
 * views/block.js — Blok detayı (BlockView) + blok sınav koşucusu (BlockTestView)
 *
 * İki kapılı mühür akışı:
 *   Bilingual kullanıcı: Blok Sınavı (TR+EN, %85) → İngilizce Mührü (salt EN, %85)
 *   EN-only kullanıcı  : Blok Sınavı zaten İngilizce → geçince iki kapı birden kapanır.
 * Sınav soruları HER SEFERİNDE karışık sırada (sıra ezberini önler).
 * ========================================================================= */
"use strict";

const BlockView = {
  async render(root) {
    const { h } = UI;
    const block = Blocks.byId(App.selectedBlock || 1);
    if (!block) { UI.navigate("/home"); return; }
    const st = await Blocks.getState(block.id);
    const cards = await App.cards();
    const m = Blocks.masteryOf(block, cards);
    const bilingual = App.isBilingual();
    const need = Blocks.passNeed(block.ids.length);

    /* soru noktaları: gri=görülmedi, sarı=çalışılıyor, yeşil=ustalaşıldı */
    const dots = block.ids.map(id => {
      const q = QUESTIONS.find(x => x.id === id);
      const c = cards.get(id);
      const cls = SRS.isMastered(c) ? "qdot-mastered" : (c && c.seen > 0 ? "qdot-seen" : "qdot-new");
      return h("button", { class: `qdot ${cls}`, title: q.q, onclick: () => ProgressView.showDetail(q, c) }, String(id));
    });

    const steps = [
      { done: true, label: "Kartları çalış", sub: `${m.seen}/${m.total} görüldü` },
      { done: st.status === "test_passed" || st.status === "sealed",
        label: bilingual ? "Blok Sınavı (Türkçe destekli)" : "Blok Sınavı (İngilizce)",
        sub: st.bestTest ? `en iyi: ${st.bestTest.score}/${st.bestTest.total} · eşik ${need}` : `eşik: ${need}/${block.ids.length} (%85)` },
      { done: st.status === "sealed",
        label: "🔏 İngilizce Mührü",
        sub: st.bestSeal ? `en iyi: ${st.bestSeal.score}/${st.bestSeal.total}` : "salt İngilizce, %85 — bloğu tamamlar" }
    ];
    const visibleSteps = bilingual ? steps : [steps[0], { ...steps[2], label: "Blok Sınavı = İngilizce Mührü", sub: steps[1].sub }];

    root.appendChild(h("div", { class: "page" },
      h("div", { class: "study-top" },
        h("button", { class: "btn btn-ghost small-btn", onclick: () => UI.navigate("/home") }, "← Bloklar"),
        h("span", { class: "muted" }, `Blok ${block.id}/7`),
        h("span", { style: { width: "52px" } })),

      h("div", { class: "card" },
        h("div", { class: "block-head" },
          h("span", { class: "block-icon-big" }, st.status === "sealed" ? "🏅" : block.icon),
          h("div", {},
            h("h2", { style: { margin: 0 } }, block.name),
            h("p", { class: "muted small", style: { margin: "2px 0 0" } }, block.desc))),
        h("div", { class: "seal-steps" },
          visibleSteps.map((s, i) => h("div", { class: `seal-step ${s.done ? "step-done" : ""}` },
            h("span", { class: "step-mark" }, s.done ? "✓" : String(i + 1)),
            h("div", {},
              h("div", { class: "step-label" }, s.label),
              h("div", { class: "small muted" }, s.sub)))))),

      h("button", { class: "btn btn-primary btn-big", onclick: () => { StudyView.targetBlock = block.id; UI.navigate("/study"); } },
        `▶ Bu bloğu çalış`),

      st.status !== "sealed" ? h("button", {
        class: "btn btn-outline btn-big",
        onclick: () => { App.selectedBlock = block.id; App.testMode = "test"; UI.navigate("/blocktest"); }
      }, bilingual ? "📝 Blok Sınavı" : "📝 Blok Sınavı (İngilizce Mührü)") : null,

      (bilingual && (st.status === "test_passed")) ? h("button", {
        class: "btn btn-seal btn-big",
        onclick: () => { App.selectedBlock = block.id; App.testMode = "seal"; UI.navigate("/blocktest"); }
      }, "🔏 İngilizce Mührü'nü Geç") : null,

      st.status === "sealed" ? h("div", { class: "card sealed-banner" },
        "🏅 Bu blok mühürlendi", h("div", { class: "small muted" }, `${UI.fmtDate(st.sealedAt)} · İngilizce testte ${st.bestSeal ? st.bestSeal.score + "/" + st.bestSeal.total : ""}`)) : null,

      h("div", { class: "card" },
        h("h3", {}, "Sorular"),
        h("p", { class: "small muted" }, "🟢 ustalaşıldı (2 farklı günde İngilizce doğru) · 🟡 çalışılıyor · ⚪ yeni"),
        h("div", { class: "qdot-grid" }, dots))
    ));
  }
};

const BlockTestView = {
  s: null,

  async render(root) {
    const { h } = UI;
    this.root = root;
    const mode = App.testMode || "test";           // test | seal | mixed
    const block = mode === "mixed" ? null : Blocks.byId(App.selectedBlock || 1);

    /* Soru havuzu */
    let pool;
    if (mode === "drill") {
      /* 🎯 Zayıflık Drili (Pro): en zayıf 10 soru — hedefli tekrar */
      const cards = await App.cards();
      pool = QUESTIONS
        .map(q => ({ q, w: SRS.weaknessScore(cards.get(q.id)), seen: (cards.get(q.id) || {}).seen || 0 }))
        .filter(x => x.seen > 0)
        .sort((a, b) => b.w - a.w)
        .slice(0, 10)
        .map(x => x.q);
      if (pool.length < 3) { UI.toast("Drill için önce biraz çalış — yeterli veri yok"); UI.navigate("/home"); return; }
    } else if (mode === "mixed") {
      const ids = await Blocks.sealedQuestionIds();
      if (!ids.length) { UI.navigate("/home"); return; }
      const cards = await App.cards();
      /* zayıflık ağırlıklı 10 soru */
      const weighted = ids.map(id => ({ id, w: 1 + SRS.weaknessScore(cards.get(id)) }));
      pool = [];
      for (let k = 0; k < Math.min(10, weighted.length); k++) {
        const total = weighted.reduce((s, x) => s + x.w, 0);
        let r = Math.random() * total, idx = 0;
        for (; idx < weighted.length; idx++) { r -= weighted[idx].w; if (r <= 0) break; }
        idx = Math.min(idx, weighted.length - 1);
        pool.push(QUESTIONS.find(q => q.id === weighted[idx].id));
        weighted.splice(idx, 1);
      }
    } else {
      pool = Blocks.questions(block);
      /* her seferinde karışık sıra */
      pool = [...pool];
      for (let i = pool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [pool[i], pool[j]] = [pool[j], pool[i]];
      }
    }

    /* Mühür testi + EN-only mod = salt İngilizce sunum */
    const enOnly = mode === "seal" || !App.isBilingual();
    this.s = { mode, block, pool, idx: 0, correct: 0, wrong: 0, items: [], enOnly, startedAt: Date.now() };
    this.isPractice = mode === "mixed" || mode === "drill"; // blok durumu değiştirmez
    this.renderQuestion();
  },

  renderQuestion() {
    const { h } = UI;
    const s = this.s;
    const root = this.root;
    root.innerHTML = "";
    Speech.stopSpeaking();
    Speech.stopListening();

    if (s.idx >= s.pool.length) return this.renderResult();

    const q = s.pool[s.idx];
    const answers = effectiveAnswers(q, App.settings.officials);
    s.speechMatch = null;
    const natHTML = s.enOnly ? null : Lang.qHTMLNative(q, "tr");

    const title = s.mode === "mixed" ? "🔀 Karma Tekrar"
      : s.mode === "drill" ? "🎯 Zayıflık Drili"
      : s.mode === "seal" ? `🔏 ${s.block.name} — İngilizce Mührü`
      : `📝 ${s.block.name} — Blok Sınavı`;

    const status = h("div", { class: "speech-status", id: "speech-status" });
    const answerArea = h("div", { id: "answer-area" },
      h("div", { class: "exam-btns" },
        Speech.micUsable() ? h("button", { class: "btn btn-primary btn-big", id: "mic-btn", onclick: () => this.listen(q, answers) }, "🎤 Sesli Cevapla") : null,
        h("button", { class: Speech.micUsable() ? "btn btn-outline btn-big" : "btn btn-primary btn-big", onclick: () => this.reveal(q, answers) }, "Cevabı Göster")));

    root.appendChild(h("div", { class: "page" },
      h("div", { class: "study-top" },
        h("button", { class: "btn btn-ghost small-btn", onclick: () => { if (confirm("Sınavı iptal et?")) UI.navigate(s.block ? "/block" : "/home"); } }, "✕"),
        h("span", { class: "muted small" }, title),
        h("span", { class: "muted" }, `${s.idx + 1}/${s.pool.length}`)),
      h("div", { class: "progressbar" }, h("div", { class: "progressbar-fill", style: { width: `${(s.idx / s.pool.length) * 100}%` } })),
      !this.isPractice ? h("div", { class: "score-strip" },
        h("span", { class: "ok" }, `✓ ${s.correct}`),
        h("span", { class: "muted" }, `eşik: ${Blocks.passNeed(s.pool.length)}`),
        h("span", { class: "fail" }, `✗ ${s.wrong}`)) : null,
      h("div", { class: "card qcard" },
        natHTML ? h("div", { class: "qtext qtext-native", lang: "tr", html: natHTML }) : null,
        h("div", { class: `qtext ${natHTML ? "qtext-en-second" : ""}`, lang: "en", html: Lang.qHTMLEn(q) }),
        h("div", { class: "qcontrols" },
          Speech.ttsAvailable ? h("button", { class: "btn btn-circle", onclick: () => this.speakQ(q) }, "🔊") : null),
        status),
      answerArea
    ));
    UI.tapGuard(answerArea);

    if (App.settings.autoTTS && Speech.ttsAvailable) this.speakQ(q);
  },

  speakQ(q) {
    const parts = [];
    if (!this.s.enOnly) {
      const n = Lang.native(q, "tr");
      if (n) parts.push({ text: n.q, lang: "tr" });
    }
    parts.push({ text: q.q, lang: "en" });
    Speech.speakSequence(parts, { rate: App.settings.ttsRate });
  },

  listen(q, answers) {
    const status = document.getElementById("speech-status");
    const mic = document.getElementById("mic-btn");
    status.textContent = "🎙️ Dinliyorum...";
    mic.classList.add("listening");
    Speech.listen({
      onResult: async (alts) => {
        /* önce eşleşmeyi dene; yankı kontrolü YALNIZ başarısızlıkta
         * (cevap soru kelimesi içeriyorsa — "Supreme Court" — yankı sanılmasın) */
        const res = Speech.matchAnswer(alts, answers);
        if (res.match) {
          this.s.speechMatch = { heard: res.heard, tier: res.tier };
          await App.logAttempt({ qid: q.id, mode: this.s.mode || "block", heard: res.heard, expected: res.best.answer, verdict: res.tier });
          status.innerHTML = `✅ Eşleşti: “${UI.esc(res.heard)}”`;
          status.className = "speech-status ok";
          this.reveal(q, answers);
          return;
        }
        if (Speech.looksLikeEcho(q.q, res.heard, answers)) {
          status.innerHTML = "🔁 Sorunun sesi algılandı — soru bitince cevabı söyle";
          return;
        }
        await App.logAttempt({ qid: q.id, mode: this.s.mode || "block", heard: res.heard, expected: answers[0] || null, verdict: "eşleşmedi" });
        status.innerHTML = `Duyulan: “${UI.esc(res.heard)}” — eşleşmedi. Tekrar dene veya cevabı göster`;
      },
      onError: (err) => {
        status.textContent = Speech.sttErrorMessage(err);
        mic.classList.remove("listening");
        if (!Speech.micUsable()) mic.style.display = "none";
      },
      onEnd: () => { const m = document.getElementById("mic-btn"); if (m) m.classList.remove("listening"); }
    });
  },

  reveal(q, answers) {
    const { h } = UI;
    const s = this.s;
    const area = document.getElementById("answer-area");
    area.innerHTML = "";
    UI.tapGuard(area);

    area.appendChild(UI.answerCard(q, { natLang: s.enOnly ? null : App.nativeLang() }));
    if (s.speechMatch) {
      area.appendChild(h("div", { class: "speech-status ok" }, "🎤 Sesli cevabın kabul edildi"));
    }

    const mark = async (correct) => {
      correct ? s.correct++ : s.wrong++;
      s.items.push({ id: q.id, correct, bySpeech: !!s.speechMatch });
      /* SRS'e geri besleme + EN ustalık günlüğü (mühür/EN-only bağlamda) */
      await App.gradeCard(q.id, correct ? 2 : 0, { enMode: s.enOnly });
      s.idx++;
      this.renderQuestion();
    };

    area.appendChild(h("div", { class: "exam-btns" },
      h("button", { class: "btn grade-btn grade-good btn-big", onclick: () => mark(true) }, "✓ Doğru bildim"),
      h("button", { class: "btn grade-btn grade-again btn-big", onclick: () => mark(false) }, "✗ Bilemedim")));
  },

  async renderResult() {
    const { h } = UI;
    const s = this.s;
    const root = this.root;
    root.innerHTML = "";
    Speech.stopSpeaking();

    const total = s.pool.length;
    const need = Blocks.passNeed(total);
    const ok = Blocks.passed(s.correct, total);

    /* blok durumunu işle */
    let outcome = null;
    if (s.mode === "test") {
      outcome = App.isBilingual()
        ? await Blocks.recordResult(s.block.id, "test", s.correct, total)
        : await Blocks.recordEnModeResult(s.block.id, s.correct, total);
    } else if (s.mode === "seal") {
      outcome = await Blocks.recordResult(s.block.id, "seal", s.correct, total);
    }

    await DB.addExam({
      date: new Date().toISOString(),
      type: this.isPractice ? s.mode : (s.mode === "seal" || !App.isBilingual() ? "seal" : "block"),
      blockId: s.block ? s.block.id : null,
      score: s.correct, wrong: s.wrong, total, asked: total,
      passed: this.isPractice ? null : ok,
      items: s.items,
      durationSec: Math.round((Date.now() - s.startedAt) / 1000)
    });
    await DB.markToday();

    const sealedNow = outcome && outcome.sealedNow;
    const unlockedNext = outcome && outcome.unlockedNext;
    const nextBlock = s.block ? Blocks.byId(s.block.id + 1) : null;
    const wrongItems = s.items.filter(i => !i.correct);

    root.appendChild(h("div", { class: "page" },
      h("div", { class: `result-banner ${this.isPractice ? "" : (ok ? "pass" : "fail-bg")}` },
        h("div", { class: "big-emoji" }, s.mode === "mixed" ? "🔀" : s.mode === "drill" ? "🎯" : (sealedNow ? "🏅" : ok ? "🎉" : "💪")),
        h("h1", {}, s.mode === "mixed" ? "Karma tekrar bitti"
          : s.mode === "drill" ? "Drill bitti"
          : sealedNow ? "MÜHÜRLENDİ!"
          : ok ? (s.mode === "seal" ? "MÜHÜRLENDİ!" : "GEÇTİN!") : "OLMADI"),
        h("p", { class: "result-score" }, `${s.correct}/${total} doğru`,
          !this.isPractice ? ` · eşik ${need}` : ""),
        !this.isPractice && !ok ? h("p", { class: "small" },
          `${need - s.correct} doğru daha gerekiyordu. Yanlışların çalışma kuyruğuna eklendi — kısa bir tekrar sonrası yeniden dene (sorular her seferinde karışır).`) : null,
        unlockedNext && nextBlock ? h("p", { class: "unlock-note" }, `🔓 Blok ${nextBlock.id} açıldı: ${nextBlock.icon} ${nextBlock.name}`) : null,
        (ok && s.mode === "test" && App.isBilingual() && !sealedNow) ? h("p", { class: "small" },
          "Şimdi son adım: aynı bloğu SALT İNGİLİZCE geç ve mühürle. Gerçek mülakatta memur İngilizce soracak — mühür, o ana hazır olduğunun kanıtı.") : null),

      wrongItems.length ? h("div", { class: "card" },
        h("h3", {}, "Yanlışların"),
        wrongItems.map(i => {
          const q = QUESTIONS.find(x => x.id === i.id);
          return h("div", { class: "wrong-item" },
            h("b", {}, `#${q.id} `), q.q,
            h("div", { class: "small ok" }, "→ " + effectiveAnswers(q, App.settings.officials).slice(0, 2).join(" / ")));
        })) : null,

      (ok && s.mode === "test" && App.isBilingual() && !sealedNow)
        ? h("button", { class: "btn btn-seal btn-big", onclick: () => { App.testMode = "seal"; this.render(this.root); } }, "🔏 İngilizce Mührü'ne Geç")
        : null,
      (!ok && !this.isPractice)
        ? h("button", { class: "btn btn-primary btn-big", onclick: () => this.render(this.root) }, "🔄 Tekrar Dene (karışık sıra)")
        : null,
      (sealedNow && nextBlock)
        ? h("button", { class: "btn btn-primary btn-big", onclick: () => { App.selectedBlock = nextBlock.id; UI.navigate("/block"); } }, `→ Blok ${nextBlock.id}: ${nextBlock.name}`)
        : null,
      h("button", { class: "btn btn-ghost", onclick: () => UI.navigate("/home") }, "← Ana sayfa")
    ));
  }
};
