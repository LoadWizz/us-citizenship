/* =========================================================================
 * speech.js — Web Speech API: TTS (memur sesi) + STT (sesli cevap)
 * + göçmen-dostu esnek cevap eşleştirme (v2).
 *
 * EŞLEŞTİRME v2 İLKELERİ (5 Tem 2026 — Erkan geri bildirimi):
 *  - Kullanıcılar göçmen: aksan STT çıktısını bozar. Birebir kelime
 *    eşitliği yerine katmanlı tolerans: kök eşitliği (states=state) →
 *    harf hata payı (Levenshtein; constetution≈constitution).
 *  - Sayılar TEK biçime katlanır: "twenty-seven" = "twenty seven" = "27";
 *    "fourteenth" = "14th". (Eski sürümde S7 sesli cevabı HİÇ kabul
 *    edilmiyordu — kök neden buydu.)
 *  - Alt küme kabulü: "first president" ⊂ "First president of the United
 *    States" → kabul (USCIS memuru da kabul eder). Tek kelimelik cılız
 *    cevaplar ("president") çok-kelimeli hedefte kabul EDİLMEZ.
 *  - Hüküm kademeli: "tam" (temiz eşleşme) / "yakın" (hata payıyla kabul —
 *    UI telaffuz parlatma önerir) / eşleşme yok.
 *  - Yankı koruması eşleşme DENEMESİNDEN SONRA çalışır: cevap sorunun
 *    kelimelerini içeriyorsa (Supreme Court gibi) asla yankı sanılmaz.
 *  - Her hüküm App.logAttempt ile cihazda kaydedilir (zorluk analizi).
 * ========================================================================= */
"use strict";

const Speech = (() => {
  /* ---------- TTS ----------
   * Ses katmanı SOYUTLAMASI: speak() ileride kayıtlı insan sesi dosyalarıyla
   * (ElevenLabs + zaman damgası) değiştirilecek tek giriş noktasıdır.
   * onboundary: kelime sınırı olayı (karaoke); desteklenmeyen cihazlarda
   * hiç ateşlenmez — Karaoke modülü tahmini zamanlamaya düşer. */
  const ttsAvailable = "speechSynthesis" in window;
  const voiceByLang = { en: null, tr: null };

  function pickVoices() {
    if (!ttsAvailable) return;
    const voices = speechSynthesis.getVoices();
    voiceByLang.en =
      voices.find(v => v.lang === "en-US" && /Samantha|Google US|Alex|Aaron/i.test(v.name)) ||
      voices.find(v => v.lang === "en-US") ||
      voices.find(v => v.lang && v.lang.startsWith("en")) || null;
    voiceByLang.tr =
      voices.find(v => v.lang === "tr-TR" && /Yelda|Google/i.test(v.name)) ||
      voices.find(v => v.lang === "tr-TR") ||
      voices.find(v => v.lang && v.lang.startsWith("tr")) || null;
  }
  if (ttsAvailable) {
    pickVoices();
    speechSynthesis.onvoiceschanged = pickVoices;
  }

  function hasVoice(lang) { return !!voiceByLang[lang]; }

  /* Ses için metin: parantez İÇERİĞİ atılır — "Four (4) years" iki kez
   * okunmasın; "(U.S.) Constitution" sadece "Constitution" okunur. */
  function speakable(text) {
    return String(text || "").replace(/\([^)]*\)/g, " ").replace(/\s+/g, " ").trim();
  }

  function speak(text, { lang = "en", rate = 0.92, onend = null, onboundary = null, raw = false } = {}) {
    if (!ttsAvailable) { if (onend) onend(); return false; }
    /* Anadil sesi yoksa sessizce atla — görsel metin ekranda; zincir bozulmasın */
    if (lang !== "en" && !voiceByLang[lang]) { if (onend) onend(); return false; }
    const spoken = raw ? String(text) : speakable(text);
    if (!spoken) { if (onend) onend(); return false; }
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(spoken);
    u.lang = lang === "tr" ? "tr-TR" : "en-US";
    if (voiceByLang[lang]) u.voice = voiceByLang[lang];
    u.rate = rate;
    if (onend) u.onend = onend;
    if (onboundary) u.onboundary = onboundary;
    speechSynthesis.speak(u);
    return true;
  }

  /* Sıralı okuma. KURAL: her parçanın text'i KENDİ dilinde olmalı —
   * TR sesiyle İngilizce metin okutmak yasak (çağıran taraf filtreler).
   * Parça kendi rate'ini taşıyabilir (TR normal, EN yavaş). */
  function speakSequence(parts, opts = {}) {
    const list = parts.filter(p => p && p.text);
    const next = (i) => {
      if (i >= list.length) return;
      speak(list[i].text, { lang: list[i].lang, rate: list[i].rate || opts.rate, onend: () => next(i + 1) });
    };
    next(0);
  }

  function stopSpeaking() { if (ttsAvailable) speechSynthesis.cancel(); }
  function isSpeaking() { return ttsAvailable && (speechSynthesis.speaking || speechSynthesis.pending); }

  /* ---------- STT ---------- */
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition || null;
  const sttAvailable = !!SR;
  let activeRec = null;
  let micBlocked = false;
  let sttFailCount = 0;

  function micUsable() { return sttAvailable && !micBlocked && sttFailCount < 3; }

  function sttErrorMessage(err) {
    switch (err) {
      case "not-allowed":
      case "service-not-allowed":
        return "🎤 Mikrofon izni reddedilmiş. Tarayıcı Ayarları > Site izinleri > Mikrofon'dan izin ver, sonra sayfayı yenile.";
      case "network":
        return "Ses tanıma servisi ağa ulaşamadı — internet bağlantını kontrol et. (Samsung Internet kullanıyorsan: ses tanıma orada yok, uygulamayı Chrome ile aç.)";
      case "no-speech":
        return "Ses algılanamadı — cevabı yüksek sesle söyle.";
      case "audio-capture":
        return "Mikrofon bulunamadı — başka bir uygulama kullanıyor olabilir.";
      case "unsupported":
        return "Bu tarayıcı ses tanımayı desteklemiyor. En iyi deneyim: Android'de Chrome, iPhone'da Safari.";
      default:
        return "Ses tanıma çalışmadı — cevabı gösterip kendin işaretleyebilirsin.";
    }
  }

  function listen({ onResult, onError, onEnd }) {
    if (!sttAvailable) { if (onError) onError("unsupported"); return null; }
    stopSpeaking();   // mikrofon uygulamanın kendi sesini duymasın
    stopListening();
    const rec = new SR();
    rec.lang = "en-US";
    rec.interimResults = false;
    rec.maxAlternatives = 5;
    rec.onresult = (e) => {
      const alts = [];
      for (let i = 0; i < e.results[0].length; i++) alts.push(e.results[0][i].transcript);
      sttFailCount = 0;
      if (onResult) onResult(alts);
    };
    rec.onerror = (e) => {
      if (e.error === "not-allowed" || e.error === "service-not-allowed") micBlocked = true;
      else if (e.error !== "no-speech" && e.error !== "aborted") sttFailCount++;
      if (onError) onError(e.error);
    };
    rec.onend = () => { activeRec = null; if (onEnd) onEnd(); };
    activeRec = rec;
    rec.start();
    return rec;
  }

  function stopListening() {
    if (activeRec) { try { activeRec.stop(); } catch (_) {} activeRec = null; }
  }

  /* ================== Eşleştirme v2 ================== */

  const STOPWORDS = new Set([
    "the","a","an","of","to","in","on","for","and","or","is","are","was","were","be",
    "it","its","their","they","by","at","that","this","with","from","we","our","us",
    "he","she","his","her","because","there","so","have","has","had","can","will",
    "would","you","your","i","my","me","do","does","did"
  ]);

  const ONES  = { one:1, two:2, three:3, four:4, five:5, six:6, seven:7, eight:8, nine:9 };
  const TEENS = { ten:10, eleven:11, twelve:12, thirteen:13, fourteen:14, fifteen:15,
                  sixteen:16, seventeen:17, eighteen:18, nineteen:19 };
  const TENS  = { twenty:20, thirty:30, forty:40, fifty:50, sixty:60, seventy:70, eighty:80, ninety:90 };
  const ORD_ONES  = { first:1, second:2, third:3, fourth:4, fifth:5, sixth:6, seventh:7, eighth:8, ninth:9 };
  const ORD_TEENS = { tenth:10, eleventh:11, twelfth:12, thirteenth:13, fourteenth:14, fifteenth:15,
                      sixteenth:16, seventeenth:17, eighteenth:18, nineteenth:19 };
  const ORD_TENS  = { twentieth:20, thirtieth:30, fortieth:40, fiftieth:50 };

  function ordinal(n) {
    const m10 = n % 10, m100 = n % 100;
    const suf = (m100 >= 11 && m100 <= 13) ? "th" : m10 === 1 ? "st" : m10 === 2 ? "nd" : m10 === 3 ? "rd" : "th";
    return n + suf;
  }

  /* Sayı kelimelerini rakama katla: "twenty seven"→27, "four hundred thirty
   * five"→435, "one hundred"→100, "twenty second"→22nd, "fourteenth"→14th,
   * "ii"→2 (World War II). Rakam olanlar aynen geçer. */
  function foldNumbers(words) {
    const out = [];
    let i = 0;
    while (i < words.length) {
      const w = words[i];
      if (w === "ii") { out.push("2"); i++; continue; }
      if (w === "iii") { out.push("3"); i++; continue; }
      if (ORD_TEENS[w] !== undefined) { out.push(ordinal(ORD_TEENS[w])); i++; continue; }
      if (ORD_TENS[w] !== undefined) { out.push(ordinal(ORD_TENS[w])); i++; continue; }
      if (ORD_ONES[w] !== undefined) { out.push(ordinal(ORD_ONES[w])); i++; continue; }

      const isCard = ONES[w] !== undefined || TEENS[w] !== undefined || TENS[w] !== undefined;
      if (isCard) {
        let val = 0, j = i, ord = null;
        if (ONES[words[j]] !== undefined && words[j + 1] === "hundred") {
          val = ONES[words[j]] * 100; j += 2;
          if (TENS[words[j]] !== undefined) {
            val += TENS[words[j]]; j++;
            if (ONES[words[j]] !== undefined) { val += ONES[words[j]]; j++; }
            else if (ORD_ONES[words[j]] !== undefined) { val += ORD_ONES[words[j]]; ord = true; j++; }
          } else if (TEENS[words[j]] !== undefined) { val += TEENS[words[j]]; j++; }
          else if (ONES[words[j]] !== undefined) { val += ONES[words[j]]; j++; }
        } else if (TENS[w] !== undefined) {
          val = TENS[w]; j++;
          if (ONES[words[j]] !== undefined) { val += ONES[words[j]]; j++; }
          else if (ORD_ONES[words[j]] !== undefined) { val += ORD_ONES[words[j]]; ord = true; j++; }
        } else if (TEENS[w] !== undefined) { val = TEENS[w]; j++; }
        else { val = ONES[w]; j++; }
        out.push(ord ? ordinal(val) : String(val));
        i = j;
        continue;
      }
      out.push(w);
      i++;
    }
    return out;
  }

  /* Genel normalizasyon: küçük harf, noktalama/tire → boşluk, eş anlamlı
   * ("america" → "united states"), sayı katlaması. */
  function normalize(text) {
    let t = (text || "").toLowerCase()
      .replace(/[’']/g, "")
      .replace(/[.,!?;:"()\[\]\-–—\/]/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .replace(/\bamerica\b/g, "united states")
      .replace(/\busa\b/g, "united states")
      .replace(/\bu s\b/g, "united states")
      .replace(/\bd c\b/g, "dc");
    return foldNumbers(t.split(" ").filter(Boolean)).join(" ");
  }

  /* Hafif gövdeleme: sondaki iyelik/çoğul eki atılır (states→state).
   * İki taraf da aynı işlemden geçtiği için tutarlıdır. */
  function stem(w) {
    let s = w;
    if (s.endsWith("s") && s.length > 3 && !s.endsWith("ss") && !s.endsWith("us") && !s.endsWith("is")) s = s.slice(0, -1);
    return s;
  }

  function contentTokens(text) {
    return normalize(text).split(" ").filter(w => w && !STOPWORDS.has(w)).map(stem);
  }

  /* Damerau'suz Levenshtein — kısa kelimeler için yeterli, erken çıkışlı */
  function lev(a, b, max) {
    if (Math.abs(a.length - b.length) > max) return max + 1;
    const dp = new Array(b.length + 1);
    for (let j = 0; j <= b.length; j++) dp[j] = j;
    for (let i = 1; i <= a.length; i++) {
      let prev = dp[0]; dp[0] = i;
      let rowMin = dp[0];
      for (let j = 1; j <= b.length; j++) {
        const tmp = dp[j];
        dp[j] = Math.min(dp[j] + 1, dp[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
        prev = tmp;
        if (dp[j] < rowMin) rowMin = dp[j];
      }
      if (rowMin > max) return max + 1;
    }
    return dp[b.length];
  }

  /* Kelime eşitliği: 0 = eşleşmedi, 1 = tam (kök dahil), 2 = yakın (hata payı) */
  function tokenMatch(a, b) {
    if (a === b) return 1;
    const maxErr = a.length >= 8 ? 2 : a.length >= 5 ? 1 : 0;
    if (maxErr && lev(a, b, maxErr) <= maxErr) return 2;
    return 0;
  }

  /**
   * Esnek eşleştirme v2.
   * transcripts: STT alternatifleri (veya tek metin)
   * answers    : kabul edilen cevap metinleri
   * Dönen: { match, tier: "tam"|"yakın"|null, best: {answer, score}|null, heard }
   * Kabul kuralı (cevap başına):
   *  - normalize edilmiş cevap öbeği transkriptin içinde → tam
   *  - çekirdek kelime kapsaması ≥ %60  → kabul
   *  - VEYA kullanıcının söylediklerinin ≥ %80'i cevaba ait ve en az
   *    min(2, |cevap|) kelime eşleşti (alt küme kabulü) → kabul
   *  - herhangi bir eşleşme hata payıyla geldiyse hüküm "yakın"dır.
   */
  function matchAnswer(transcripts, answers) {
    const list = (Array.isArray(transcripts) ? transcripts : [transcripts]);
    const heard = list[0] || "";
    let best = null;

    for (const t of list) {
      const normT = normalize(t);
      const T = contentTokens(t);
      for (const ans of answers) {
        const core = ans.replace(/\([^)]*\)/g, " ");
        const normA = normalize(core);
        const A = contentTokens(core);
        if (!A.length) continue;

        /* kelime sınırlı öbek eşleşmesi ("constitution" ⊄ "constitutional") */
        if (normA && (" " + normT + " ").includes(" " + normA + " ")) {
          return { match: true, tier: "tam", best: { answer: ans, score: 1 }, heard };
        }
        if (!T.length) continue;

        let matched = 0, fuzzyUsed = false;
        for (const aw of A) {
          let hit = 0;
          for (const tw of T) {
            const m = tokenMatch(aw, tw);
            if (m > hit) hit = m;
            if (hit === 1) break;
          }
          if (hit) { matched++; if (hit === 2) fuzzyUsed = true; }
        }
        const coverage = matched / A.length;

        let tMatched = 0;
        for (const tw of T) {
          if (A.some(aw => tokenMatch(aw, tw) > 0)) tMatched++;
        }
        const precision = tMatched / T.length;

        const score = Math.max(coverage, precision * 0.9);
        if (!best || score > best.score) best = { answer: ans, score };

        const ok = coverage >= 0.6 || (precision >= 0.8 && matched >= Math.min(2, A.length));
        if (ok) {
          return { match: true, tier: fuzzyUsed ? "yakın" : "tam", best: { answer: ans, score }, heard };
        }
      }
    }
    return { match: false, tier: null, best, heard };
  }

  /* Yankı tespiti — YALNIZ eşleşme başarısız olduysa çağrılır.
   * Transkript ağırlıkla SORUYA özgü kelimelerden oluşuyorsa (cevaplarda
   * geçmeyen), mikrofon büyük ihtimalle sorunun sesini duymuştur. */
  function looksLikeEcho(questionText, transcript, answers) {
    const T = contentTokens(transcript);
    if (T.length < 3) return false;
    const Q = new Set(contentTokens(questionText));
    const Aall = new Set(answers.flatMap(a => contentTokens(a.replace(/\([^)]*\)/g, " "))));
    const qOnly = T.filter(w => Q.has(w) && !Aall.has(w));
    return qOnly.length / T.length >= 0.7;
  }

  /* Dikte karşılaştırması — kelime kelime fark listesi (İngilizce Testi) */
  function compareDictation(expected, typed) {
    const e = normalize(expected).split(" ").filter(Boolean);
    const t = normalize(typed).split(" ").filter(Boolean);
    const result = e.map((w, i) => ({ word: w, ok: t[i] === w }));
    const correct = result.filter(r => r.ok).length;
    return { words: result, extra: t.length - e.length, ratio: e.length ? correct / e.length : 0 };
  }

  /* Telaffuz çalışması için heceleme yaklaşımı: kelimeyi sesli okunuşa
   * yardım edecek parçalara böl (kaba sessiz-sesli sınırları). */
  function syllabify(word) {
    const m = word.toLowerCase().match(/[^aeiouy]*[aeiouy]+(?:[^aeiouy]*$)?/g);
    return (m && m.length > 1) ? m.join("·").toUpperCase() : word.toUpperCase();
  }

  return { ttsAvailable, sttAvailable, micUsable, sttErrorMessage, hasVoice,
           speak, speakSequence, stopSpeaking, isSpeaking, speakable,
           listen, stopListening,
           normalize, contentTokens, matchAnswer, looksLikeEcho, compareDictation, syllabify };
})();
