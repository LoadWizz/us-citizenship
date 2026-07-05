/* =========================================================================
 * views/interview.js — Mülakat Hazırlığı: memur akışı, small talk,
 * yemin soruları, N-400 hatırlatmaları, sınav günü listesi
 * ========================================================================= */
"use strict";

const InterviewView = {
  async render(root) {
    const { h } = UI;

    const accordion = (title, body, { critical = false, open = false } = {}) => {
      const content = h("div", { class: "acc-body" + (open ? " open" : "") }, body);
      const head = h("button", { class: "acc-head" + (critical ? " acc-critical" : "") },
        h("span", {}, (critical ? "🔴 " : "") + title),
        h("span", { class: "acc-arrow" }, "▾"));
      head.addEventListener("click", () => content.classList.toggle("open"));
      return h("div", { class: "acc" }, head, content);
    };

    root.appendChild(h("div", { class: "page" },
      h("h1", {}, "🗣️ Mülakat Hazırlığı"),
      h("p", { class: "muted" }, "🔴 işaretli bölümler \"kritik an\"lardır — mülakatın kazanılıp kaybedildiği yerler."),

      h("h3", { class: "section-title" }, "Mülakat Akışı (memurun sırası)"),
      INTERVIEW_FLOW.map(step => accordion(
        `${step.step}. ${step.title}`,
        [
          h("div", { class: "en-quote", lang: "en" }, step.en),
          h("p", {}, step.tr),
          h("ul", { class: "tips" }, step.tips.map(t => h("li", {}, t))),
          Speech.ttsAvailable ? h("button", {
            class: "btn btn-outline small-btn",
            style: { width: "auto" },
            onclick: () => Speech.speak(step.en.replace(/["""]/g, ""), { rate: App.rateFor("en") })
          }, "İngilizcesini Dinle") : null
        ],
        { critical: step.critical, open: step.step === 1 })),

      h("h3", { class: "section-title" }, "Small Talk Pratiği"),
      h("div", { class: "card" },
        h("p", { class: "muted small" }, "Memur bunları sorabilir — İngilizce konuşman buradan da değerlendirilir:"),
        SMALL_TALK.map(s => h("div", { class: "smalltalk-item" },
          h("div", { class: "row-between" },
            h("b", { lang: "en" }, s.en),
            Speech.ttsAvailable ? h("button", { class: "btn btn-outline small-btn", style: { width: "auto" }, onclick: () => Speech.speak(s.en, { rate: App.rateFor("en") }) }, "Dinle") : null),
          h("div", { class: "small muted" }, s.tr),
          h("div", { class: "small ok", lang: "en" }, "→ " + s.sample)))),

      h("h3", { class: "section-title" }, "Yemin Soruları (N-400 Part 12)"),
      h("div", { class: "card" },
        h("p", { class: "muted small" }, "Mülakatın sonunda memur bunları okur; her birine \"Yes\" demen beklenir (istisnaların varsa avukatına danış):"),
        OATH_QUESTIONS.map(o => h("div", { class: "smalltalk-item" },
          h("b", { lang: "en" }, o.en),
          h("div", { class: "small muted" }, o.tr),
          h("div", { class: "small ok" }, "→ " + o.answer)))),

      h("div", { class: "card" },
        h("h3", {}, "Yeminde verilen sözler (⟷ Soru 67)"),
        h("p", { class: "muted small" }, OATH_PROMISES.intro),
        h("ul", {}, OATH_PROMISES.promises.map(p =>
          h("li", {}, h("b", { lang: "en" }, p.en), h("span", { class: "muted small" }, " — " + p.tr))))),

      h("h3", { class: "section-title" }, "Sınav Günü Kontrol Listesi"),
      h("div", { class: "card" },
        CHECKLIST.map(c => h("label", { class: "check-item" },
          h("input", { type: "checkbox" }),
          h("span", {}, (c.critical ? "❗ " : "") + c.item))))
    ));
  }
};
