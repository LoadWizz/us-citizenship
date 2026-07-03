/* =========================================================================
 * views/study.js — Çalışma modu: aktif hatırlama + aralıklı tekrar
 * Akış: soru göster (TTS ile oku) → kullanıcı sesli/zihinsel cevaplar →
 *       çevir → kendini notla (Tekrar/Zor/İyi/Kolay)
 * ========================================================================= */
"use strict";

const StudyView = {
  queue: [], idx: 0, revealed: false, starOnly: false, sessionDone: 0,

  async render(root) {
    const { h } = UI;
    this.root = root;
    this.queue = await App.buildStudyQueue({ starOnly: this.starOnly });
    this.idx = 0;
    this.sessionDone = 0;

    if (!this.queue.length) {
      // vadesi gelen yok — serbest mod önerisi
      root.appendChild(h("div", { class: "page center-page" },
        h("div", { class: "big-emoji" }, "🎉"),
        h("h2", {}, "Bugünlük bitti!"),
        h("p", { class: "muted" }, "Vadesi gelen kart yok. İstersen serbest tekrar yap veya yıldızlı soruları tara."),
        h("button", { class: "btn btn-primary btn-big", onclick: () => this.freeSession(false) }, "🔁 Serbest Tekrar (rastgele 20)"),
        h("button", { class: "btn btn-outline btn-big", onclick: () => this.freeSession(true) }, "★ Yıldızlı 20'yi Tara"),
        h("button", { class: "btn btn-ghost", onclick: () => UI.navigate("/home") }, "← Bugün'e dön")
      ));
      return;
    }
    this.renderCard();
  },

  async freeSession(starOnly) {
    const pool = starOnly ? QUESTIONS.filter(q => q.star) : [...QUESTIONS];
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    this.queue = starOnly ? pool : pool.slice(0, 20);
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
      root.appendChild(h("div", { class: "page center-page" },
        h("div", { class: "big-emoji" }, "🏁"),
        h("h2", {}, "Oturum tamamlandı!"),
        h("p", { class: "muted" }, `${this.sessionDone} kart çalıştın.`),
        h("button", { class: "btn btn-primary btn-big", onclick: () => UI.navigate("/home") }, "Bugün'e dön"),
        h("button", { class: "btn btn-outline", onclick: () => { this.freeMode = false; this.render(root); } }, "Devam et")
      ));
      return;
    }

    const q = this.queue[this.idx];
    this.revealed = false;
    const answers = effectiveAnswers(q, App.settings.officials);

    const speechStatus = h("div", { class: "speech-status", id: "speech-status" });

    const front = h("div", { class: "card qcard" },
      h("div", { class: "qmeta" },
        h("span", { class: "qnum" }, `#${q.id}`),
        UI.catBadge(q.cat),
        q.star ? h("span", { class: "badge badge-star" }, "★ CORE") : null),
      q.dyn ? UI.dynBadge() : null,
      h("div", { class: "qtext", lang: "en" }, q.q),
      h("div", { class: "qcontrols" },
        Speech.ttsAvailable ? h("button", { class: "btn btn-circle", title: "Soruyu sesli dinle", onclick: () => Speech.speak(q.q, { rate: App.settings.ttsRate }) }, "🔊") : null,
        Speech.sttAvailable ? h("button", { class: "btn btn-circle", id: "mic-btn", title: "Sesli cevapla", onclick: () => this.listenAnswer(q, answers) }, "🎤") : null),
      speechStatus
    );

    const revealBtn = h("button", { class: "btn btn-primary btn-big", onclick: () => this.reveal(q, answers) }, "Cevabı Göster");

    root.appendChild(h("div", { class: "page" },
      h("div", { class: "study-top" },
        h("button", { class: "btn btn-ghost small-btn", onclick: () => UI.navigate("/home") }, "← Çık"),
        h("span", { class: "muted" }, `${this.idx + 1} / ${this.queue.length}`),
        h("span", { style: { width: "52px" } })),
      h("div", { class: "progressbar" }, h("div", { class: "progressbar-fill", style: { width: `${(this.idx / this.queue.length) * 100}%` } })),
      front,
      h("div", { id: "answer-area" }, revealBtn)
    ));

    if (App.settings.autoTTS && Speech.ttsAvailable) {
      Speech.speak(q.q, { rate: App.settings.ttsRate });
    }
  },

  listenAnswer(q, answers) {
    const status = document.getElementById("speech-status");
    const mic = document.getElementById("mic-btn");
    status.textContent = "🎙️ Dinliyorum... İngilizce cevap ver";
    mic.classList.add("listening");
    Speech.listen({
      onResult: (alts) => {
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
        status.textContent = err === "not-allowed"
          ? "Mikrofon izni verilmedi — dokunarak devam et"
          : "Ses tanıma çalışmadı — dokunarak devam et";
        mic.classList.remove("listening");
      },
      onEnd: () => mic.classList.remove("listening")
    });
  },

  reveal(q, answers) {
    const { h } = UI;
    this.revealed = true;
    const area = document.getElementById("answer-area");
    area.innerHTML = "";

    const grades = [
      { g: 0, label: "Tekrar", sub: "<1dk", cls: "grade-again" },
      { g: 1, label: "Zor", sub: "kısa", cls: "grade-hard" },
      { g: 2, label: "İyi", sub: "normal", cls: "grade-good" },
      { g: 3, label: "Kolay", sub: "uzun", cls: "grade-easy" }
    ];

    area.appendChild(h("div", { class: "card acard" },
      h("div", { class: "alabel" }, "Kabul edilen cevap(lar):"),
      h("ul", { class: "alist", lang: "en" }, answers.map(a => h("li", {}, a))),
      q.note ? h("div", { class: "anote muted small" }, "ℹ️ " + q.note) : null,
      h("div", { class: "trbox" },
        h("div", { class: "tr-explain" }, "🇹🇷 " + q.tr),
        h("div", { class: "tr-hook" }, "🧠 " + q.hook)),
      this.lastSpeechMatch === true ? h("div", { class: "speech-status ok" }, "🎤 Sesli cevabın eşleşmişti — 'İyi' veya 'Kolay' seç") : null
    ));

    area.appendChild(h("div", { class: "grade-row" },
      grades.map(x => h("button", {
        class: `btn grade-btn ${x.cls}`,
        onclick: async () => {
          if (!this.freeMode) await App.gradeCard(q.id, x.g);
          else await App.gradeCard(q.id, x.g); // serbest modda da istatistik işlenir
          this.lastSpeechMatch = undefined;
          this.sessionDone++;
          // "Tekrar" seçilirse kartı oturum sonuna geri koy
          if (x.g === 0) this.queue.push(q);
          this.idx++;
          this.renderCard();
        }
      }, h("div", {}, x.label), h("div", { class: "grade-sub" }, x.sub)))
    ));

    if (Speech.ttsAvailable) {
      area.appendChild(h("button", {
        class: "btn btn-ghost", style: { marginTop: "8px" },
        onclick: () => Speech.speak(answers.join(". "), { rate: App.settings.ttsRate })
      }, "🔊 Cevabı dinle"));
    }
  }
};
