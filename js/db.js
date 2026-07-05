/* =========================================================================
 * db.js — IndexedDB sarmalayıcısı (localStorage KULLANILMAZ)
 * Depolar:
 *   cards : soru başına SRS durumu           (keyPath: id)
 *   kv    : ayarlar ve tekil değerler        (keyPath: key)
 *   exams : sınav geçmişi (mock/block/seal)  (autoIncrement)
 *   days  : günlük aktivite kaydı (streak)   (keyPath: date "YYYY-MM-DD")
 *   blocks: blok durumları (mühür sistemi)   (keyPath: blockId)   [v2]
 *   attempts: sesli/işaretli cevap denemeleri (autoIncrement)     [v3]
 *     {qid, mode, heard, expected, verdict, ms, lang, ts} — cihazda kalır;
 *     zamanla soru-başına gerçek zorluk analizi için ham veri.
 * ========================================================================= */
"use strict";

const DB = (() => {
  const NAME = "us-citizenship";
  const VERSION = 3;
  let _db = null;

  function open() {
    if (_db) return Promise.resolve(_db);
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(NAME, VERSION);
      req.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains("cards")) db.createObjectStore("cards", { keyPath: "id" });
        if (!db.objectStoreNames.contains("kv"))    db.createObjectStore("kv",    { keyPath: "key" });
        if (!db.objectStoreNames.contains("exams")) db.createObjectStore("exams", { autoIncrement: true });
        if (!db.objectStoreNames.contains("days"))  db.createObjectStore("days",  { keyPath: "date" });
        if (!db.objectStoreNames.contains("blocks")) db.createObjectStore("blocks", { keyPath: "blockId" });
        if (!db.objectStoreNames.contains("attempts")) db.createObjectStore("attempts", { autoIncrement: true });
      };
      req.onsuccess = () => { _db = req.result; resolve(_db); };
      req.onerror = () => reject(req.error);
    });
  }

  function tx(store, mode, fn) {
    return open().then(db => new Promise((resolve, reject) => {
      const t = db.transaction(store, mode);
      const s = t.objectStore(store);
      const out = fn(s);
      t.oncomplete = () => resolve(out && out._result !== undefined ? out._result : out);
      t.onerror = () => reject(t.error);
      t.onabort = () => reject(t.error);
    }));
  }

  function reqToPromise(req) {
    return new Promise((resolve, reject) => {
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  return {
    /* --- cards --- */
    async getCard(id)      { const db = await open(); return reqToPromise(db.transaction("cards").objectStore("cards").get(id)); },
    async getAllCards()    { const db = await open(); return reqToPromise(db.transaction("cards").objectStore("cards").getAll()); },
    async putCard(card)    { return tx("cards", "readwrite", s => s.put(card)); },
    async putCards(cards)  { return tx("cards", "readwrite", s => { cards.forEach(c => s.put(c)); }); },
    async clearCards()     { return tx("cards", "readwrite", s => s.clear()); },

    /* --- kv (ayarlar) --- */
    async getKV(key, fallback = null) {
      const db = await open();
      const row = await reqToPromise(db.transaction("kv").objectStore("kv").get(key));
      return row ? row.value : fallback;
    },
    async setKV(key, value) { return tx("kv", "readwrite", s => s.put({ key, value })); },

    /* --- exams --- */
    async addExam(exam)    { return tx("exams", "readwrite", s => s.add(exam)); },
    async getAllExams()    { const db = await open(); return reqToPromise(db.transaction("exams").objectStore("exams").getAll()); },
    async clearExams()     { return tx("exams", "readwrite", s => s.clear()); },

    /* --- attempts (cevap denemeleri — zorluk analizi ham verisi) --- */
    async addAttempt(a)    { return tx("attempts", "readwrite", s => s.add(a)); },
    async getAllAttempts() { const db = await open(); return reqToPromise(db.transaction("attempts").objectStore("attempts").getAll()); },
    async clearAttempts()  { return tx("attempts", "readwrite", s => s.clear()); },

    /* --- blocks (mühür sistemi) --- */
    async getAllBlocks()   { const db = await open(); return reqToPromise(db.transaction("blocks").objectStore("blocks").getAll()); },
    async putBlock(state)  { return tx("blocks", "readwrite", s => s.put(state)); },
    async clearBlocks()    { return tx("blocks", "readwrite", s => s.clear()); },

    /* --- days (streak) --- */
    async markToday() {
      const date = new Date().toISOString().slice(0, 10);
      return tx("days", "readwrite", s => s.put({ date }));
    },
    async getAllDays()     { const db = await open(); return reqToPromise(db.transaction("days").objectStore("days").getAll()); },
    async clearDays()      { return tx("days", "readwrite", s => s.clear()); },

    /* --- toplu sıfırlama --- */
    async resetAll() {
      await this.clearCards();
      await this.clearExams();
      await this.clearDays();
      await this.clearBlocks();
      await this.clearAttempts();
      // ayarlar ve abonelik (kv) korunur — sadece ilerleme sıfırlanır
    },

    /* --- dışa/içe aktarma --- */
    async exportAll() {
      const [cards, exams, days, blocks] = await Promise.all([this.getAllCards(), this.getAllExams(), this.getAllDays(), this.getAllBlocks()]);
      const kvKeys = ["settings"];
      const kv = {};
      for (const k of kvKeys) kv[k] = await this.getKV(k);
      return { version: 2, exportedAt: new Date().toISOString(), cards, exams, days, blocks, kv };
    },
    async importAll(data) {
      if (!data || (data.version !== 1 && data.version !== 2)) throw new Error("Geçersiz yedek dosyası");
      await this.resetAll();
      if (data.cards && data.cards.length) await this.putCards(data.cards);
      if (data.exams) for (const e of data.exams) await this.addExam(e);
      if (data.days)  for (const d of data.days) await tx("days", "readwrite", s => s.put(d));
      if (data.blocks) for (const b of data.blocks) await this.putBlock(b);
      if (data.kv && data.kv.settings) await this.setKV("settings", data.kv.settings);
    }
  };
})();
