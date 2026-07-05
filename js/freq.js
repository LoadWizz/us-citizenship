/* =========================================================================
 * freq.js — Sorulma olasılığı ve kaldıraç (leverage) katmanı
 *
 * ARAŞTIRMA BULGUSU (4 Tem 2026, METHODOLOGY.md "Olasılık katmanı"):
 *  - USCIS Politika El Kitabı (Cilt 12-E-2): sınav soruları USCIS
 *    SİSTEMİNCE RASTGELE seçilir; memur hazır listeden okur. Yani
 *    "memurun favori sorusu" diye resmî bir kanal YOK — her sorunun
 *    çekilme olasılığı ~eşittir (20/128 ≈ %16).
 *  - Tek resmî öncelik listesi: 65/20 yıldızlı 20 soru — USCIS'in kendi
 *    "çekirdek bilgi" seçkisi (65 yaş + 20 yıl GC sahiplerine yalnız
 *    bunlar sorulur; 10 soru, 6 doğru, istediği dilde).
 *  - Sınav 12 doğruda (veya 9 yanlışta) durur → strateji "hangi soru
 *    gelecek"i tahmin etmek değil, EN AZ EMEKLE EN ÇOK SORUYU
 *    cevaplayabilir hale gelmektir.
 *
 * Bu yüzden model 3 katman:
 *  1) STAR  — USCIS'in resmî çekirdek 20'si (Blok 1).
 *  2) KALDIRAÇ — tek bir ezber birden çok soruyu açar:
 *     answer-kümeleri (aynı cevap kelimesi kelimesine birden çok soruda
 *     kabul) + theme-kümeleri (tek hikâye birden çok soruyu anlatır).
 *  3) KOLAY KAZANÇ — tek cevaplı kısa sorular önce: 12 doğru tabanını
 *     hızla kurar (sınav erken biter, riskli sorulara sıra gelmez).
 *
 * rankOf(q): yeni kart TANITIM sırasını belirler (yüksek → önce).
 * NOTES[id]: ÖĞRET kartında gösterilen tek satırlık kaldıraç notu
 *            (insan dili — küme/etiket jargonu YOK).
 * ========================================================================= */
"use strict";

const FREQ = (() => {
  /* type "answer": kabul edilen cevap metni tüm üyelerde AYNI çekirdeği
   * içerir (selfcheck doğrular). type "theme": tek hikâye/karşıtlık. */
  const CLUSTERS = [
    { key: "president", type: "answer", core: "President",
      ids: [42, 43, 44, 45, 46],
      note: "Tek cevap beş soruyu açar: orduyu komuta eden, yasayı imzalayan, veto eden, yargıç atayan hep aynı kişi — The President." },

    { key: "declaration", type: "answer", core: "Declaration of Independence",
      ids: [9, 11, 14, 80],
      note: "\"Declaration of Independence\" cevabı dört ayrı soruda kabul ediliyor — bu ismi söylemek çoğu zaman yeterli." },

    { key: "civilwar", type: "answer", core: "Civil War",
      ids: [91, 92, 96],
      note: "\"The Civil War\" üç sorunun cevabı: 1800'lerin savaşı, Kuzey-Güney savaşı ve köleliği bitiren savaş — hepsi aynı savaş." },

    { key: "communism", type: "answer", core: "communism",
      ids: [110, 111],
      note: "Kore ve Vietnam'ın cevabı kelimesi kelimesine aynı: \"To stop the spread of communism.\"" },

    { key: "freedslaves", type: "answer", core: "Freed the slaves",
      ids: [94, 95],
      note: "Lincoln sorusunun da Emancipation sorusunun da cevabı aynı üç kelime: \"Freed the slaves.\"" },

    { key: "requiredbylaw", type: "answer", core: "Required by law",
      ids: [71, 72],
      note: "Vergi de Selective Service de aynı cevapla geçer: \"Required by law.\"" },

    { key: "officials", type: "theme", core: null,
      ids: [23, 29, 30, 38, 39, 57, 61, 62],
      note: "Ayarlar'daki güncel isimler bu sorunun cevabıdır — 9 isim ezberle, 8 soru cebinde. Mülakat haftası isimleri doğrula." },

    { key: "jefferson", type: "theme", core: null,
      ids: [78, 87],
      note: "Jefferson'ı bir kez öğren: \"Bildirgeyi kim yazdı?\" ve \"Jefferson neyle ünlü?\" aynı bilginin iki yüzü." },

    { key: "coldwar", type: "theme", core: null,
      ids: [108, 109],
      note: "Soğuk Savaş çifti: rakip Soviet Union, korku communism — ikisi birlikte tek hikâye." },

    { key: "voting", type: "theme", core: null,
      ids: [63, 98, 102],
      note: "Oy hakkı zinciri: erkekler 1870, kadınlar 1920, bugün 18 yaş ve üzeri her vatandaş." },

    { key: "flagpair", type: "theme", core: null,
      ids: [121, 122],
      note: "Bayrak çifti: ÇİZGİ = 13 koloni, YILDIZ = 50 eyalet. Çizgiler eski, yıldızlar bugünkü Amerika." },

    { key: "memorialveterans", type: "theme", core: null,
      ids: [127, 128],
      note: "Karıştırma tuzağı: Memorial Day ÖLEN askerler, Veterans Day HİZMET ETMİŞ herkes (yaşayanlar dahil)." },

    { key: "wwii", type: "theme", core: null,
      ids: [105, 106, 107],
      note: "Tek hikâye: Pearl Harbor'la savaşa girildi, başkan Roosevelt'ti, general Eisenhower'dı." },

    { key: "documents1776", type: "theme", core: null,
      ids: [79, 82],
      note: "İki tarih yeter: 1776 Bildirge (Declaration), 1787 Anayasa (Constitution)." }
  ];

  /* id → not (bir soru birden çok kümedeyse İLK küme kazanır — tek satır) */
  const NOTES = {};
  for (const c of CLUSTERS) {
    for (const id of c.ids) if (!(id in NOTES)) NOTES[id] = c.note;
  }

  /* id → answer-küme boyutu (kaldıraç puanı için) */
  const ANSWER_SIZE = {};
  for (const c of CLUSTERS) {
    if (c.type !== "answer") continue;
    for (const id of c.ids) ANSWER_SIZE[id] = Math.max(ANSWER_SIZE[id] || 0, c.ids.length);
  }

  /* Tanıtım önceliği: yüksek puan önce öğretilir.
   *  star       +3  (USCIS resmî çekirdek)
   *  dyn        +2  (Ayarlar'dan hazır cevap — bedava puan, taze tutulmalı)
   *  kaldıraç   +(küme boyutu - 1, en çok 3)
   *  tek cevap  +1  (kolay kazanç: seçim yükü yok) */
  function rankOf(q) {
    let r = 0;
    if (q.star) r += 3;
    if (q.dyn) r += 2;
    if (ANSWER_SIZE[q.id]) r += Math.min(3, ANSWER_SIZE[q.id] - 1);
    if (!q.dyn && q.a.length === 1) r += 1;
    return r;
  }

  /* Yeni kart havuzunu tanıtım sırasına koyar (rank azalan, eşitse id artan).
   * Girdi dizisini DEĞİŞTİRMEZ. */
  function orderNew(questions) {
    return [...questions].sort((a, b) => rankOf(b) - rankOf(a) || a.id - b.id);
  }

  function noteOf(id) { return NOTES[id] || null; }

  return { CLUSTERS, NOTES, ANSWER_SIZE, rankOf, orderNew, noteOf };
})();
