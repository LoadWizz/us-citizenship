/* =========================================================================
 * views/exam.js — Deneme Sınavı: 20 soru, 12 doğru = geçer, sözlü akış.
 * Gerçekçi mod: 12 doğruya ulaşınca veya 9 yanlış olunca erken biter
 * (gerçek mülakattaki gibi). Sorular zayıf kartlara ve ★ sorulara ağırlıklı.
 * ========================================================================= */
"use strict";

const ExamView = {
  state: null,

  async render(root) {
    const { h } = UI;
    this.root = root;
    this.state = null;

    root.appendChild(h("div", { class: "page" },
      h("h1", {}, "🎓 Deneme Sınavı"),
      h("div", { class: "card" },
        h("p", {}, h("b", {}, "2025 kuralları:"), " Memur 128 soruluk havuzdan 20 soru sorar. ",
          h("b", {}, "12 doğru = GEÇTİN."), " Test sözlüdür."),
        h("ul", { class: "rules" },
          h("li", {}, "Sorular sesli okunur (memur simülasyonu)."),
          h("li", {}, "Cevabı YÜKSEK SESLE söyle, sonra kontrol et."),
          h("li", {}, Speech.sttAvailable ? "🎤 ile sesli cevap verirsen otomatik eşleştirilir." : "Bu tarayıcıda ses tanıma yok — kendin işaretleyeceksin."),
          h("li", {}, App.settings.realisticExam
            ? "Gerçekçi mod AÇIK: 12 doğruda veya 9 yanlışta sınav erken biter."
            : "Gerçekçi mod KAPALI: 20 sorunun tamamı sorulur."))),
      h("button", { class: "btn btn-primary btn-big", onclick: () => this.start() }, "▶ Sınavı Başlat"),
      h("button", { class: "btn btn-ghost", onclick: () => UI.navigate("/home") }, "← Geri")
    ));
  },

  async start() {
    /* Havuz: tam havuz (128) premium; ücretsizde kilidi açık bloklar.
     * Deneme sınavı HER ZAMAN salt İngilizce ve sözlü — gerçek sınav böyle. */
    const hasFullPool = (typeof Entitlements === "undefined") || Entitlements.has("full_exam_pool");
    let questions;
    if (hasFullPool) {
      questions = await App.pickExamQuestions(20);
    } else {
      const states = await Blocks.getAllStates();
      const unlocked = new Set(BLOCKS.filter(b => states.get(b.id).status !== "locked").flatMap(b => b.ids));
      const pool = QUESTIONS.filter(q => unlocked.has(q.id));
      questions = [...pool].sort(() => Math.random() - 0.5).slice(0, 20);
    }
    this.state = {
      questions, idx: 0, correct: 0, wrong: 0, limitedPool: !hasFullPool,
      items: [], startedAt: Date.now(), qStart: Date.now(), timerId: null
    };
    this.renderQuestion();
  },

  finishedEarly() {
    const s = this.state;
    if (!App.settings.realisticExam) return false;
    return s.correct >= 12 || s.wrong >= 9;
  },

  renderQuestion() {
    const { h } = UI;
    const s = this.state;
    const root = this.root;
    root.innerHTML = "";
    Speech.stopSpeaking();
    Speech.stopListening();
    clearInterval(s.timerId);

    if (s.idx >= s.questions.length || this.finishedEarly()) {
      return this.renderResult();
    }

    const q = s.questions[s.idx];
    const answers = effectiveAnswers(q, App.settings.officials);
    s.qStart = Date.now();
    s.answeredBySpeech = null;

    const timerEl = h("span", { class: "timer", id: "exam-timer" }, "0:00");
    s.timerId = setInterval(() => {
      const sec = Math.floor((Date.now() - s.qStart) / 1000);
      const el = document.getElementById("exam-timer");
      if (el) {
        el.textContent = `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`;
        el.classList.toggle("timer-slow", sec > 30);
      }
    }, 1000);

    const status = h("div", { class: "speech-status", id: "speech-status" });
    const answerArea = h("div", { id: "answer-area" });

    answerArea.appendChild(h("div", { class: "exam-btns" },
      Speech.micUsable() ? h("button", {
        class: "btn btn-primary btn-big", id: "mic-btn",
        onclick: () => this.listenAnswer(q, answers)
      }, "🎤 Sesli Cevapla") : null,
      h("button", { class: Speech.micUsable() ? "btn btn-outline btn-big" : "btn btn-primary btn-big", onclick: () => this.reveal(q, answers) }, "Cevabı Göster")
    ));

    root.appendChild(h("div", { class: "page" },
      h("div", { class: "study-top" },
        h("button", { class: "btn btn-ghost small-btn", onclick: () => { if (confirm("Sınavı iptal et?")) UI.navigate("/home"); } }, "✕ İptal"),
        h("span", { class: "muted" }, `Soru ${s.idx + 1} / ${s.questions.length}`),
        timerEl),
      h("div", { class: "progressbar" }, h("div", { class: "progressbar-fill", style: { width: `${(s.idx / s.questions.length) * 100}%` } })),
      h("div", { class: "score-strip" },
        h("span", { class: "ok" }, `✓ ${s.correct}`),
        h("span", { class: "muted" }, "hedef: 12"),
        h("span", { class: "fail" }, `✗ ${s.wrong}`)),
      s.limitedPool && s.idx === 0 ? h("div", { class: "badge badge-warn" },
        "Ücretsiz sürümde sorular yalnız açık bloklardan gelir — tam 128'lik havuz Premium'da") : null,
      h("div", { class: "card qcard" },
        h("div", { class: "qtext", lang: "en", html: Lang.qHTMLEn(q) }),
        h("div", { class: "qcontrols" },
          Speech.ttsAvailable ? h("button", { class: "btn btn-circle", onclick: () => Speech.speak(q.q, { rate: App.settings.ttsRate }) }, "🔊") : null),
        status),
      answerArea
    ));
    UI.tapGuard(answerArea); // hayalet dokunuş koruması

    if (Speech.ttsAvailable) Speech.speak(q.q, { rate: App.settings.ttsRate });
  },

  listenAnswer(q, answers) {
    const status = document.getElementById("speech-status");
    const mic = document.getElementById("mic-btn");
    status.textContent = "🎙️ Dinliyorum...";
    mic.classList.add("listening");
    Speech.listen({
      onResult: (alts) => {
        // Yankı koruması: mikrofon sorunun kendisini (TTS/ortam) duyduysa yok say
        const echo = Speech.compareDictation(q.q, alts[0]);
        if (echo.ratio > 0.55) {
          this.state.answeredBySpeech = null;
          status.innerHTML = "🔁 Sorunun sesi algılandı — soru bittikten sonra 🎤'a basıp CEVABI söyle";
          status.className = "speech-status";
          return;
        }
        const res = Speech.matchAnswer(alts, answers);
        if (res.match) {
          // Sadece gerçek eşleşmede cevap otomatik açılır
          this.state.answeredBySpeech = { match: true, heard: alts[0] };
          status.innerHTML = `✅ Eşleşti: “${UI.esc(alts[0])}”`;
          status.className = "speech-status ok";
          this.reveal(q, answers);
        } else {
          // Eşleşme yok: soru ekranda kalır — tekrar dene veya kendin aç
          this.state.answeredBySpeech = null;
          status.innerHTML = `Duyulan: “${UI.esc(alts[0])}” — eşleşmedi. 🎤 ile tekrar dene veya cevabı göster`;
          status.className = "speech-status";
        }
      },
      onError: (err) => {
        status.textContent = Speech.sttErrorMessage(err);
        mic.classList.remove("listening");
        if (!Speech.micUsable()) mic.style.display = "none";
      },
      onEnd: () => mic.classList.remove("listening")
    });
  },

  reveal(q, answers) {
    const { h } = UI;
    const s = this.state;
    const area = document.getElementById("answer-area");
    area.innerHTML = "";
    UI.tapGuard(area); // çift dokunuş "Doğru bildim"e kaçmasın

    const speech = s.answeredBySpeech;

    area.appendChild(UI.answerCard(q, { natLang: null })); // sınav salt İngilizce
    if (speech && speech.match) {
      area.appendChild(h("div", { class: "speech-status ok" }, "🎤 Sesli cevabın kabul edildi"));
    }

    const mark = async (correct) => {
      clearInterval(s.timerId);
      const elapsed = Math.round((Date.now() - s.qStart) / 1000);
      correct ? s.correct++ : s.wrong++;
      s.items.push({ id: q.id, correct, seconds: elapsed, bySpeech: !!(speech && speech.match) });
      await App.gradeCard(q.id, correct ? 2 : 0, { enMode: true }); // deneme sınavı = salt İngilizce bağlam
      s.idx++;
      this.renderQuestion();
    };

    area.appendChild(h("div", { class: "exam-btns" },
      h("button", { class: "btn grade-btn grade-good btn-big", onclick: () => mark(true) }, "✓ Doğru bildim"),
      h("button", { class: "btn grade-btn grade-again btn-big", onclick: () => mark(false) }, "✗ Bilemedim")
    ));

    if (speech && speech.match) {
      // sesli eşleşme varsa otomatik önerilen: doğru
      UI.toast("Eşleşme bulundu — 'Doğru bildim' önerildi");
    }
  },

  async renderResult() {
    const { h } = UI;
    const s = this.state;
    const root = this.root;
    clearInterval(s.timerId);
    root.innerHTML = "";

    const total = s.items.length;
    const passed = SelfCheck.examPassed(s.correct, 20);

    // kategori dağılımı
    const perCat = {};
    for (const it of s.items) {
      const q = QUESTIONS.find(x => x.id === it.id);
      const key = q.cat;
      perCat[key] = perCat[key] || { correct: 0, total: 0 };
      perCat[key].total++;
      if (it.correct) perCat[key].correct++;
    }

    const examRecord = {
      date: new Date().toISOString(),
      type: "mock",
      score: s.correct, wrong: s.wrong, total: 20, asked: total,
      passed, perCat, items: s.items,
      durationSec: Math.round((Date.now() - s.startedAt) / 1000)
    };
    await DB.addExam(examRecord);
    await DB.markToday();

    const catRows = Object.entries(perCat).map(([cat, v]) =>
      h("div", { class: "cat-row" },
        UI.catBadge(cat),
        h("div", { class: "cat-bar" },
          h("div", { class: "cat-bar-fill", style: { width: `${(v.correct / v.total) * 100}%`, background: CATEGORIES[cat].color } })),
        h("span", { class: "small muted" }, `${v.correct}/${v.total}`)));

    const coachBox = h("div", { id: "coach-box" });

    root.appendChild(h("div", { class: "page" },
      h("div", { class: `result-banner ${passed ? "pass" : "fail-bg"}` },
        h("div", { class: "big-emoji" }, passed ? "🎉" : "💪"),
        h("h1", {}, passed ? "GEÇTİN!" : "KALDIN"),
        h("p", { class: "result-score" }, `${s.correct} doğru / ${s.wrong} yanlış`,
          total < 20 ? ` (${total} soruda erken bitti)` : ""),
        h("p", { class: "small" }, passed
          ? "Gerçek sınavda da bu performans yeter. Tempoyu koru!"
          : "12 doğruya ulaşman gerekiyor. Yanlışların çalışma kuyruğuna eklendi.")),

      h("div", { class: "card" },
        h("h3", {}, "Kategori dağılımı"),
        catRows),

      s.items.some(i => !i.correct) ? h("div", { class: "card" },
        h("h3", {}, "Yanlış cevapladıkların"),
        s.items.filter(i => !i.correct).map(i => {
          const q = QUESTIONS.find(x => x.id === i.id);
          return h("div", { class: "wrong-item" },
            h("b", {}, `#${q.id} `), q.q,
            h("div", { class: "small ok" }, "→ " + effectiveAnswers(q, App.settings.officials).slice(0, 2).join(" / ")));
        })) : null,

      coachBox,

      h("button", { class: "btn btn-primary btn-big", onclick: () => this.render(this.root) }, "🔄 Yeni Sınav"),
      h("button", { class: "btn btn-outline btn-big", onclick: () => UI.navigate("/progress") }, "📊 İlerlemeye Bak"),
      h("button", { class: "btn btn-ghost", onclick: () => UI.navigate("/home") }, "← Bugün'e dön")
    ));

    // Claude koçu — Pro özelliği + anahtar gerekir; ikisi de yoksa zarif düşüş
    const coachAllowed = (typeof Entitlements === "undefined") || Entitlements.has("ai_coach");
    if (!coachAllowed) {
      coachBox.appendChild(h("div", { class: "card locked-teaser", onclick: () => UI.navigate("/paywall") },
        h("b", {}, "🤖 AI Koç — Vatandaşlık planında"),
        h("div", { class: "small muted" }, "Her sınavdan sonra kişisel neden-sonuç analizi, blok bazlı zaaf tespiti ve günlük plan. Dokunarak planları gör.")));
    } else if (App.settings.apiKey) {
      this.renderCoach(coachBox, examRecord);
    } else {
      coachBox.appendChild(h("div", { class: "card muted small" },
        "🤖 Sınav sonrası kişisel Claude koçluğu için Ayarlar'a Anthropic API anahtarı ekleyebilirsin (isteğe bağlı — uygulama tamamen çevrimdışı da çalışır)."));
    }
  },

  async renderCoach(box, examRecord) {
    const { h } = UI;
    box.innerHTML = "";
    box.appendChild(h("div", { class: "card coach-card" },
      h("h3", {}, "🤖 Claude Koç"),
      h("div", { class: "muted small", id: "coach-status" }, "Analiz ediliyor...")));
    try {
      const history = await DB.getAllExams();
      const cards = Array.from((await App.cards()).values());
      const blockStates = Array.from((await Blocks.getAllStates()).values());
      const coaching = await Coach.getCoaching({
        apiKey: App.settings.apiKey,
        model: App.settings.coachModel,
        examResult: examRecord, history, cards,
        blockStates, langMode: App.settings.langMode
      });
      box.innerHTML = "";
      box.appendChild(h("div", { class: "card coach-card" },
        h("h3", {}, "🤖 Claude Koç"),
        coaching.zaaflar.length ? h("div", {},
          h("h4", {}, "Zaaflar"),
          h("ul", {}, coaching.zaaflar.map(z => h("li", {}, z)))) : null,
        coaching.oncelikli_konular.length ? h("div", {},
          h("h4", {}, "Öncelikli konular"),
          h("ul", {}, coaching.oncelikli_konular.map(z => h("li", {}, z)))) : null,
        coaching.calisma_plani ? h("div", {},
          h("h4", {}, "Çalışma planı"),
          h("p", {}, coaching.calisma_plani)) : null,
        coaching.motivasyon ? h("p", { class: "coach-motivation" }, "💬 " + coaching.motivasyon) : null
      ));
    } catch (e) {
      const st = document.getElementById("coach-status");
      if (st) st.textContent = "Koçluk alınamadı: " + e.message + " (çevrimdışı olabilirsin — sorun değil)";
    }
  }
};
