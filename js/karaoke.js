/* =========================================================================
 * karaoke.js — Kelime takipli sesli okuma ("şerit" efekti)
 *
 * Kullanım:
 *   const k = Karaoke.line(metin, { cue, cat });   // k.el DOM'a eklenir
 *   Karaoke.play(k, { lang, rate, onend });
 *
 * Zamanlama iki modlu:
 *  1) TTS kelime-sınırı olayı (onboundary) geliyorsa BİREBİR takip.
 *  2) Gelmiyorsa (Android Chrome'da yaygın) uzunluk-ağırlıklı TAHMİN;
 *     gerçek onend geldiğinde şerit tamamlanır — sapma görünmez.
 *  İleride ElevenLabs kayıtları karakter zaman damgalarıyla gömüldüğünde
 *  aynı API birebir zamanlamayla çalışacak (tek değişecek şey sürücü).
 *
 * Parantez kuralı: "(U.S.) Constitution" gibi metinlerde parantez içi
 * SESTE OKUNMAZ (Speech.speakable) — bu kelimeler şeritte baştan soluk
 * gösterilir, vurgu yalnız okunan kelimelerde ilerler.
 * ========================================================================= */
"use strict";

const Karaoke = (() => {

  /* Metni kelime kutucuklarına böl. cue verilirse o aralıktaki kelimeler
   * kategori rengini korur (Von Restorff vurgusu karaokeyle birleşir). */
  function line(text, { cue = null, cat = null } = {}) {
    const el = UI.h("div", { class: "kara-line" });
    let cueStart = -1, cueEnd = -1;
    if (cue) {
      const i = text.indexOf(cue);
      if (i >= 0) { cueStart = i; cueEnd = i + cue.length; }
    }
    /* parantez aralıklarını işaretle (seste atlanır) */
    const silentRanges = [];
    const pr = /\([^)]*\)/g;
    let pm;
    while ((pm = pr.exec(text))) silentRanges.push([pm.index, pm.index + pm[0].length]);
    const inSilent = (s, e) => silentRanges.some(([a, b]) => s >= a && e <= b);

    const words = [];
    const re = /\S+/g;
    let m;
    while ((m = re.exec(text))) {
      const start = m.index, end = m.index + m[0].length;
      words.push({
        w: m[0], start,
        silent: inSilent(start, end),
        inCue: cueStart >= 0 && start < cueEnd && end > cueStart
      });
    }

    const spans = words.map(x =>
      UI.h("span", { class: "kara-word" + (x.inCue ? ` cue cue-${cat}` : "") + (x.silent ? " kara-silent" : "") }, x.w));
    spans.forEach((s, i) => { el.appendChild(s); if (i < spans.length - 1) el.appendChild(document.createTextNode(" ")); });

    /* okunan (sessiz olmayan) kelimeler + okunan metindeki karakter başlangıçları */
    const spoken = [];
    let cursor = 0;
    words.forEach((x, i) => {
      if (x.silent) return;
      spoken.push({ idx: i, charStart: cursor });
      cursor += x.w.length + 1;
    });

    return { el, spans, words, spoken, text, playing: false, timers: [], done: false };
  }

  function reset(k) {
    k.timers.forEach(clearTimeout);
    k.timers = [];
    k.playing = false;
    k.spans.forEach(s => s.classList.remove("kara-now", "kara-up", "kara-done"));
  }

  function markUpTo(k, spokenIdx) {
    k.spans.forEach((s, i) => s.classList.remove("kara-now"));
    for (let si = 0; si < k.spoken.length; si++) {
      const span = k.spans[k.spoken[si].idx];
      span.classList.remove("kara-up", "kara-done", "kara-now");
      if (si < spokenIdx) span.classList.add("kara-done");
      else if (si === spokenIdx) span.classList.add("kara-now");
      else span.classList.add("kara-up");
    }
  }

  function finish(k, onend) {
    reset(k);
    k.spans.forEach((s, i) => { if (!k.words[i].silent) s.classList.add("kara-done"); });
    k.done = true;
    if (onend) onend();
  }

  function play(k, { lang = "en", rate = 0.92, onend = null } = {}) {
    reset(k);
    if (!k.spoken.length) { if (onend) onend(); return; }
    k.playing = true;

    /* okunan kelimelerin tahmini süreleri (uzunluk-ağırlıklı) */
    const durOf = (w) => {
      let d = (170 + 60 * w.replace(/[^a-z0-9]/gi, "").length) / rate;
      if (/[.,;:!?]$/.test(w)) d += 240;
      return d;
    };

    let boundarySeen = false;

    /* Mod 1: gerçek kelime sınırı olayları */
    const onboundary = (e) => {
      if (e.name && e.name !== "word") return;
      if (!boundarySeen) { boundarySeen = true; k.timers.forEach(clearTimeout); k.timers = []; }
      const ci = e.charIndex || 0;
      let si = 0;
      for (let i = 0; i < k.spoken.length; i++) if (k.spoken[i].charStart <= ci) si = i;
      markUpTo(k, si);
    };

    const started = Speech.speak(k.text, {
      lang, rate,
      onboundary,
      onend: () => { if (k.playing) finish(k, onend); }
    });
    if (!started) { finish(k, onend); return; }

    /* Mod 2: tahmini şerit (boundary gelmezse devreye zaten girmiş olur) */
    let t = 60;
    k.spoken.forEach((sp, si) => {
      k.timers.push(setTimeout(() => { if (!boundarySeen && k.playing) markUpTo(k, si); }, t));
      t += durOf(k.words[sp.idx].w);
    });
    /* güvenlik: onend kaçarsa tahmini toplamın %60 fazlasında bitir */
    k.timers.push(setTimeout(() => { if (!boundarySeen && k.playing && !k.done) finish(k, onend); }, t * 1.6 + 800));
  }

  function stop(k) {
    if (!k) return;
    Speech.stopSpeaking();
    reset(k);
  }

  return { line, play, stop };
})();
