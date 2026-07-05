/* =========================================================================
 * lang.js — Dil katmanı API'si
 *
 * Mimari: EN içerik data.js'te sabittir (sınav dili). Her ek dil bir
 * "paket"tir: LANG_PACKS[kod] = { id: {q, cue, a|null} }. İspanyolca için
 * lang-es.js aynı şablonla eklenir ve buraya kaydedilir — başka değişiklik
 * gerekmez.
 *
 * Görsel ipucu (cue) vurgusu:
 *  - Soru metni önce HTML-escape edilir, sonra ipucu öbeği
 *    <span class="cue cue-KATEGORI"> ile sarılır (Von Restorff: yalnız
 *    ipucu ayrışır, başka hiçbir kelime boyanmaz).
 * ========================================================================= */
"use strict";

const Lang = (() => {
  const PACKS = { tr: (typeof LANG_TR !== "undefined") ? LANG_TR : {} };
  if (typeof LANG_ES !== "undefined") PACKS.es = LANG_ES;

  function esc(s) {
    return String(s).replace(/[&<>"']/g, m => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]));
  }

  function pack(code) { return PACKS[code] || null; }

  function native(q, code) {
    const p = pack(code);
    return p ? p[q.id] || null : null;
  }

  /* Metin + ipucu → güvenli HTML (ipucu vurgulu). İpucu bulunamazsa düz metin. */
  function highlight(text, cue, cat) {
    if (!cue) return esc(text);
    let idx = text.indexOf(cue);
    if (idx === -1) {
      const li = text.toLowerCase().indexOf(cue.toLowerCase());
      if (li === -1) return esc(text);
      idx = li;
    }
    const before = text.slice(0, idx);
    const hit = text.slice(idx, idx + cue.length);
    const after = text.slice(idx + cue.length);
    return esc(before) + `<span class="cue cue-${esc(cat)}">` + esc(hit) + "</span>" + esc(after);
  }

  /* İngilizce soru HTML'i (ipucu vurgulu) */
  function qHTMLEn(q) {
    return highlight(q.q, (typeof CUES !== "undefined" ? CUES[q.id] : null), q.cat);
  }

  /* Anadil soru HTML'i (ipucu vurgulu) — paket yoksa null */
  function qHTMLNative(q, code) {
    const n = native(q, code);
    if (!n || !n.q) return null;
    return highlight(n.q, n.cue, q.cat);
  }

  /* Cevap çiftleri: [{en, nat|null, best}] — EN her zaman esas (sınav dili).
   * nat yalnızca paket dizisi EN diziyle paralelse eşlenir.
   * best: bu cevap "en kolay ezber seti"nde (best.js küratörlüğü) —
   * yalnız çok cevaplı sorularda işaretlenir, renkli vurgulanır. */
  function answerPairs(q, officials, code) {
    const en = effectiveAnswers(q, officials);
    const n = code ? native(q, code) : null;
    const natArr = (n && Array.isArray(n.a) && !q.pers && n.a.length === q.a.length) ? n.a : null;
    const bestIdx = (typeof BEST_ANSWERS !== "undefined" && !q.pers) ? BEST_ANSWERS[q.id] || null : null;
    return en.map((ans, i) => ({
      en: ans,
      nat: natArr && q.a[i] === ans ? natArr[i] : null,
      best: !!(bestIdx && q.a[i] === ans && bestIdx.includes(i))
    }));
  }

  /* Sesli okumada önce ezber seti: önerilen cevap(lar) varsa onları oku */
  function speakableAnswers(q, officials) {
    const pairs = answerPairs(q, officials, null);
    const best = pairs.filter(p => p.best).map(p => p.en);
    return best.length ? best : pairs.map(p => p.en);
  }

  return { pack, native, highlight, qHTMLEn, qHTMLNative, answerPairs, speakableAnswers, esc };
})();
