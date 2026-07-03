/* =========================================================================
 * views/progress.js — İlerleme: ustalık ısı haritası, kategori radarı,
 * sınav geçmişi, en zayıf 10
 * ========================================================================= */
"use strict";

const ProgressView = {
  async render(root) {
    const { h } = UI;
    const cards = await App.cards();
    const exams = await DB.getAllExams();

    /* ---------- ısı haritası ---------- */
    const heatCells = QUESTIONS.map(q => {
      const c = cards.get(q.id);
      const lvl = SRS.masteryLevel(c);
      const cell = h("button", {
        class: `heat-cell heat-${lvl}` + (q.star ? " heat-star" : ""),
        title: `#${q.id}: ${q.q}`,
        onclick: () => this.showDetail(q, c)
      }, String(q.id));
      return cell;
    });

    /* ---------- kategori radarı ---------- */
    const catKeys = Object.keys(CATEGORIES);
    const catScores = catKeys.map(k => {
      const qs = QUESTIONS.filter(q => q.cat === k);
      const score = qs.reduce((s, q) => s + SRS.masteryLevel(cards.get(q.id)) / 4, 0) / qs.length;
      return score;
    });
    const radar = this.radarSVG(catKeys.map(k => CATEGORIES[k].short), catScores);

    /* ---------- en zayıf 10 ---------- */
    const weakest = QUESTIONS
      .map(q => ({ q, c: cards.get(q.id) }))
      .filter(x => x.c && x.c.seen > 0)
      .sort((a, b) => SRS.weaknessScore(b.c) - SRS.weaknessScore(a.c))
      .slice(0, 10);

    root.appendChild(h("div", { class: "page" },
      h("h1", {}, "📊 İlerleme"),

      h("div", { class: "card" },
        h("h3", {}, "128 sorunun ustalık haritası"),
        h("div", { class: "heat-legend small muted" },
          h("span", { class: "heat-key heat-0" }), " yeni ",
          h("span", { class: "heat-key heat-1" }), " öğreniliyor ",
          h("span", { class: "heat-key heat-2" }), " taze ",
          h("span", { class: "heat-key heat-3" }), " gelişiyor ",
          h("span", { class: "heat-key heat-4" }), " oturmuş"),
        h("div", { class: "heatmap" }, heatCells),
        h("p", { class: "small muted" }, "Altın çerçeve = ★ yıldızlı soru. Hücreye dokun → detay.")),

      h("div", { class: "card center" },
        h("h3", {}, "Kategori radarı"),
        h("div", { class: "radar-wrap", html: radar })),

      h("div", { class: "card" },
        h("h3", {}, "Sınav geçmişi"),
        exams.length === 0
          ? h("p", { class: "muted" }, "Henüz deneme sınavı yapılmadı.")
          : this.examChart(exams),
        exams.slice().reverse().slice(0, 10).map(e =>
          h("div", { class: "row-between exam-row" },
            h("span", { class: "small" }, UI.fmtDate(e.date)),
            h("span", { class: e.passed ? "ok" : "fail" }, `${e.score}/${e.total} ${e.passed ? "✅" : "❌"}`)))),

      h("div", { class: "card" },
        h("h3", {}, "En zayıf 10 soru"),
        weakest.length === 0
          ? h("p", { class: "muted" }, "Henüz yeterli veri yok — çalışmaya başla!")
          : weakest.map(x => h("div", { class: "wrong-item", onclick: () => this.showDetail(x.q, x.c) },
              h("b", {}, `#${x.q.id} `), x.q.q,
              h("div", { class: "small muted" }, `${x.c.wrong} yanlış / ${x.c.seen} görülme`))))
    ));
  },

  examChart(exams) {
    const { h } = UI;
    const last = exams.slice(-12);
    const W = 300, H = 90, pad = 6;
    const barW = Math.min(28, (W - pad * 2) / last.length - 4);
    const bars = last.map((e, i) => {
      const x = pad + i * ((W - pad * 2) / last.length);
      const hgt = (e.score / 20) * (H - 20);
      const color = e.passed ? "var(--ok)" : "var(--fail)";
      return `<rect x="${x}" y="${H - hgt - 14}" width="${barW}" height="${hgt}" rx="3" fill="${color}"/>
              <text x="${x + barW / 2}" y="${H - 2}" text-anchor="middle" class="chart-num">${e.score}</text>`;
    }).join("");
    const passLine = H - 14 - (12 / 20) * (H - 20);
    return h("div", { class: "exam-chart", html:
      `<svg viewBox="0 0 ${W} ${H}" width="100%">
        <line x1="0" y1="${passLine}" x2="${W}" y2="${passLine}" stroke="var(--accent)" stroke-dasharray="4 3" stroke-width="1"/>
        <text x="${W - 2}" y="${passLine - 3}" text-anchor="end" class="chart-num">12 (geçme çizgisi)</text>
        ${bars}
      </svg>` });
  },

  radarSVG(labels, scores) {
    const size = 300, cx = size / 2, cy = size / 2, R = 95;
    const n = labels.length;
    const pt = (i, r) => {
      const ang = (Math.PI * 2 * i) / n - Math.PI / 2;
      return [cx + r * Math.cos(ang), cy + r * Math.sin(ang)];
    };
    let grid = "";
    for (const frac of [0.25, 0.5, 0.75, 1]) {
      const pts = Array.from({ length: n }, (_, i) => pt(i, R * frac).join(",")).join(" ");
      grid += `<polygon points="${pts}" fill="none" stroke="var(--ring-bg)" stroke-width="1"/>`;
    }
    let axes = "", labelEls = "";
    for (let i = 0; i < n; i++) {
      const [x, y] = pt(i, R);
      axes += `<line x1="${cx}" y1="${cy}" x2="${x}" y2="${y}" stroke="var(--ring-bg)" stroke-width="1"/>`;
      const [lx, ly] = pt(i, R + 24);
      labelEls += `<text x="${lx}" y="${ly}" text-anchor="middle" dominant-baseline="central" class="radar-label">${UI.esc(labels[i])}</text>`;
    }
    const dataPts = scores.map((s, i) => pt(i, Math.max(0.04, s) * R).join(",")).join(" ");
    return `<svg viewBox="0 0 ${size} ${size}" width="100%" style="max-width:340px">
      ${grid}${axes}
      <polygon points="${dataPts}" fill="var(--accent-33)" stroke="var(--accent)" stroke-width="2"/>
      ${labelEls}
    </svg>`;
  },

  showDetail(q, c) {
    const { h } = UI;
    const existing = document.getElementById("detail-modal");
    if (existing) existing.remove();
    const answers = effectiveAnswers(q, App.settings.officials);
    const modal = h("div", { id: "detail-modal", class: "modal-backdrop", onclick: (e) => { if (e.target.id === "detail-modal") modal.remove(); } },
      h("div", { class: "modal" },
        h("div", { class: "qmeta" },
          h("span", { class: "qnum" }, `#${q.id}`),
          UI.catBadge(q.cat),
          q.star ? h("span", { class: "badge badge-star" }, "★") : null),
        h("p", { lang: "en" }, h("b", {}, q.q)),
        h("ul", { class: "alist", lang: "en" }, answers.map(a => h("li", {}, a))),
        h("div", { class: "trbox" },
          h("div", { class: "tr-explain" }, "🇹🇷 " + q.tr),
          h("div", { class: "tr-hook" }, "🧠 " + q.hook)),
        c && c.seen > 0
          ? h("p", { class: "small muted" }, `Görülme: ${c.seen} · Doğru: ${c.correct} · Yanlış: ${c.wrong} · Aralık: ${Math.round(c.interval)} gün`)
          : h("p", { class: "small muted" }, "Henüz çalışılmadı."),
        h("button", { class: "btn btn-primary", onclick: () => modal.remove() }, "Kapat")));
    document.body.appendChild(modal);
  }
};
