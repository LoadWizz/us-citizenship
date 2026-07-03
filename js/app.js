/* =========================================================================
 * app.js — Uygulama çekirdeği: ayarlar, kart durumu, plan hesapları, önyükleme
 * ========================================================================= */
"use strict";

const App = {
  settings: null,
  selfCheck: null,
  _cardCache: null,

  DEFAULT_SETTINGS: {
    officials: { ...DEFAULT_OFFICIALS },
    newPerDay: 12,
    autoTTS: true,
    ttsRate: 0.92,
    realisticExam: true,   // 12 doğru / 9 yanlışta erken bitir
    theme: "auto",         // auto | light | dark
    apiKey: "",
    coachModel: "claude-sonnet-4-6"
  },

  async loadSettings() {
    const saved = await DB.getKV("settings");
    this.settings = { ...this.DEFAULT_SETTINGS, ...(saved || {}) };
    this.settings.officials = { ...DEFAULT_OFFICIALS, ...((saved && saved.officials) || {}) };
    return this.settings;
  },

  async saveSettings() {
    await DB.setKV("settings", this.settings);
    this.applyTheme();
  },

  applyTheme() {
    const t = this.settings.theme;
    const root = document.documentElement;
    if (t === "auto") root.removeAttribute("data-theme");
    else root.setAttribute("data-theme", t);
  },

  /* ---------- kartlar ---------- */
  async cards() {
    if (this._cardCache) return this._cardCache;
    const rows = await DB.getAllCards();
    const map = new Map(rows.map(c => [c.id, c]));
    for (const q of QUESTIONS) if (!map.has(q.id)) map.set(q.id, SRS.newCard(q.id));
    this._cardCache = map;
    return map;
  },

  async gradeCard(id, g) {
    const map = await this.cards();
    const updated = SRS.grade(map.get(id) || SRS.newCard(id), g);
    map.set(id, updated);
    await DB.putCard(updated);
    await DB.markToday();
    return updated;
  },

  invalidateCards() { this._cardCache = null; },

  /* ---------- günlük plan ---------- */
  async planStats() {
    const map = await this.cards();
    const now = Date.now();
    let due = 0, learning = 0, newCount = 0, mature = 0, young = 0, seen = 0;
    for (const c of map.values()) {
      if (c.state === "new") { newCount++; continue; }
      seen++;
      if (SRS.isDue(c, now)) due++;
      if (c.state === "learning") learning++;
      else if (c.interval >= SRS.MATURE_DAYS) mature++;
      else young++;
    }
    const newToday = Math.min(this.settings.newPerDay, newCount);
    // Öngörülen hazırlık: kalan yeni kartlar / günlük yeni + olgunlaşma tamponu
    const daysForNew = Math.ceil(newCount / Math.max(1, this.settings.newPerDay));
    const readinessDays = daysForNew + 14; // 2 hafta pekiştirme tamponu
    const readinessDate = new Date(now + readinessDays * 86400000);
    return { due, learning, newCount, newToday, mature, young, seen, total: QUESTIONS.length, readinessDate, readinessDays };
  },

  async streak() {
    const days = (await DB.getAllDays()).map(d => d.date).sort();
    if (!days.length) return 0;
    const set = new Set(days);
    const today = new Date();
    const key = (d) => d.toISOString().slice(0, 10);
    let streak = 0;
    const cursor = new Date(today);
    // bugün çalışılmadıysa dünden saymaya başla
    if (!set.has(key(cursor))) cursor.setDate(cursor.getDate() - 1);
    while (set.has(key(cursor))) {
      streak++;
      cursor.setDate(cursor.getDate() - 1);
    }
    return streak;
  },

  /* ---------- çalışma kuyruğu (interleaving: kategoriler karışık) ---------- */
  async buildStudyQueue({ starOnly = false } = {}) {
    const map = await this.cards();
    const now = Date.now();
    const pool = starOnly ? QUESTIONS.filter(q => q.star) : QUESTIONS;

    const dueCards = pool.filter(q => SRS.isDue(map.get(q.id), now));
    const newCards = pool.filter(q => map.get(q.id).state === "new").slice(0, this.settings.newPerDay);

    // Karıştır (interleave) — asla kategori bloklama yapma
    const queue = [...dueCards, ...newCards];
    for (let i = queue.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [queue[i], queue[j]] = [queue[j], queue[i]];
    }
    return queue;
  },

  /* ---------- sınav soru seçimi (zayıflık + yıldız ağırlıklı) ---------- */
  async pickExamQuestions(n = 20) {
    const map = await this.cards();
    const weighted = QUESTIONS.map(q => {
      const c = map.get(q.id);
      let w = 1 + SRS.weaknessScore(c);
      if (q.star) w += 1;               // yıldızlı sorular gerçek sınavda daha olası
      return { q, w };
    });
    const picked = [];
    for (let k = 0; k < n && weighted.length; k++) {
      const total = weighted.reduce((s, x) => s + x.w, 0);
      let r = Math.random() * total;
      let idx = 0;
      for (; idx < weighted.length; idx++) { r -= weighted[idx].w; if (r <= 0) break; }
      idx = Math.min(idx, weighted.length - 1);
      picked.push(weighted[idx].q);
      weighted.splice(idx, 1);
    }
    return picked;
  },

  /* ---------- önyükleme ---------- */
  async boot() {
    await this.loadSettings();
    this.applyTheme();
    this.selfCheck = SelfCheck.run();
    if (!this.selfCheck.allPass) {
      UI.toast("⚠️ Veri doğrulama uyarısı — Ayarlar'a bak");
    }

    UI.register("/home", HomeView);
    UI.register("/study", StudyView);
    UI.register("/exam", ExamView);
    UI.register("/english", EnglishView);
    UI.register("/interview", InterviewView);
    UI.register("/progress", ProgressView);
    UI.register("/settings", SettingsView);

    document.querySelectorAll(".navbtn").forEach(btn => {
      btn.addEventListener("click", () => {
        const r = btn.getAttribute("data-route");
        if (r === "more") UI.openSheet();
        else UI.navigate(r);
      });
    });
    document.getElementById("sheet-backdrop").addEventListener("click", UI.closeSheet);
    document.querySelectorAll(".sheet-item").forEach(item => {
      item.addEventListener("click", () => { UI.closeSheet(); UI.navigate(item.getAttribute("data-route")); });
    });

    window.addEventListener("hashchange", UI.renderRoute);
    await UI.renderRoute();

    if ("serviceWorker" in navigator) {
      try { await navigator.serviceWorker.register("sw.js"); }
      catch (e) { console.warn("SW kaydı başarısız (http üzerinden normaldir):", e.message); }
    }
  }
};

window.addEventListener("DOMContentLoaded", () => App.boot());
