/* =========================================================================
 * selfcheck.js — Veri bütünlüğü kendini-doğrulama testi.
 * Başlangıçta çalışır; sonuçlar konsola ve Ayarlar ekranına yazılır.
 * ========================================================================= */
"use strict";

const SelfCheck = (() => {
  const EXPECTED_STARS = [2, 7, 12, 20, 30, 36, 38, 39, 44, 52, 61, 66, 74, 78, 86, 94, 113, 115, 121, 126];

  function run() {
    const results = [];
    const ok = (name, pass, detail = "") => results.push({ name, pass, detail });

    // 1) Tam 128 soru
    ok("Soru sayısı = 128", QUESTIONS.length === 128, `bulunan: ${QUESTIONS.length}`);

    // 2) ID'ler 1..128, benzersiz ve sıralı
    const ids = QUESTIONS.map(q => q.id);
    const uniq = new Set(ids);
    ok("ID'ler benzersiz (128)", uniq.size === 128, `benzersiz: ${uniq.size}`);
    let seq = true;
    for (let i = 0; i < 128; i++) if (ids[i] !== i + 1) { seq = false; break; }
    ok("ID'ler 1-128 sıralı", seq);

    // 3) Yıldızlı (65/20) liste kontrolü — tam 20 ve resmi listeyle birebir
    const stars = QUESTIONS.filter(q => q.star).map(q => q.id);
    ok("Yıldızlı soru sayısı = 20", stars.length === 20, `bulunan: ${stars.length}`);
    const starsMatch = stars.length === EXPECTED_STARS.length && stars.every((v, i) => v === EXPECTED_STARS[i]);
    ok("Yıldızlı liste resmi listeyle eşleşiyor", starsMatch, `[${stars.join(", ")}]`);

    // 4) Her sorunun cevabı var (kişiselleştirilmişler settings'ten gelir)
    const noAnswer = QUESTIONS.filter(q => q.a.length === 0 && !q.pers).map(q => q.id);
    ok("Her sorunun cevabı mevcut", noAnswer.length === 0, noAnswer.length ? `eksik: ${noAnswer.join(",")}` : "");

    // 5) Her soruda Türkçe açıklama + hafıza kancası
    const noTr = QUESTIONS.filter(q => !q.tr || !q.hook).map(q => q.id);
    ok("Türkçe açıklama + kanca tam", noTr.length === 0, noTr.length ? `eksik: ${noTr.join(",")}` : "");

    // 6) Dinamik soru etiketleri
    const dyn = QUESTIONS.filter(q => q.dyn).map(q => q.id);
    const dynExpected = [23, 29, 30, 38, 39, 57, 61, 62];
    ok("Dinamik soru etiketleri doğru", dyn.length === dynExpected.length && dyn.every((v, i) => v === dynExpected[i]), `[${dyn.join(", ")}]`);

    // 7) Kategori aralıkları
    const catCheck =
      QUESTIONS.slice(0, 15).every(q => q.cat === "GOV_A") &&
      QUESTIONS.slice(15, 62).every(q => q.cat === "GOV_B") &&
      QUESTIONS.slice(62, 72).every(q => q.cat === "GOV_C") &&
      QUESTIONS.slice(72, 89).every(q => q.cat === "HIST_A") &&
      QUESTIONS.slice(89, 99).every(q => q.cat === "HIST_B") &&
      QUESTIONS.slice(99, 118).every(q => q.cat === "HIST_C") &&
      QUESTIONS.slice(118, 124).every(q => q.cat === "SYM") &&
      QUESTIONS.slice(124, 128).every(q => q.cat === "HOL");
    ok("Kategori aralıkları doğru", catCheck);

    // 8) Sınav matematiği: 12/20 geçme eşiği
    const pass12 = examPassed(12, 20) === true;
    const fail11 = examPassed(11, 20) === false;
    const pass20 = examPassed(20, 20) === true;
    ok("Sınav matematiği (12/20 geçer, 11/20 kalır)", pass12 && fail11 && pass20);

    // 9) SRS temel akışı
    let srsOk = true;
    try {
      let c = SRS.newCard(1);
      c = SRS.grade(c, 2); // Good -> learning
      srsOk = srsOk && c.state === "learning";
      c = SRS.grade(c, 2); // Good -> review 1 gün
      srsOk = srsOk && c.state === "review" && c.interval === 1;
      const before = c.interval;
      c = SRS.grade(c, 2); // Good -> aralık büyür
      srsOk = srsOk && c.interval > before;
      c = SRS.grade(c, 0); // Again -> sıfırlanır
      srsOk = srsOk && c.state === "learning" && c.lapses === 1;
    } catch (e) { srsOk = false; }
    ok("SRS zamanlayıcı testi", srsOk);

    const passed = results.filter(r => r.pass).length;
    const summary = { results, passed, total: results.length, allPass: passed === results.length };

    console.group("%c[US Citizenship] Kendini-doğrulama", "font-weight:bold");
    for (const r of results) {
      console.log(`${r.pass ? "✅" : "❌"} ${r.name}${r.detail ? " — " + r.detail : ""}`);
    }
    console.log(`Sonuç: ${passed}/${results.length}`);
    console.groupEnd();

    return summary;
  }

  /* Sınav geçme kuralı — tek gerçek kaynak */
  function examPassed(correct, total = 20) {
    return correct >= 12;
  }

  return { run, examPassed };
})();
