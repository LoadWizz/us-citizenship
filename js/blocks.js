/* =========================================================================
 * blocks.js — 7 blok + iki kapılı mühür (mastery learning)
 *
 * BİLİMSEL TEMEL:
 *  - Mastery learning (Bloom 1968): bir birim ≥%85 başarıyla geçilmeden
 *    ilerlenmez → kalıcılık belirgin artar.
 *  - İki kapı: (1) blok sınavı (kullanıcının dil modunda), (2) İNGİLİZCE
 *    MÜHRÜ (salt İngilizce). Gerekçe: kodlama-geri getirme uyumu /
 *    transfer-appropriate processing — gerçek sınav İngilizce ve sözlüdür;
 *    anadil desteğiyle geçmek yeterli sayılmaz.
 *  - Blok sınavı her seferinde KARIŞIK sırada (sıra ezberini önler).
 *  - Kümülatif karma quiz (interleaving, Rohrer & Taylor 2007): yeni blok
 *    açıldıkça önceki bloklardan karışık tekrar.
 *  - Successive relearning (Rawson & Dunlosky 2011): bir soru ancak FARKLI
 *    İKİ GÜNDE İngilizce modda doğru cevaplanınca "ustalaşmış" sayılır.
 *
 * Durum makinesi: locked → learning → test_passed → sealed
 * ========================================================================= */
"use strict";

const BLOCKS = [
  { id: 1, name: "Çekirdek", icon: "★",  desc: "Resmi yıldızlı 20 soru — 65/20 alt kümesi. Buradan başla.",
    ids: [2, 7, 12, 20, 30, 36, 38, 39, 44, 52, 61, 66, 74, 78, 86, 94, 113, 115, 121, 126] },
  { id: 2, name: "Anayasa & İlkeler", icon: "📜", desc: "Anayasa, Bağımsızlık Bildirgesi ve temel ilkeler.",
    ids: [1, 3, 4, 5, 6, 8, 9, 10, 11, 13, 14, 15, 16, 37, 60, 63, 82, 97] },
  { id: 3, name: "Kongre", icon: "🏛️", desc: "Senato, Temsilciler Meclisi, süreler ve sayılar.",
    ids: [18, 19, 21, 22, 23, 24, 25, 26, 27, 28, 29, 31, 32, 33, 34, 35] },
  { id: 4, name: "Başkan & Yargı", icon: "⚖️", desc: "Yürütme, Kabine, mahkemeler ve yetkileri.",
    ids: [17, 40, 41, 42, 43, 45, 46, 47, 48, 49, 50, 51, 53, 54, 55, 56, 57] },
  { id: 5, name: "Haklar & Semboller", icon: "🗽", desc: "Haklar, görevler, bayrak, bayramlar ve semboller.",
    ids: [58, 59, 62, 64, 65, 67, 68, 69, 70, 71, 72, 119, 120, 122, 123, 124, 125, 127, 128] },
  { id: 6, name: "Kuruluş & 1800'ler", icon: "🕰️", desc: "Koloni dönemi, devrim, kurucu babalar, İç Savaş.",
    ids: [73, 75, 76, 77, 79, 80, 81, 83, 84, 85, 87, 88, 89, 90, 91, 92, 93, 95, 96, 99] },
  { id: 7, name: "Yakın Tarih", icon: "🌐", desc: "Dünya savaşları, Soğuk Savaş, sivil haklar, 9/11.",
    ids: [98, 100, 101, 102, 103, 104, 105, 106, 107, 108, 109, 110, 111, 112, 114, 116, 117, 118] }
];

const Blocks = (() => {
  const PASS_RATIO = 0.85;

  function byId(id) { return BLOCKS.find(b => b.id === id) || null; }
  function ofQuestion(qid) { return BLOCKS.find(b => b.ids.includes(qid)) || null; }
  function questions(block) { return block.ids.map(id => QUESTIONS.find(q => q.id === id)); }

  /* ≥%85 için gereken doğru sayısı */
  function passNeed(n) { return Math.ceil(n * PASS_RATIO); }
  function passed(correct, n) { return correct >= passNeed(n); }

  function defaultState(blockId) {
    return { blockId, status: blockId === 1 ? "learning" : "locked",
             bestTest: null, bestSeal: null, sealedAt: null };
  }

  /* --- durum erişimi (DB 'blocks' deposu) --- */
  async function getAllStates() {
    const rows = await DB.getAllBlocks();
    const map = new Map(rows.map(r => [r.blockId, r]));
    for (const b of BLOCKS) if (!map.has(b.id)) map.set(b.id, defaultState(b.id));
    return map;
  }

  async function getState(blockId) {
    return (await getAllStates()).get(blockId);
  }

  /* Sınav sonucu işle: mode 'test' (kullanıcı dil modu) | 'seal' (salt EN).
   * Dönen: güncellenmiş durum + ne değişti bilgisi. */
  async function recordResult(blockId, mode, correct, total) {
    const states = await getAllStates();
    const st = { ...states.get(blockId) };
    const ok = passed(correct, total);
    const rec = { score: correct, total, date: new Date().toISOString(), passed: ok };
    let unlockedNext = false, sealedNow = false;

    if (mode === "seal") {
      if (!st.bestSeal || correct > st.bestSeal.score) st.bestSeal = rec;
      if (ok && st.status !== "sealed") {
        st.status = "sealed";
        st.sealedAt = rec.date;
        sealedNow = true;
      }
    } else {
      if (!st.bestTest || correct > st.bestTest.score) st.bestTest = rec;
      if (ok && st.status === "learning") st.status = "test_passed";
    }
    await DB.putBlock(st);

    /* Mühürlenince sonraki blok açılır */
    if (sealedNow) {
      const next = states.get(blockId + 1);
      if (next && next.status === "locked") {
        const n2 = { ...next, status: "learning" };
        await DB.putBlock(n2);
        unlockedNext = true;
      }
    }
    return { state: st, passed: ok, sealedNow, unlockedNext };
  }

  /* EN-only modda blok sınavı geçilirse iki kapı tek seferde kapanır:
   * test kaydı + mühür kaydı birlikte işlenir. */
  async function recordEnModeResult(blockId, correct, total) {
    await recordResult(blockId, "test", correct, total);
    return recordResult(blockId, "seal", correct, total);
  }

  /* Aktif blok: sıradaki mühürlenmemiş, kilidi açık blok */
  async function current() {
    const states = await getAllStates();
    for (const b of BLOCKS) {
      const st = states.get(b.id);
      if (st.status !== "sealed" && st.status !== "locked") return b;
    }
    return null; // hepsi mühürlü
  }

  /* Karma quiz havuzu: mühürlenmiş blokların soruları (zayıflık ağırlıklı örnekleme çağıran yapar) */
  async function sealedQuestionIds() {
    const states = await getAllStates();
    return BLOCKS.filter(b => states.get(b.id).status === "sealed").flatMap(b => b.ids);
  }

  /* Blok içi ustalık özeti (successive relearning: 2 farklı gün EN doğru) */
  function masteryOf(block, cardsMap) {
    let mastered = 0, seen = 0;
    for (const id of block.ids) {
      const c = cardsMap.get(id);
      if (c && c.seen > 0) seen++;
      if (c && SRS.isMastered(c)) mastered++;
    }
    return { mastered, seen, total: block.ids.length };
  }

  return { byId, ofQuestion, questions, passNeed, passed, defaultState,
           getAllStates, getState, recordResult, recordEnModeResult,
           current, sealedQuestionIds, masteryOf, PASS_RATIO };
})();
