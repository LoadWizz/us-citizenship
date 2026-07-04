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
   * v2: blok durumları + dil modu + İngilizce/bilingual performans farkı
   * bağlama eklenir; koçtan NEDEN-SONUÇLU açıklama istenir.
   */
  async function getCoaching({ apiKey, model, examResult, history, cards, blockStates, langMode }) {
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

    const prevExams = (history || []).slice(-8).map(e => ({
      tarih: e.date.slice(0, 10), tur: e.type || "mock", blok: e.blockId || null,
      puan: `${e.score}/${e.total}`, gecti: e.passed
    }));

    /* Blok durumları + iki dil modu arasındaki performans farkı:
     * bilingual blok testi (tur=block) vs İngilizce mühür (tur=seal) puanları
     * koça "Türkçe destekle geçiyor ama İngilizcede düşüyor" desenini gösterir. */
    const bloklar = (blockStates || []).map(st => {
      const b = BLOCKS.find(x => x.id === st.blockId);
      return {
        blok: `${st.blockId}. ${b ? b.name : ""}`,
        durum: st.status,
        blokSinavi: st.bestTest ? `${st.bestTest.score}/${st.bestTest.total}` : null,
        ingilizceMuhru: st.bestSeal ? `${st.bestSeal.score}/${st.bestSeal.total}` : null
      };
    });

    const summary = {
      dilModu: langMode === "bilingual" ? "Türkçe destekli (TR+EN)" : "Yalnız İngilizce",
      sonSinav: { tur: examResult.type || "mock", puan: `${examResult.score}/${examResult.total}`, gecti: examResult.passed, kategoriDagilimi: catStats, yanlisSorular: wrongOnes },
      blokDurumlari: bloklar,
      gecmisSinavlar: prevExams,
      zayifKartlar: weakCards
    };

    const prompt =
`Sen bir ABD vatandaşlık sınavı koçusun (2025 USCIS civics test: 128 soruluk havuz, mülakatta 20 soru, 12 doğru = geçer, test SÖZLÜ ve İNGİLİZCE). Öğrenci Türkçe konuşuyor, Chattanooga, Tennessee'de yaşıyor. Uygulamada 7 bloklu bir sistem var: her blok önce (varsa Türkçe destekli) blok sınavı, sonra SALT İNGİLİZCE "mühür" testiyle (%85 eşik) tamamlanır — çünkü gerçek mülakatta memur İngilizce sorar ve tekrar hakkı sınırlıdır.

Öğrencinin durumu:
${JSON.stringify(summary, null, 2)}

KURALLARIN:
1. NEDEN-SONUÇLU konuş: sadece "şurada zayıfsın" deme; "X oldu, bunun nedeni Y, gerçek mülakatta sonucu Z olur, bu yüzden şunu yap" kalıbını kullan. Örnek ton: "Blok 2'yi Türkçe destekle %90 geçtin ama İngilizce mühründe 12/18'de kaldın. Memur soruyu İngilizce soracak ve tekrar hakkın sınırlı; bu yüzden mühür için Blok 2'yi salt İngilizce tekrar etmeni öneriyorum."
2. Bilingual öğrencide blok sınavı ile İngilizce mührü arasında puan farkı görürsen bunu MUTLAKA yorumla — bu, dil bariyerinin en net sinyalidir.
3. Somut ol: hangi blok, hangi sorular, kaç gün, günde kaç dakika.
4. Motivasyonda samimi ol ama abartma; ilerlemeyi verilerle teslim et.

SADECE geçerli bir JSON nesnesi ile yanıt ver, başka hiçbir metin yazma. Şema:
{
  "zaaflar": ["neden-sonuçlu kısa Türkçe tespit", ...],
  "oncelikli_konular": ["çalışılacak blok/konu/soru grubu", ...],
  "calisma_plani": "önümüzdeki 3-5 gün için somut Türkçe plan (tek paragraf, gün gün)",
  "motivasyon": "kısa, samimi, veriye dayalı Türkçe motivasyon"
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
