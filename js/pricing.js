/* =========================================================================
 * pricing.js — Fiyatlandırma yapılandırması + davranışsal gerekçeler
 * (Ardaluna Holding LLC)
 *
 * DAVRANIŞSAL FİYATLAMA GEREKÇELERİ (sabah gözden geçirilecek — A/B testine açık):
 *
 * 1. ÇIPALAMA (Kahneman & Tversky): USCIS N-400 başvuru harcı ~$710-760.
 *    Paywall başlığında bu maliyet hatırlatılır → $79.99 "sınavı garantiye
 *    almanın küçük sigortası" çerçevesine oturur (kayıptan kaçınma).
 * 2. ASİMETRİK BASKINLIK / DECOY (Ariely, Economist deneyi): Pro Aylık
 *    ($14.99/ay) bilinçli olarak zayıf seçenektir — Pro Yıllık ($6.67/ay'a
 *    denk) onun yanında bariz kazanç görünür ve satışı yıllığa iter.
 * 3. CENTER-STAGE + "EN POPÜLER" (Valenzuela ve ark.): ortadaki kart
 *    varsayılan algılanır → Vatandaşlık Yıllık ortada, rozetli.
 * 4. CHARM PRICING (Thomas & Morwitz): .99 kuruş bitişleri.
 * 5. HEDEF TAMAMLAMA / GOAL-GRADIENT: paywall, kullanıcı Çekirdek 20'de
 *    ilerleme kaydettikten sonra çıkar; ilerleme çubuğu gösterilir
 *    ("başladığın işi bitir" etkisi + endowment: Blok 1 zaten "onun").
 * 6. CHURN KORUMASI: yıllık öne çıkar ama aylık HER ZAMAN görünür
 *    (ödeyemeyecek kullanıcıyı kaybetmek yerine aylıkta tutmak);
 *    iptal akışında "duraklat / aylığa geç" teklifi (Faz D).
 * 7. DOĞAL CHURN GERÇEĞİ: kullanıcı vatandaş olunca ayrılır (3-6 ay yaşam
 *    döngüsü). "Ömür Boyu" tek ödeme bu kategoride rasyoneldir ve yıllık
 *    fiyatı makul gösteren tavan çıpası görevi görür.
 *
 * Pazar referansları: Babbel ~$8-14/ay, Duolingo Super ~$7-13/ay,
 * vatandaşlık uygulamaları $10-30 tek seferlik. Hazırlık $8.99/ay bu
 * bandın içinde; Pro farkını gerçek özellikler (AI Koç, zayıflık drili)
 * taşır — fiyat farkı boş vaatle doldurulmaz.
 * ========================================================================= */
"use strict";

const PRICING = {
  currency: "USD",
  /* Backend adresi: Ayarlar > Geliştirici'den değiştirilebilir (test/canlı) */
  defaultBackendUrl: "http://localhost:8787",

  plans: {
    free: {
      id: "free", name: "Ücretsiz", tagline: "Çekirdek ★20 ile başla",
      features: ["Blok 1: Çekirdek ★20 soru", "İki dilli kartlar + renkli ipuçları", "Sesli çalışma (TTS/mikrofon)", "Açık bloklardan mini deneme"]
    },
    prep: {
      id: "prep", name: "Hazırlık", tagline: "Tüm sorular, tam yol haritası",
      monthly: 8.99, yearly: 49.99,
      features: ["7 bloğun tamamı — 128 resmi soru", "İngilizce mührü sistemi", "Tam 128'lik deneme sınavı havuzu", "Karma tekrar (interleaving)", "İlerleme haritası + istatistikler"]
    },
    pro: {
      id: "pro", name: "Vatandaşlık", tagline: "Mülakata tam hazırlık", popular: true,
      monthly: 14.99, yearly: 79.99,
      features: ["Hazırlık'taki her şey", "🤖 AI Koç — her sınav sonrası kişisel neden-sonuç analizi", "🎯 Zayıflık Drili — en zayıf 10 sorunla hedefli tur", "Öncelikli yeni özellikler"]
    },
    lifetime: {
      id: "lifetime", name: "Ömür Boyu", tagline: "Yemin törenine kadar ve sonrası — tek ödeme",
      oneTime: 129,
      features: ["Vatandaşlık'taki her şey", "Süresiz erişim — abonelik yok", "Aile üyelerinin gelecekteki başvuruları için de hazır"]
    }
  },

  /* Özellik → asgari plan eşlemesi (Entitlements.planHas bunu okur) */
  featureMatrix: {
    full_blocks:    ["prep", "pro", "lifetime"],
    full_exam_pool: ["prep", "pro", "lifetime"],
    ai_coach:       ["pro", "lifetime"],
    weakness_drill: ["pro", "lifetime"]
  },

  yearlySavingsPct(plan) {
    const p = this.plans[plan];
    if (!p || !p.monthly || !p.yearly) return 0;
    return Math.round((1 - p.yearly / (p.monthly * 12)) * 100);
  },

  perMonthOfYearly(plan) {
    const p = this.plans[plan];
    return p && p.yearly ? (p.yearly / 12) : null;
  },

  fmt(n) { return "$" + (Number.isInteger(n) ? n : n.toFixed(2)); }
};
