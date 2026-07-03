/* =========================================================================
 * speech.js — Web Speech API: TTS (memur sesi) + STT (sesli cevap)
 * + USCIS tarzı esnek (fuzzy) cevap eşleştirme.
 * API yoksa zarifçe devre dışı kalır (dokunarak-göster akışına düşer).
 * ========================================================================= */
"use strict";

const Speech = (() => {
  /* ---------- TTS ---------- */
  const ttsAvailable = "speechSynthesis" in window;
  let voice = null;

  function pickVoice() {
    if (!ttsAvailable) return;
    const voices = speechSynthesis.getVoices();
    voice =
      voices.find(v => v.lang === "en-US" && /Samantha|Google US|Alex|Aaron/i.test(v.name)) ||
      voices.find(v => v.lang === "en-US") ||
      voices.find(v => v.lang && v.lang.startsWith("en")) || null;
  }
  if (ttsAvailable) {
    pickVoice();
    speechSynthesis.onvoiceschanged = pickVoice;
  }

  function speak(text, { rate = 0.92, onend = null } = {}) {
    if (!ttsAvailable) { if (onend) onend(); return false; }
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "en-US";
    if (voice) u.voice = voice;
    u.rate = rate;
    if (onend) u.onend = onend;
    speechSynthesis.speak(u);
    return true;
  }

  function stopSpeaking() { if (ttsAvailable) speechSynthesis.cancel(); }

  /* ---------- STT ---------- */
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition || null;
  const sttAvailable = !!SR;
  let activeRec = null;

  function listen({ onResult, onError, onEnd }) {
    if (!sttAvailable) { if (onError) onError("unsupported"); return null; }
    stopSpeaking();   // mikrofon uygulamanın kendi TTS sesini duymasın
    stopListening();
    const rec = new SR();
    rec.lang = "en-US";
    rec.interimResults = false;
    rec.maxAlternatives = 3;
    rec.onresult = (e) => {
      const alts = [];
      for (let i = 0; i < e.results[0].length; i++) alts.push(e.results[0][i].transcript);
      if (onResult) onResult(alts);
    };
    rec.onerror = (e) => { if (onError) onError(e.error); };
    rec.onend = () => { activeRec = null; if (onEnd) onEnd(); };
    activeRec = rec;
    rec.start();
    return rec;
  }

  function stopListening() {
    if (activeRec) { try { activeRec.stop(); } catch (_) {} activeRec = null; }
  }

  /* ---------- Esnek eşleştirme ---------- */
  const STOPWORDS = new Set(["the","a","an","of","to","in","on","for","and","or","is","are","was","were","be","it","its","their","they","by","at","that","this","with","from","we","our","us","he","she","his","her"]);

  const NUM_WORDS = {
    "one":"1","two":"2","three":"3","four":"4","five":"5","six":"6","seven":"7","eight":"8","nine":"9","ten":"10",
    "thirteen":"13","eighteen":"18","twenty":"20","twentyseven":"27","twenty-seven":"27","fifty":"50",
    "one hundred":"100","hundred":"100","four hundred thirty five":"435","four hundred thirty-five":"435",
    "first":"1st","second":"2nd","third":"3rd","fourth":"4th","tenth":"10th","fourteenth":"14th","fifteenth":"15th",
    "sixteenth":"16th","nineteenth":"19th","twenty second":"22nd","twenty-second":"22nd"
  };

  function normalize(text) {
    let t = (text || "").toLowerCase()
      .replace(/[’']/g, "")
      .replace(/[.,!?;:"()\[\]\-–—\/]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    // sayı kelimelerini rakama çevir (uzun kalıplar önce)
    const keys = Object.keys(NUM_WORDS).sort((a, b) => b.length - a.length);
    for (const k of keys) t = t.replace(new RegExp(`\\b${k}\\b`, "g"), NUM_WORDS[k]);
    return t;
  }

  /* Parantezli kısımları opsiyonel sayarak cevabın "çekirdek" tokenlarını çıkar */
  function answerTokens(answer) {
    const core = answer.replace(/\([^)]*\)/g, " ");          // parantez içi opsiyonel
    const norm = normalize(core);
    return norm.split(" ").filter(w => w && !STOPWORDS.has(w));
  }

  /**
   * USCIS memuru gibi esnek eşleştirme:
   *  - Kabul edilen cevaplardan herhangi birinin çekirdek kelimelerinin
   *    >= %60'ı (ve en az 1 içerik kelimesi) transkriptte geçiyorsa kabul.
   *  - Tam normalize edilmiş cevap transkriptin içinde geçiyorsa kesin kabul.
   * Dönen: { match: bool, best: {answer, score} | null }
   */
  function matchAnswer(transcripts, answers) {
    const texts = (Array.isArray(transcripts) ? transcripts : [transcripts]).map(normalize);
    let best = null;
    for (const ans of answers) {
      const normAns = normalize(ans.replace(/\([^)]*\)/g, " "));
      const tokens = answerTokens(ans);
      if (!tokens.length) continue;
      for (const t of texts) {
        if (normAns && t.includes(normAns)) {
          return { match: true, best: { answer: ans, score: 1 } };
        }
        const tWords = new Set(t.split(" "));
        const hit = tokens.filter(w => tWords.has(w)).length;
        const score = hit / tokens.length;
        if (!best || score > best.score) best = { answer: ans, score };
        if (score >= 0.6 && hit >= 1) {
          return { match: true, best: { answer: ans, score } };
        }
      }
    }
    return { match: false, best };
  }

  /* Dikte karşılaştırması — kelime kelime fark listesi döndürür */
  function compareDictation(expected, typed) {
    const e = normalize(expected).split(" ").filter(Boolean);
    const t = normalize(typed).split(" ").filter(Boolean);
    const result = e.map((w, i) => ({ word: w, ok: t[i] === w }));
    const correct = result.filter(r => r.ok).length;
    return { words: result, extra: t.length - e.length, ratio: e.length ? correct / e.length : 0 };
  }

  return { ttsAvailable, sttAvailable, speak, stopSpeaking, listen, stopListening, normalize, matchAnswer, compareDictation };
})();
