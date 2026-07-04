/* =========================================================================
 * advisor.js — Kural tabanlı, ÇEVRİMDIŞI koç önerileri ("Önerilen" çipleri)
 * Claude koçtan bağımsız çalışır; anahtar gerektirmez. Amaç: kullanıcıya
 * her an tek ve net bir "sıradaki en iyi adım" göstermek (basitlik ilkesi).
 * ========================================================================= */
"use strict";

const Advisor = (() => {

  /* En alakalı 1-2 öneriyi döndürür: [{icon, text, action:{route, blockId?, mode?}}] */
  async function recommendations() {
    const out = [];
    const states = await Blocks.getAllStates();
    const cards = await App.cards();
    const stats = await App.planStats();
    const exams = await DB.getAllExams();
    const current = await Blocks.current();

    /* 1) Mühür bekleyen blok — en yüksek öncelik (transfer-appropriate practice) */
    for (const b of BLOCKS) {
      const st = states.get(b.id);
      if (st.status === "test_passed") {
        out.push({
          icon: "🔏",
          text: `"${b.name}" bloğunu tamamlamak için İngilizce Mührü'nü geç — gerçek sınav İngilizce`,
          action: { route: "/blocktest", blockId: b.id, mode: "seal" }
        });
        break;
      }
    }

    /* 2) Tekrar borcu birikti mi? (aralıklı tekrar disiplini) */
    if (stats.due >= 15) {
      out.push({ icon: "⏰", text: `${stats.due} tekrar birikti — yeni konudan önce tekrarları bitir`, action: { route: "/study" } });
    }

    /* 3) Aktif blokta sınav zamanı mı? (tüm kartlar en az bir kez görüldü) */
    if (current && out.length < 2) {
      const st = states.get(current.id);
      const allSeen = current.ids.every(id => (cards.get(id) || {}).seen > 0);
      if (st.status === "learning" && allSeen) {
        if (st.bestTest && !st.bestTest.passed) {
          out.push({
            icon: "🔁",
            text: `"${current.name}" sınavında ${st.bestTest.score}/${st.bestTest.total} yaptın — eşik ${Blocks.passNeed(st.bestTest.total)}. Aynı sınavı (karışık sırayla) tekrar dene`,
            action: { route: "/blocktest", blockId: current.id, mode: "test" }
          });
        } else if (!st.bestTest) {
          out.push({
            icon: "📝",
            text: `"${current.name}" bloğunun tüm kartlarını gördün — blok sınavına hazırsın`,
            action: { route: "/blocktest", blockId: current.id, mode: "test" }
          });
        }
      }
    }

    /* 4) Karma tekrar (interleaving) — 2+ mühürlü blok varsa ve bugün yapılmadıysa */
    const sealedCount = BLOCKS.filter(b => states.get(b.id).status === "sealed").length;
    if (sealedCount >= 2 && out.length < 2) {
      const today = new Date().toISOString().slice(0, 10);
      const mixedToday = exams.some(e => e.type === "mixed" && e.date.slice(0, 10) === today);
      if (!mixedToday) {
        out.push({ icon: "🔀", text: "Karma tekrar: mühürlü bloklardan karışık 10 soru — eskiler taze kalsın", action: { route: "/blocktest", mode: "mixed" } });
      }
    }

    /* 5) Hepsi mühürlüyse: deneme sınavı temposu */
    if (sealedCount === BLOCKS.length && out.length < 2) {
      out.push({ icon: "🎓", text: "Tüm bloklar mühürlü! Sınava kadar haftada 2-3 deneme sınavıyla formda kal", action: { route: "/exam" } });
    }

    return out.slice(0, 2);
  }

  return { recommendations };
})();
