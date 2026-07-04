/* =========================================================================
 * speech.js — Web Speech API: TTS (memur sesi) + STT (sesli cevap)
 * + USCIS tarzı esnek (fuzzy) cevap eşleştirme.
 * API yoksa zarifçe devre dışı kalır (dokunarak-göster akışına düşer).
 * ========================================================================= */
"use strict";

const Speech = (() => {
  /* ---------- TTS ----------
   * Ses katmanı SOYUTLAMASI: speak() ileride kayıtlı insan sesi dosyalarıyla
   * (AudioProvider) değiştirilecek tek giriş noktasıdır — arayüz sabit kalır:
   * speak(text, {lang, rate, onend}). Şimdilik sistem TTS. */
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

  function speak(text, { lang = "en", rate = 0.92, onend = null } = {}) {
    if (!ttsAvailable) { if (onend) onend(); return false; }
    /* Anadil sesi yoksa (bazı cihazlarda tr-TR kurulu değil) sessizce atla —
     * görsel metin zaten ekranda; onend zinciri bozulmasın. */
    if (lang !== "en" && !voiceByLang[lang]) { if (onend) onend(); return false; }
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = lang === "tr" ? "tr-TR" : "en-US";
    if (voiceByLang[lang]) u.voice = voiceByLang[lang];
    u.rate = rate;
    if (onend) u.onend = onend;
    speechSynthesis.speak(u);
    return true;
  }

  /* Sıralı okuma: önce anadil, sonra İngilizce (bilingual kart akışı) */
  function speakSequence(parts, opts = {}) {
    const list = parts.filter(p => p && p.text);
    const next = (i) => {
      if (i >= list.length) return;
      speak(list[i].text, { lang: list[i].lang, rate: opts.rate, onend: () => next(i + 1) });
    };
    next(0);
  }

  function stopSpeaking() { if (ttsAvailable) speechSynthesis.cancel(); }

  /* ---------- STT ---------- */
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition || null;
  const sttAvailable = !!SR;
  let activeRec = null;
  let micBlocked = false;      // izin reddedildi → bu oturumda 🎤 gizlenir
  let sttFailCount = 0;        // art arda teknik hata → destek yok kabul et

  /* Mikrofon kullanılabilir mi? (API var + izin reddedilmedi + 3 kez üst üste çakılmadı) */
  function micUsable() { return sttAvailable && !micBlocked && sttFailCount < 3; }

  /* Hata kodu → kullanıcıya net Türkçe açıklama */
  function sttErrorMessage(err) {
    switch (err) {
      case "not-allowed":
      case "service-not-allowed":
        return "🎤 Mikrofon izni reddedilmiş. Tarayıcı Ayarları > Site izinleri > Mikrofon'dan izin ver, sonra sayfayı yenile.";
      case "network":
        return "Ses tanıma servisi ağa ulaşamadı — internet bağlantını kontrol et. (Samsung Internet kullanıyorsan: ses tanıma orada yok, uygulamayı Chrome ile aç.)";
      case "no-speech":
        return "Ses algılanamadı — 🎤'a bastıktan sonra cevabı yüksek sesle söyle.";
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
    stopSpeaking();   // mikrofon uygulamanın kendi TTS sesini duymasın
    stopListening();
    const rec = new SR();
    rec.lang = "en-US";
    rec.interimResults = false;
    rec.maxAlternatives = 3;
    rec.onresult = (e) => {
      const alts = [];
      for (let i = 0; i < e.results[0].length; i++) alts.push(e.results[0][i].transcript);
      sttFailCount = 0; // çalıştı — hata sayacını sıfırla
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

  return { ttsAvailable, sttAvailable, micUsable, sttErrorMessage, hasVoice, speak, speakSequence, stopSpeaking, listen, stopListening, normalize, matchAnswer, compareDictation };
})();
