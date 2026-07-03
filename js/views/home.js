/* =========================================================================
 * views/home.js — "Bugün": günlük plan, streak, hazırlık tarihi
 * ========================================================================= */
"use strict";

const HomeView = {
  async render(root) {
    const { h } = UI;
    const stats = await App.planStats();
    const streak = await App.streak();
    const exams = await DB.getAllExams();
    const lastExam = exams[exams.length - 1] || null;
    const masteredPct = (stats.mature + stats.young) / stats.total;

    root.appendChild(h("div", { class: "page" },
      h("div", { class: "hero" },
        h("h1", {}, "🇺🇸 US Citizenship"),
        h("p", { class: "sub" }, "2025 Vatandaşlık Sınavı — 128 soru · 20 sorudan 12 doğru = geçer")
      ),

      h("div", { class: "card stat-row" },
        h("div", { class: "stat" },
          h("div", { class: "stat-num accent" }, String(stats.due)),
          h("div", { class: "stat-label" }, "Bugün tekrar")),
        h("div", { class: "stat" },
          h("div", { class: "stat-num" }, String(stats.newToday)),
          h("div", { class: "stat-label" }, "Yeni soru")),
        h("div", { class: "stat" },
          h("div", { class: "stat-num" }, streak > 0 ? `🔥 ${streak}` : "0"),
          h("div", { class: "stat-label" }, "Gün serisi"))
      ),

      h("div", { class: "card center" },
        UI.progressRing(masteredPct, 150, 12, `${stats.seen}/${stats.total} soru`),
        h("p", { class: "muted small" },
          `Oturmuş: ${stats.mature} · Gelişiyor: ${stats.young} · Öğreniliyor: ${stats.learning} · Yeni: ${stats.newCount}`),
        stats.newCount > 0
          ? h("p", { class: "small" }, `📅 Öngörülen hazırlık tarihi: `,
              h("b", {}, UI.fmtDate(stats.readinessDate)),
              ` (${stats.readinessDays} gün)`)
          : h("p", { class: "small ok" }, "✅ Tüm sorular tanıtıldı — tekrar döngüsündesin!")
      ),

      h("button", { class: "btn btn-primary btn-big", onclick: () => UI.navigate("/study") },
        stats.due + stats.newToday > 0
          ? `▶ Çalışmaya Başla (${stats.due + stats.newToday} kart)`
          : "▶ Serbest Çalışma"),

      h("button", { class: "btn btn-outline btn-big", onclick: () => UI.navigate("/exam") },
        "🎓 Deneme Sınavı (20 soru)"),

      lastExam ? h("div", { class: "card" },
        h("div", { class: "row-between" },
          h("span", {}, "Son deneme sınavı"),
          h("span", { class: lastExam.passed ? "ok" : "fail" },
            `${lastExam.score}/${lastExam.total} — ${lastExam.passed ? "GEÇTİ ✅" : "KALDI ❌"}`)),
        h("div", { class: "muted small" }, UI.fmtDate(lastExam.date))
      ) : null,

      h("div", { class: "card tip" },
        h("b", {}, "💡 Günün ipucu: "),
        randomTip())
    ));

    function randomTip() {
      const tips = [
        "Yıldızlı (★) 20 soru sınavda en sık sorulanlar — önce onları otomatikleştir.",
        "Cevabı içinden değil, SESLİ söyle. Gerçek sınav sözlü!",
        "Yanlış cevap vermek boş bırakmakla aynı — sınavda her zaman tahmin et.",
        "Memur cevabın birebir aynısını beklemez; anahtar kelime yeterli.",
        "Dinamik soruların (başkan, vali, sözcü...) cevabını mülakat HAFTASINDA tekrar doğrula.",
        "Mülakatta anlamadıysan çekinme: \"Could you repeat that, please?\"",
        "Günde 15 dakika düzenli çalışma, haftada bir 3 saatlik çalışmadan iyidir.",
        "N-400 formundaki cevaplarını da tekrar et — mülakatın yarısı o form."
      ];
      return tips[Math.floor(Math.random() * tips.length)];
    }
  }
};
