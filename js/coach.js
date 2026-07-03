/* =========================================================================
 * coach.js — Sınav sonrası Claude koçu.
 * API anahtarı IndexedDB'de saklanır, sadece api.anthropic.com'a gönderilir.
 * Anahtar yoksa uygulama tamamen çevrimdışı çalışmaya devam eder.
 * ========================================================================= */
"use strict";

const Coach = (() => {
  const API_URL = "https://api.anthropic.com/v1/messages";
  const DEFAULT_MODEL = "claude-sonnet-4-6";

  /**
   * Sınav performans özetini Claude'a gönderir; Türkçe koçluk JSON'u döndürür:
   * { zaaflar: [], oncelikli_konular: [], calisma_plani: "", motivasyon: "" }
   */
  async function getCoaching({ apiKey, model, examResult, history, cards }) {
    if (!apiKey) return null;

    const wrongOnes = examResult.items.filter(i => !i.correct).map(i => {
      const q = QUESTIONS.find(x => x.id === i.id);
      return { no: i.id, soru: q ? q.q : "?", kategori: q ? CATEGORIES[q.cat].short : "?" };
    });

    const catStats = {};
    for (const it of examResult.items) {
      const q = QUESTIONS.find(x => x.id === it.id);
      if (!q) continue;
      const key = CATEGORIES[q.cat].short;
      catStats[key] = catStats[key] || { dogru: 0, yanlis: 0 };
      it.correct ? catStats[key].dogru++ : catStats[key].yanlis++;
    }

    const weakCards = (cards || [])
      .filter(c => c.seen > 0)
      .map(c => ({ no: c.id, yanlisOrani: +(c.wrong / c.seen).toFixed(2), gorulme: c.seen }))
      .filter(c => c.yanlisOrani > 0.2)
      .sort((a, b) => b.yanlisOrani - a.yanlisOrani)
      .slice(0, 15);

    const prevExams = (history || []).slice(-5).map(e => ({ tarih: e.date, puan: `${e.score}/${e.total}`, gecti: e.passed }));

    const summary = {
      sinav: { puan: `${examResult.score}/${examResult.total}`, gecti: examResult.passed, kategoriDagilimi: catStats, yanlisSorular: wrongOnes },
      gecmisSinavlar: prevExams,
      zayifKartlar: weakCards
    };

    const prompt =
`Sen bir ABD vatandaşlık sınavı (2025 USCIS civics test, 128 soru, 20 sorudan 12 doğru = geçer) koçusun. Öğrenci Türkçe konuşuyor ve Chattanooga, Tennessee'de yaşıyor.

Aşağıda öğrencinin deneme sınavı performansı var:
${JSON.stringify(summary, null, 2)}

SADECE geçerli bir JSON nesnesi ile yanıt ver, başka hiçbir metin yazma. Şema:
{
  "zaaflar": ["kısa Türkçe zaaf tespiti", ...],
  "oncelikli_konular": ["çalışılacak konu/soru grubu", ...],
  "calisma_plani": "önümüzdeki 3-5 gün için somut Türkçe çalışma planı (tek paragraf)",
  "motivasyon": "kısa, samimi Türkçe motivasyon mesajı"
}`;

    const res = await fetch(API_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true"
      },
      body: JSON.stringify({
        model: model || DEFAULT_MODEL,
        max_tokens: 1000,
        messages: [{ role: "user", content: prompt }]
      })
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      throw new Error(`API hatası ${res.status}: ${errText.slice(0, 200)}`);
    }

    const data = await res.json();
    const text = (data.content || []).filter(b => b.type === "text").map(b => b.text).join("");
    return parseCoachJSON(text);
  }

  /* Modelin yanıtından JSON'u toleranslı biçimde ayıkla */
  function parseCoachJSON(text) {
    let t = text.trim();
    const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fence) t = fence[1].trim();
    const start = t.indexOf("{"), end = t.lastIndexOf("}");
    if (start === -1 || end === -1) throw new Error("Yanıtta JSON bulunamadı");
    const obj = JSON.parse(t.slice(start, end + 1));
    return {
      zaaflar: Array.isArray(obj.zaaflar) ? obj.zaaflar : [],
      oncelikli_konular: Array.isArray(obj.oncelikli_konular) ? obj.oncelikli_konular : [],
      calisma_plani: obj.calisma_plani || "",
      motivasyon: obj.motivasyon || ""
    };
  }

  return { getCoaching, DEFAULT_MODEL };
})();
