/* =========================================================================
 * mnemo.js — Öğreten mini diyagramlar (soyut sorular için görsel mnemonik)
 *
 * İLKE ("göstererek anlat" + Mayer tutarlılık ilkesi): süs yok; her diyagram
 * cevabı AYIRT EDEN yapıyı çizer (13 çizgi vs 50 yıldız, 2-4-6 yıl, 9 koltuk
 * 5 oy, oy hakkı zaman çizgisi...). Metin yalnız sayı/tarih ve cevabın
 * İngilizce çekirdek kelimesi olabilir — iç jargon asla.
 *
 * Not (4 Tem 2026): AI görsel yerine el yapımı SVG bilinçli tercihtir —
 * ağ maliyeti sıfır (satır içi), tema-uyumlu (CSS değişkenleri), ve
 * karşıtlık çiftlerinde (Memorial/Veterans, 1776/1787) aynı diyagram iki
 * soruda ilgili yarıyı vurgulayarak kullanılır (kaldıraç ilkesiyle tutarlı).
 *
 * API: MNEMO.of(id) → { svg, alt } | null
 * ========================================================================= */
"use strict";

const MNEMO = (() => {
  const W = (inner, alt) =>
    `<svg viewBox="0 0 240 120" role="img" aria-label="${alt}" xmlns="http://www.w3.org/2000/svg">${inner}</svg>`;

  /* --- 3 erk: tek çatı, üç sütun (15, 16) --- */
  const branches = W(`
    <path d="M120 6 L232 38 H8 Z" fill="var(--border)"/>
    <rect x="16" y="106" width="208" height="8" rx="3" fill="var(--border)"/>
    <rect x="42" y="48" width="28" height="52" rx="5" fill="#3b82f6"/>
    <rect x="106" y="48" width="28" height="52" rx="5" fill="#6366f1"/>
    <rect x="170" y="48" width="28" height="52" rx="5" fill="#06b6d4"/>
    <text x="56" y="94" text-anchor="middle" font-size="11" font-weight="800" fill="#fff">L</text>
    <text x="120" y="94" text-anchor="middle" font-size="11" font-weight="800" fill="#fff">E</text>
    <text x="184" y="94" text-anchor="middle" font-size="11" font-weight="800" fill="#fff">J</text>`,
    "Tek çatı altında üç sütun: yasama, yürütme, yargı");

  /* --- Kongre'nin iki kanadı: 100 + 435 (19, 21, 24, 27) --- */
  const congress = W(`
    <path d="M104 44 A16 16 0 0 1 136 44 Z" fill="var(--border)"/>
    <rect x="112" y="44" width="16" height="60" fill="var(--border)"/>
    <rect x="14" y="52" width="86" height="52" rx="9" fill="#06b6d4"/>
    <rect x="140" y="52" width="86" height="52" rx="9" fill="#3b82f6"/>
    <text x="57" y="74" text-anchor="middle" font-size="12" font-weight="700" fill="#fff">Senate</text>
    <text x="57" y="94" text-anchor="middle" font-size="18" font-weight="800" fill="#fff">100</text>
    <text x="183" y="74" text-anchor="middle" font-size="12" font-weight="700" fill="#fff">House</text>
    <text x="183" y="94" text-anchor="middle" font-size="18" font-weight="800" fill="#fff">435</text>`,
    "Kongre'nin iki kanadı: Senato 100 üye, Temsilciler Meclisi 435 üye");

  /* --- Görev süreleri 2-4-6 (22, 25, 36) --- */
  const terms = W(`
    <text x="30" y="32" text-anchor="end" font-size="20" font-weight="800" fill="var(--text)">2</text>
    <rect x="40" y="16" width="60" height="22" rx="6" fill="#3b82f6"/>
    <text x="108" y="32" font-size="12" font-weight="700" fill="var(--text)">House</text>
    <text x="30" y="70" text-anchor="end" font-size="20" font-weight="800" fill="var(--text)">4</text>
    <rect x="40" y="54" width="120" height="22" rx="6" fill="#6366f1"/>
    <text x="168" y="70" font-size="12" font-weight="700" fill="var(--text)">President</text>
    <text x="30" y="108" text-anchor="end" font-size="20" font-weight="800" fill="var(--text)">6</text>
    <rect x="40" y="92" width="180" height="22" rx="6" fill="#06b6d4"/>
    <text x="130" y="108" text-anchor="middle" font-size="12" font-weight="700" fill="#fff">Senator</text>`,
    "Görev süreleri: Meclis üyesi 2 yıl, Başkan 4 yıl, Senatör 6 yıl");

  /* --- Yüksek Mahkeme: 9 koltuk, 5'i karar çoğunluğu (53, 54) --- */
  const court = (() => {
    let seats = "";
    for (let i = 0; i < 9; i++) {
      const x = 24 + i * 24;
      seats += i < 5
        ? `<circle cx="${x}" cy="52" r="10" fill="#06b6d4"/>`
        : `<circle cx="${x}" cy="52" r="10" fill="none" stroke="var(--border)" stroke-width="3"/>`;
    }
    return W(`
      <rect x="8" y="70" width="224" height="10" rx="4" fill="var(--border)"/>
      ${seats}
      <text x="120" y="106" text-anchor="middle" font-size="16" font-weight="800" fill="var(--text)">5 / 9</text>`,
      "Yüksek Mahkeme kürsüsünde 9 koltuk; karar için 5'i yeterli");
  })();

  /* --- 27 değişiklik: parşömen (7) --- */
  const amend = W(`
    <rect x="78" y="14" width="84" height="92" rx="8" fill="#fef3c7" stroke="#f59e0b" stroke-width="2"/>
    <rect x="70" y="8" width="100" height="12" rx="6" fill="#f59e0b"/>
    <rect x="70" y="100" width="100" height="12" rx="6" fill="#f59e0b"/>
    <text x="120" y="72" text-anchor="middle" font-size="38" font-weight="800" fill="#92400e">27</text>`,
    "Parşömen üzerinde 27: Anayasa'daki değişiklik sayısı");

  /* --- Bayrak: 13 çizgi vurgulu (121) --- */
  const flag13 = (() => {
    let stripes = "";
    const h = 96 / 13;
    for (let i = 0; i < 13; i++)
      stripes += `<rect x="24" y="${10 + i * h}" width="192" height="${h}" fill="${i % 2 ? "#f8fafc" : "#B22234"}"/>`;
    return W(`
      ${stripes}
      <rect x="24" y="10" width="78" height="${h * 7}" fill="var(--border)" opacity="0.85"/>
      <rect x="24" y="10" width="192" height="96" fill="none" stroke="var(--border)" stroke-width="2" rx="2"/>
      <text x="160" y="76" text-anchor="middle" font-size="34" font-weight="800" fill="#B22234" stroke="#f8fafc" stroke-width="1">13</text>`,
      "Bayrakta 13 çizgi vurgulu: 13 kurucu koloni");
  })();

  /* --- Bayrak: 50 yıldız vurgulu (122) --- */
  const flag50 = (() => {
    let stripes = "";
    const h = 96 / 13;
    for (let i = 0; i < 13; i++)
      stripes += `<rect x="24" y="${10 + i * h}" width="192" height="${h}" fill="var(--border)" opacity="${i % 2 ? 0.35 : 0.6}"/>`;
    let stars = "";
    for (let r = 0; r < 9; r++) {
      const n = r % 2 ? 5 : 6;
      for (let c = 0; c < n; c++)
        stars += `<circle cx="${31 + c * 12.4 + (r % 2 ? 6.2 : 0)}" cy="${15.5 + r * 5.4}" r="1.7" fill="#f8fafc"/>`;
    }
    return W(`
      ${stripes}
      <rect x="24" y="10" width="78" height="${h * 7}" fill="#3C3B6E"/>
      ${stars}
      <rect x="24" y="10" width="192" height="96" fill="none" stroke="var(--border)" stroke-width="2" rx="2"/>
      <text x="160" y="76" text-anchor="middle" font-size="34" font-weight="800" fill="#3C3B6E" stroke="#f8fafc" stroke-width="1">50</text>`,
      "Bayrakta 50 yıldız vurgulu: 50 eyalet");
  })();

  /* --- Oy hakkı zaman çizgisi (63, 98, 102) --- */
  const vote = W(`
    <line x1="16" y1="60" x2="216" y2="60" stroke="var(--border)" stroke-width="4" stroke-linecap="round"/>
    <path d="M216 52 L232 60 L216 68 Z" fill="var(--border)"/>
    <circle cx="52" cy="60" r="9" fill="#f97316"/>
    <circle cx="122" cy="60" r="9" fill="#ef4444"/>
    <circle cx="192" cy="60" r="9" fill="#06b6d4"/>
    <text x="52" y="38" text-anchor="middle" font-size="15" font-weight="800" fill="var(--text)">1870</text>
    <text x="122" y="38" text-anchor="middle" font-size="15" font-weight="800" fill="var(--text)">1920</text>
    <text x="192" y="38" text-anchor="middle" font-size="15" font-weight="800" fill="var(--text)">18+</text>
    <text x="52" y="92" text-anchor="middle" font-size="16" fill="var(--text)">♂</text>
    <text x="122" y="92" text-anchor="middle" font-size="16" fill="var(--text)">♀</text>
    <text x="192" y="92" text-anchor="middle" font-size="12" font-weight="700" fill="var(--text)">herkes</text>`,
    "Oy hakkı zinciri: 1870 erkekler, 1920 kadınlar, bugün 18 yaş üzeri herkes");

  /* --- Memorial / Veterans karşıtlık çifti (127, 128) --- */
  const memvet = (hi) => W(`
    <g opacity="${hi === "mem" ? 1 : 0.3}">
      <path d="M36 96 V46 A26 26 0 0 1 88 46 V96 Z" fill="var(--border)"/>
      <rect x="24" y="96" width="76" height="8" rx="3" fill="var(--border)"/>
      <line x1="62" y1="42" x2="62" y2="66" stroke="#ef4444" stroke-width="4" stroke-linecap="round"/>
      <line x1="50" y1="52" x2="74" y2="52" stroke="#ef4444" stroke-width="4" stroke-linecap="round"/>
      <text x="62" y="118" text-anchor="middle" font-size="12" font-weight="700" fill="var(--text)">Memorial</text>
    </g>
    <g opacity="${hi === "vet" ? 1 : 0.3}">
      <path d="M166 30 H190 L184 58 H172 Z" fill="#3b82f6"/>
      <circle cx="178" cy="74" r="20" fill="#f59e0b"/>
      <circle cx="178" cy="74" r="12" fill="#fef3c7"/>
      <text x="178" y="79" text-anchor="middle" font-size="13" font-weight="800" fill="#92400e">★</text>
      <text x="178" y="118" text-anchor="middle" font-size="12" font-weight="700" fill="var(--text)">Veterans</text>
    </g>`,
    hi === "mem"
      ? "Memorial Day vurgulu: görevde ölen askerleri anma (mezar taşı)"
      : "Veterans Day vurgulu: hizmet etmiş herkesi onurlandırma (madalya)");

  /* --- 1776 / 1787 belge çifti (79, 82) --- */
  const docs = (hi) => {
    const scroll = (x, year, name, color, on) => `
      <g opacity="${on ? 1 : 0.3}">
        <rect x="${x}" y="20" width="84" height="66" rx="7" fill="#fef3c7" stroke="${color}" stroke-width="${on ? 3 : 2}"/>
        <text x="${x + 42}" y="52" text-anchor="middle" font-size="20" font-weight="800" fill="${color}">${year}</text>
        <text x="${x + 42}" y="70" text-anchor="middle" font-size="9.5" font-weight="700" fill="#92400e">${name}</text>
        <text x="${x + 42}" y="108" text-anchor="middle" font-size="11" font-weight="700" fill="var(--text)">${year === "1776" ? "bağımsızlık" : "anayasa"}</text>
      </g>`;
    return W(
      scroll(18, "1776", "Declaration", "#d97706", hi === "1776") +
      `<path d="M112 52 L128 52 M122 46 L128 52 L122 58" stroke="var(--border)" stroke-width="3" fill="none" stroke-linecap="round"/>` +
      scroll(138, "1787", "Constitution", "#6366f1", hi === "1787"),
      hi === "1776"
        ? "1776 Bağımsızlık Bildirgesi vurgulu (1787 Anayasa soluk)"
        : "1787 Anayasa vurgulu (1776 Bildirge soluk)");
  };

  /* --- Hukukun üstünlüğü: taç yasanın ALTINDA (13) --- */
  const law = W(`
    <rect x="24" y="34" width="192" height="26" rx="8" fill="#06b6d4"/>
    <text x="120" y="52" text-anchor="middle" font-size="15" font-weight="800" fill="#fff">LAW</text>
    <path d="M96 96 L100 74 L112 86 L120 70 L128 86 L140 74 L144 96 Z" fill="#f59e0b"/>
    <rect x="94" y="94" width="52" height="8" rx="3" fill="#d97706"/>`,
    "Taç bile yasa çizgisinin altında: kimse yasanın üstünde değil");

  /* --- Başkanlık devri: Başkan → Yardımcısı (40) --- */
  const succession = W(`
    <g opacity="0.35">
      <rect x="30" y="34" width="52" height="14" rx="5" fill="var(--text)"/>
      <rect x="30" y="48" width="14" height="46" rx="5" fill="var(--text)"/>
      <rect x="30" y="84" width="52" height="12" rx="5" fill="var(--text)"/>
    </g>
    <path d="M100 64 L140 64 M132 56 L140 64 L132 72" stroke="var(--border)" stroke-width="5" fill="none" stroke-linecap="round"/>
    <rect x="158" y="34" width="52" height="14" rx="5" fill="#3b82f6"/>
    <rect x="196" y="48" width="14" height="46" rx="5" fill="#3b82f6"/>
    <rect x="158" y="84" width="52" height="12" rx="5" fill="#3b82f6"/>
    <text x="184" y="26" text-anchor="middle" font-size="12" font-weight="800" fill="var(--text)">VP</text>`,
    "Başkan koltuğu boşalırsa görev Başkan Yardımcısı'na geçer");

  const MAP = {
    7:   { svg: amend,          alt: null },
    13:  { svg: law,            alt: null },
    15:  { svg: branches,       alt: null },
    16:  { svg: branches,       alt: null },
    19:  { svg: congress,       alt: null },
    21:  { svg: congress,       alt: null },
    22:  { svg: terms,          alt: null },
    24:  { svg: congress,       alt: null },
    25:  { svg: terms,          alt: null },
    36:  { svg: terms,          alt: null },
    40:  { svg: succession,     alt: null },
    53:  { svg: court,          alt: null },
    54:  { svg: court,          alt: null },
    63:  { svg: vote,           alt: null },
    79:  { svg: docs("1776"),   alt: null },
    82:  { svg: docs("1787"),   alt: null },
    98:  { svg: vote,           alt: null },
    102: { svg: vote,           alt: null },
    121: { svg: flag13,         alt: null },
    122: { svg: flag50,         alt: null },
    127: { svg: memvet("mem"),  alt: null },
    128: { svg: memvet("vet"),  alt: null }
  };

  function of(id) { return MAP[id] || null; }

  return { of, MAP };
})();
