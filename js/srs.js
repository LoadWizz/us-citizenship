/* =========================================================================
 * srs.js — Aralıklı tekrar zamanlayıcısı (SM-2 tabanlı, FSRS tarzı 4 not)
 *
 * Kart durumu:
 *   { id, state: 'new'|'learning'|'review', step, ease, interval (gün),
 *     due (epoch ms), reps, lapses, seen, correct, wrong, introduced }
 *
 * Notlar (grade): 0=Again (Tekrar), 1=Hard (Zor), 2=Good (İyi), 3=Easy (Kolay)
 *   - Yanlış (Again) => kısa aralığa sıfırlanır, ease düşer
 *   - Doğru => aralık ease çarpanıyla büyür
 * ========================================================================= */
"use strict";

const SRS = (() => {
  const MIN_EASE = 1.3, MAX_EASE = 3.0;
  const LEARNING_STEPS_MS = [60 * 1000, 10 * 60 * 1000]; // 1 dk, 10 dk
  const DAY = 24 * 60 * 60 * 1000;
  const MAX_INTERVAL_DAYS = 365;
  const MATURE_DAYS = 21; // bu aralığın üstü "oturmuş" sayılır

  function newCard(id) {
    return {
      id, state: "new", step: 0, ease: 2.5, interval: 0, due: 0,
      reps: 0, lapses: 0, seen: 0, correct: 0, wrong: 0, introduced: 0
    };
  }

  /* küçük rastgele sapma — kartlar aynı güne yığılmasın */
  function fuzz(ms) { return ms * (0.95 + Math.random() * 0.10); }

  function grade(card, g, now = Date.now()) {
    const c = { ...card };
    c.seen++;
    c.reps++;
    if (!c.introduced) c.introduced = now;

    if (g === 0) { // Again — yanlış
      c.wrong++;
      c.lapses++;
      c.ease = Math.max(MIN_EASE, c.ease - 0.2);
      c.state = "learning";
      c.step = 0;
      c.interval = 0;
      c.due = now + LEARNING_STEPS_MS[0];
      return c;
    }

    c.correct++;

    if (c.state !== "review") { // new veya learning
      if (g === 1) { // Hard — aynı adımı tekrarla
        c.state = "learning";
        c.due = now + fuzz(LEARNING_STEPS_MS[Math.min(c.step, LEARNING_STEPS_MS.length - 1)]);
      } else if (g === 2) { // Good — sonraki adım / mezuniyet
        c.step = (c.state === "new") ? 1 : c.step + 1;
        if (c.step >= LEARNING_STEPS_MS.length) {
          c.state = "review"; c.interval = 1; c.due = now + fuzz(DAY);
        } else {
          c.state = "learning"; c.due = now + fuzz(LEARNING_STEPS_MS[c.step]);
        }
      } else { // Easy — doğrudan mezun, 3 gün
        c.state = "review"; c.interval = 3; c.due = now + fuzz(3 * DAY);
        c.ease = Math.min(MAX_EASE, c.ease + 0.15);
      }
      return c;
    }

    // review durumu — SM-2
    if (g === 1) {
      c.interval = Math.max(1, c.interval * 1.2);
      c.ease = Math.max(MIN_EASE, c.ease - 0.15);
    } else if (g === 2) {
      c.interval = Math.max(1, c.interval * c.ease);
    } else {
      c.interval = Math.max(2, c.interval * c.ease * 1.3);
      c.ease = Math.min(MAX_EASE, c.ease + 0.15);
    }
    c.interval = Math.min(MAX_INTERVAL_DAYS, c.interval);
    c.due = now + fuzz(c.interval * DAY);
    return c;
  }

  function isDue(card, now = Date.now()) {
    return card.state !== "new" && card.due <= now;
  }

  /* ustalık seviyesi — ısı haritası için */
  function masteryLevel(card) {
    if (!card || card.state === "new" || card.seen === 0) return 0; // hiç görülmedi
    if (card.state === "learning") return 1;                        // öğreniliyor
    if (card.interval < 7) return 2;                                // taze
    if (card.interval < MATURE_DAYS) return 3;                      // gelişiyor
    return 4;                                                       // oturmuş
  }

  /* Successive relearning kriteri (Rawson & Dunlosky 2011):
   * soru FARKLI İKİ GÜNDE İngilizce modda doğru cevaplanmışsa ustalaşmıştır.
   * enCorrectDays: ["YYYY-MM-DD", ...] — App.gradeCard EN modunda doldurur. */
  function isMastered(card) {
    return !!card && Array.isArray(card.enCorrectDays) && card.enCorrectDays.length >= 2;
  }

  /* zayıflık puanı — sınav ağırlıklandırması için (0..~3) */
  function weaknessScore(card) {
    if (!card || card.seen === 0) return 1.0; // hiç görülmemiş = orta öncelik
    const wrongRate = card.wrong / card.seen;
    const lapsePenalty = Math.min(1, card.lapses * 0.25);
    return wrongRate * 2 + lapsePenalty;
  }

  return { newCard, grade, isDue, masteryLevel, isMastered, weaknessScore, MATURE_DAYS };
})();
