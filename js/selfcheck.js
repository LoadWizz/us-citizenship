/* =========================================================================
 * selfcheck.js — Veri ve mantık bütünlüğü kendini-doğrulama.
 * Başlangıçta çalışır; sonuçlar konsola ve Ayarlar ekranına yazılır.
 * Kapsam: 128 soru, yıldızlı 20, dinamik 8, ipucu benzersizliği, TR paketi,
 * blok bölüşümü, %85 mühür matematiği, 12/20 sınav matematiği, SRS,
 * (yüklüyse) entitlement kapıları.
 * ========================================================================= */
"use strict";

const SelfCheck = (() => {
  const EXPECTED_STARS = [2, 7, 12, 20, 30, 36, 38, 39, 44, 52, 61, 66, 74, 78, 86, 94, 113, 115, 121, 126];
  const EXPECTED_DYN = [23, 29, 30, 38, 39, 57, 61, 62];
  /* TR cevap çevirisi null olabilecek sorular: özel isimler / ayarlardan gelenler */
  const TR_NULL_OK = [23, 29, 30, 38, 39, 57, 61, 62, 78, 81, 83, 99, 117, 123];

  const norm = s => s.toLowerCase()
    .replace(/[‘’']/g, "")
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/ +/g, " ")
    .trim();

  function run() {
    const results = [];
    const ok = (name, pass, detail = "") => results.push({ name, pass, detail });

    /* ---------- 1) Soru bankası ---------- */
    ok("Soru sayısı = 128", QUESTIONS.length === 128, `bulunan: ${QUESTIONS.length}`);
    const ids = QUESTIONS.map(q => q.id);
    ok("ID'ler benzersiz ve 1-128 sıralı",
       new Set(ids).size === 128 && ids.every((v, i) => v === i + 1));

    const stars = QUESTIONS.filter(q => q.star).map(q => q.id);
    ok("Yıldızlı 20 resmi listeyle birebir",
       stars.length === 20 && stars.every((v, i) => v === EXPECTED_STARS[i]), `[${stars.join(",")}]`);

    const dyn = QUESTIONS.filter(q => q.dyn).map(q => q.id);
    ok("Dinamik soru etiketleri doğru",
       dyn.length === EXPECTED_DYN.length && dyn.every((v, i) => v === EXPECTED_DYN[i]));

    ok("Her sorunun cevabı mevcut",
       QUESTIONS.every(q => q.a.length > 0 || q.pers));
    ok("Türkçe açıklama + kanca tam",
       QUESTIONS.every(q => q.tr && q.hook));

    /* ---------- 2) İpucu (cue) bütünlüğü ---------- */
    let cueMissing = [], cueNotSub = [], cueNotUniq = [];
    for (const q of QUESTIONS) {
      const cue = CUES[q.id];
      if (!cue) { cueMissing.push(q.id); continue; }
      if (!q.q.includes(cue)) cueNotSub.push(q.id);
      const nCue = norm(cue);
      const hits = QUESTIONS.filter(x => (" " + norm(x.q) + " ").includes(" " + nCue + " "));
      if (hits.length !== 1 || hits[0].id !== q.id) cueNotUniq.push(q.id);
    }
    ok("Her soruda ipucu (cue) var", cueMissing.length === 0, cueMissing.join(","));
    ok("İpucu soru metninin birebir parçası", cueNotSub.length === 0, cueNotSub.join(","));
    ok("İpucu 128 bankada BENZERSİZ (cue overload yok)", cueNotUniq.length === 0, cueNotUniq.join(","));

    /* ---------- 3) Türkçe dil paketi ---------- */
    let trFail = [];
    for (const q of QUESTIONS) {
      const t = LANG_TR[q.id];
      if (!t || !t.q || !t.q.trim()) { trFail.push(q.id + ":q"); continue; }
      if (!t.cue || !t.q.includes(t.cue)) trFail.push(q.id + ":cue");
      if (t.a === null) {
        if (!TR_NULL_OK.includes(q.id)) trFail.push(q.id + ":null?");
      } else if (!Array.isArray(t.a) || t.a.length !== q.a.length || t.a.some(x => !x || !x.trim())) {
        trFail.push(q.id + ":a");
      }
    }
    ok("TR paketi tam (soru+ipucu+paralel cevaplar)", trFail.length === 0, trFail.slice(0, 8).join(","));

    /* ---------- 3b) "En kolay cevap" küratörlüğü ---------- */
    let bestFail = [];
    for (const q of QUESTIONS) {
      const b = BEST_ANSWERS[q.id];
      const multi = q.a.length > 1 && !q.pers;
      if (multi && !b) bestFail.push(q.id + ":eksik");
      if (!multi && b) bestFail.push(q.id + ":gereksiz");
      if (b && (!Array.isArray(b) || b.some(i => !Number.isInteger(i) || i < 0 || i >= q.a.length)))
        bestFail.push(q.id + ":indeks");
      if (b && new Set(b).size !== b.length) bestFail.push(q.id + ":tekrar");
    }
    ok("En kolay cevap seti tam ve geçerli (çok cevaplı 128 alt kümesi)", bestFail.length === 0, bestFail.slice(0, 8).join(","));

    /* ---------- 4) Kategori aralıkları ---------- */
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

    /* ---------- 5) Blok bölüşümü ---------- */
    const allBlockIds = BLOCKS.flatMap(b => b.ids);
    const blockSet = new Set(allBlockIds);
    ok("Bloklar 128 soruyu tam ve çakışmasız bölüyor",
       allBlockIds.length === 128 && blockSet.size === 128 &&
       ids.every(id => blockSet.has(id)),
       `toplam: ${allBlockIds.length}, benzersiz: ${blockSet.size}`);
    ok("Blok 1 = resmi yıldızlı 20",
       BLOCKS[0].ids.length === 20 && BLOCKS[0].ids.every((v, i) => v === EXPECTED_STARS[i]));

    /* ---------- 6) Mühür matematiği (%85, ceil) ---------- */
    const thrOk =
      Blocks.passNeed(20) === 17 && Blocks.passNeed(19) === 17 &&
      Blocks.passNeed(18) === 16 && Blocks.passNeed(17) === 15 &&
      Blocks.passNeed(16) === 14 &&
      Blocks.passed(17, 20) === true && Blocks.passed(16, 20) === false;
    ok("Blok/mühür eşiği doğru (ceil %85)", thrOk);

    /* ---------- 7) Deneme sınavı matematiği (12/20) ---------- */
    ok("Sınav matematiği (12/20 geçer, 11/20 kalır)",
       examPassed(12, 20) === true && examPassed(11, 20) === false && examPassed(20, 20) === true);

    /* ---------- 8) SRS + successive relearning ---------- */
    let srsOk = true;
    try {
      let c = SRS.newCard(1);
      c = SRS.grade(c, 2);
      srsOk = srsOk && c.state === "learning";
      c = SRS.grade(c, 2);
      srsOk = srsOk && c.state === "review" && c.interval === 1;
      const before = c.interval;
      c = SRS.grade(c, 2);
      srsOk = srsOk && c.interval > before;
      c = SRS.grade(c, 0);
      srsOk = srsOk && c.state === "learning" && c.lapses === 1;
      /* ustalık: 2 farklı gün EN doğru */
      srsOk = srsOk && !SRS.isMastered({ enCorrectDays: ["2026-01-01"] });
      srsOk = srsOk && SRS.isMastered({ enCorrectDays: ["2026-01-01", "2026-01-03"] });
    } catch (e) { srsOk = false; }
    ok("SRS + ustalık (2 farklı gün EN) testi", srsOk);

    /* ---------- 9) Entitlement kapıları (modül yüklüyse) ---------- */
    if (typeof Entitlements !== "undefined") {
      try {
        const gateOk =
          Entitlements.planHas("free", "full_blocks") === false &&
          Entitlements.planHas("free", "ai_coach") === false &&
          Entitlements.planHas("prep", "full_blocks") === true &&
          Entitlements.planHas("prep", "ai_coach") === false &&
          Entitlements.planHas("pro", "full_blocks") === true &&
          Entitlements.planHas("pro", "ai_coach") === true &&
          Entitlements.planHas("lifetime", "ai_coach") === true;
        ok("Entitlement plan kapıları doğru", gateOk);
        const expOk =
          Entitlements.isActive({ plan: "pro", expiresAt: Date.now() + 86400000 }) === true &&
          Entitlements.isActive({ plan: "pro", expiresAt: Date.now() - 8 * 86400000 }) === false &&
          Entitlements.isActive({ plan: "pro", expiresAt: Date.now() - 86400000 }) === true; // 7 gün grace
        ok("Entitlement süre + çevrimdışı grace mantığı", expOk);
      } catch (e) { ok("Entitlement testi", false, e.message); }
    }

    const passed = results.filter(r => r.pass).length;
    const summary = { results, passed, total: results.length, allPass: passed === results.length };

    console.group("%c[US Citizenship] Kendini-doğrulama", "font-weight:bold");
    for (const r of results) console.log(`${r.pass ? "✅" : "❌"} ${r.name}${r.detail ? " — " + r.detail : ""}`);
    console.log(`Sonuç: ${passed}/${results.length}`);
    console.groupEnd();

    return summary;
  }

  /* Deneme sınavı geçme kuralı — tek gerçek kaynak */
  function examPassed(correct, total = 20) {
    return correct >= 12;
  }

  return { run, examPassed };
})();
