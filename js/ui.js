/* =========================================================================
 * ui.js — DOM yardımcıları, hash yönlendirici, toast, ortak bileşenler
 * ========================================================================= */
"use strict";

const UI = (() => {
  /* Kısa element oluşturucu: h('div', {class:'x', onclick:fn}, child1, ...) */
  function h(tag, attrs = {}, ...children) {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (v === null || v === undefined || v === false) continue;
      if (k.startsWith("on") && typeof v === "function") el.addEventListener(k.slice(2), v);
      else if (k === "class") el.className = v;
      else if (k === "html") el.innerHTML = v;
      else if (k === "style" && typeof v === "object") Object.assign(el.style, v);
      else el.setAttribute(k, v === true ? "" : v);
    }
    for (const c of children.flat(Infinity)) {
      if (c === null || c === undefined || c === false) continue;
      el.appendChild(typeof c === "string" || typeof c === "number" ? document.createTextNode(String(c)) : c);
    }
    return el;
  }

  function esc(s) {
    return String(s).replace(/[&<>"']/g, m => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]));
  }

  /* ---------- toast ---------- */
  let toastTimer = null;
  function toast(msg, ms = 2400) {
    let t = document.getElementById("toast");
    if (!t) {
      t = h("div", { id: "toast" });
      document.body.appendChild(t);
    }
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove("show"), ms);
  }

  /* ---------- yönlendirici ---------- */
  const routes = {};
  let currentRoute = null;

  function register(path, view) { routes[path] = view; }

  async function navigate(path) {
    if (location.hash !== "#" + path) { location.hash = "#" + path; return; }
    await renderRoute();
  }

  async function renderRoute() {
    const path = (location.hash || "#/home").slice(1);
    const view = routes[path] || routes["/home"];
    currentRoute = path;
    Speech.stopSpeaking();
    Speech.stopListening();
    const main = document.getElementById("view");
    main.innerHTML = "";
    main.scrollTop = 0;
    document.querySelectorAll(".navbtn").forEach(b => {
      const r = b.getAttribute("data-route");
      const isMore = r === "more";
      const moreRoutes = ["/english", "/interview", "/settings", "/billing", "/paywall"];
      b.classList.toggle("active", r === path || (isMore && moreRoutes.includes(path)));
    });
    closeSheet();
    await view.render(main);
    window.scrollTo(0, 0);
  }

  /* ---------- alt menü (Daha) ---------- */
  function openSheet() {
    document.getElementById("sheet").classList.add("open");
    document.getElementById("sheet-backdrop").classList.add("open");
  }
  function closeSheet() {
    const s = document.getElementById("sheet");
    if (s) { s.classList.remove("open"); document.getElementById("sheet-backdrop").classList.remove("open"); }
  }

  /* ---------- ortak parçalar ---------- */
  function dynBadge() {
    return h("div", { class: "badge badge-warn" },
      "⚠️ Cevap değişebilir — mülakattan önce ",
      h("a", { href: TESTUPDATES_URL, target: "_blank", rel: "noopener" }, "uscis.gov/citizenship/testupdates"),
      " kontrol et");
  }

  function starBadge() {
    return h("span", { class: "badge badge-star", title: "65/20 yıldızlı soru" }, "★ CORE — en yüksek çıkma olasılığı");
  }

  function catBadge(cat) {
    const c = CATEGORIES[cat];
    return h("span", { class: "badge badge-cat", style: { background: c.color + "22", color: c.color } }, c.short);
  }

  function progressRing(pct, size = 120, stroke = 10, label = "") {
    const r = (size - stroke) / 2, circ = 2 * Math.PI * r;
    const off = circ * (1 - Math.max(0, Math.min(1, pct)));
    const svg = `
      <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
        <circle cx="${size/2}" cy="${size/2}" r="${r}" fill="none" stroke="var(--ring-bg)" stroke-width="${stroke}"/>
        <circle cx="${size/2}" cy="${size/2}" r="${r}" fill="none" stroke="var(--accent)" stroke-width="${stroke}"
          stroke-linecap="round" stroke-dasharray="${circ}" stroke-dashoffset="${off}"
          transform="rotate(-90 ${size/2} ${size/2})"/>
        <text x="50%" y="47%" text-anchor="middle" dominant-baseline="central" class="ring-num">${Math.round(pct*100)}%</text>
        <text x="50%" y="64%" text-anchor="middle" class="ring-label">${esc(label)}</text>
      </svg>`;
    return h("div", { class: "ring", html: svg });
  }

  function fmtDate(d) {
    return new Date(d).toLocaleDateString("tr-TR", { day: "numeric", month: "short", year: "numeric" });
  }

  /* Sade cevap kartı — "göstererek anlat" ilkesi:
   * EN KOLAY cevap kocaman ve renkli (soru ipucusuyla aynı kategori rengi),
   * altında tek satır Türkçe karşılığı; diğer kabul edilenler küçük ve sönük.
   * Etiket/jargon yok. Tüm görünümler (çalış/sınav/blok) bunu kullanır. */
  function answerCard(q, { natLang = null } = {}) {
    const pairs = Lang.answerPairs(q, App.settings.officials, natLang);
    const heroes = pairs.filter(p => p.best);
    const heroList = heroes.length ? heroes : pairs;      // best yoksa hepsi hero
    const others = heroes.length ? pairs.filter(p => !p.best) : [];

    return h("div", { class: "card acard" },
      heroList.map(p => h("div", { class: "answer-hero" },
        h("div", { class: `hero-text cue-${q.cat}`, lang: "en" }, p.en),
        p.nat ? h("div", { class: "hero-nat", lang: "tr" }, p.nat) : null)),
      others.length ? h("div", { class: "answer-others" },
        h("div", { class: "others-label" }, "Bunlar da kabul edilir:"),
        h("ul", { class: "others-list", lang: "en" },
          others.map(p => h("li", {}, p.en)))) : null,
      q.dyn ? dynBadge() : null,
      q.note ? h("div", { class: "anote muted small" }, "ℹ️ " + q.note) : null);
  }

  /* Hayalet dokunuş koruması: yeni çizilen aksiyon alanını kısa süre kilitle.
   * Bir önceki ekranda aynı noktaya denk gelen dokunuşun ikinci yarısının
   * yeni butonu tetiklemesini engeller. */
  function tapGuard(el, ms = 450) {
    if (!el) return el;
    el.style.pointerEvents = "none";
    setTimeout(() => { el.style.pointerEvents = ""; }, ms);
    return el;
  }

  return { h, esc, toast, register, navigate, renderRoute, openSheet, closeSheet, dynBadge, starBadge, catBadge, progressRing, fmtDate, tapGuard, answerCard };
})();
