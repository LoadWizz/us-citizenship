# 🇺🇸 US Citizenship — 2025 Vatandaşlık Sınavı Hazırlık PWA (Prod)

2025 USCIS Naturalizasyon Yurttaşlık Testi (128 soru; 20 sorudan **12 doğru = geçer**; test **sözlü**) için
tamamen çevrimdışı çalışan, telefona kurulabilen, **freemium abonelikli** mobil çalışma uygulaması.
Sorular/cevaplar İngilizce (sınav İngilizce); arayüz Türkçe; iki dilli öğrenme modu.

**Canlı:** https://loadwizz.github.io/us-citizenship
**Kaynak:** `2025-Civics-Test-128-Questions-and-Answers.pdf` (USCIS M-1778, 09/25) — bu klasörde.
**Metodoloji kanıtları:** [METHODOLOGY.md](METHODOLOGY.md) · **Canlıya alma:** [MORNING-CHECKLIST.md](MORNING-CHECKLIST.md) · **Mağaza yolu:** [STORE.md](STORE.md)

## Çalıştırma

```bash
# Frontend (tek satır)
cd ~/us-citizenship && python3 -m http.server 8000
# Ödeme backend'i (ayrı terminal — MOCK modda Stripe anahtarsız çalışır)
node backend/local-server.mjs
```

## v2 Mimarisi — öğrenme sistemi

- **7 blok + iki kapılı mühür:** Blok 1 = resmi ★yıldızlı 20 (ücretsiz). Blok
  sınavı ≥%85 → **İngilizce Mührü** ≥%85 → sonraki blok açılır (Bloom mastery
  + transfer-appropriate processing; deneme/mühür daima salt İngilizce).
- **Benzersiz renkli ipucu:** 128 sorunun her birinde, soruyu bankada benzersiz
  kılan anlamlı öbek vurgulu ("supreme" değil "law of the land" — cue overload
  ilkesi). `js/cues.js` elle küre edildi, selfcheck programatik doğrular.
- **İki dilli mod:** soru önce Türkçe sonra İngilizce (görsel+sesli); cevaplar
  EN esaslı + TR karşılık. İspanyolca için paket mimarisi hazır (`js/lang.js`).
- **Ustalık:** soru, FARKLI İKİ GÜNDE İngilizce doğru cevaplanınca "ustalaşıldı"
  (successive relearning). Karma Tekrar mühürlü bloklardan karışık sorar (interleaving).

## v2 Mimarisi — gelir sistemi

- **Planlar** (`js/pricing.js`, davranışsal gerekçeler dosyada): Ücretsiz (Blok 1)
  · Hazırlık $8.99/ay–$49.99/yıl · Vatandaşlık $14.99/ay–$79.99/yıl (AI Koç +
  Zayıflık Drili) · Ömür Boyu $129.
- **Entitlement seam** (`js/entitlements.js`): Stripe aktif; Apple/Google IAP
  stub'ları aynı kilide takılır (mağaza sürümleri için). 7 gün çevrimdışı grace.
- **Backend** (`backend/`): Cloudflare Worker (sıfır bağımlılık) — checkout,
  webhook (imza doğrulamalı), session-status, verify (JWT), restore, portal.
  `local-server.mjs` aynı worker'ı Node'da MOCK Stripe ile koşar: anahtarsız
  uçtan uca test. Gerçek anahtarlar yalnız `.env`/wrangler secret (repoda YOK).

Sonra tarayıcıda: **http://localhost:8000**

> **Telefonda kullanmak için (önemli):** Service worker ve "ana ekrana ekle" HTTPS (veya localhost) ister.
> Aynı Wi-Fi'daki telefondan `http://<bilgisayar-ip>:8000` açılır ama çevrimdışı mod çalışmaz.
> Kalıcı kurulum için klasörü ücretsiz bir HTTPS hosta koy (GitHub Pages / Netlify / Cloudflare Pages —
> hepsi statik dosya kabul eder, build gerekmez). Sonra telefonda aç → Paylaş → **Ana Ekrana Ekle**.

## Özellikler

- **128 resmi soru** birebir PDF'ten; ★ **yıldızlı 20 soru** (65/20 — en sık sorulanlar) etiketli
- **Dinamik sorular** (23, 29, 30, 38, 39, 57, 61, 62) uyarı rozetli; Başkan/Vali/Senatör/Temsilci
  isimleri **Ayarlar'dan düzenlenebilir** (Tennessee/Chattanooga ön dolu, kalıcı gerçek değil)
- **Aralıklı tekrar (SM-2)**: Tekrar/Zor/İyi/Kolay notlaması, kart başına aralık/kolaylık, IndexedDB'de kalıcı
- **Aktif hatırlama + sözlü simülasyon**: soru TTS ile okunur (memur sesi), 🎤 ile sesli cevap +
  USCIS-tarzı esnek eşleştirme; API yoksa dokun-göster akışı
- **Deneme Sınavı**: 20 soru (zayıflara + ★'lılara ağırlıklı), 12/20 eşiği, gerçekçi erken bitirme
  (12 doğru veya 9 yanlış), soru başı süre takibi, kategori dökümü
- **Claude Koç** (isteğe bağlı): API anahtarı girilirse sınav sonrası Türkçe zaaf analizi + çalışma planı;
  anahtar yalnızca cihazda saklanır, uygulama anahtarsız da tam çalışır
- **İngilizce Testi**: resmi okuma/yazma kelime listeleri, dikte pratiği (TTS okur → sen yazarsın),
  sesli okuma pratiği
- **Mülakat Hazırlığı**: memur akışı (kritik anlar işaretli), small talk, yemin soruları, N-400
  hatırlatmaları, sınav günü kontrol listesi
- **İlerleme**: 128 hücreli ustalık ısı haritası, kategori radarı, sınav geçmişi grafiği, en zayıf 10
- **Günlük plan**: bugün vadesi gelenler, seri (streak), öngörülen hazırlık tarihi
- Karanlık mod, tamamen çevrimdışı (service worker), CDN'siz, `localStorage` yerine **IndexedDB**

## Kendini doğrulama

Uygulama her açılışta veri bütünlüğünü test eder (128 soru sayımı, yıldızlı 20'nin listesi,
kategori aralıkları, 12/20 sınav matematiği, SRS akışı). Sonuç: konsol + **Ayarlar → Veri Doğrulama**.

## Dosya yapısı

```
index.html            uygulama kabuğu
manifest.webmanifest  PWA manifest ("US Citizenship")
sw.js                 service worker (önbellek-öncelikli, çevrimdışı)
css/app.css           stiller (açık/koyu tema)
js/data.js            128 soru + TR açıklama + hafıza kancası (tek gerçek kaynak)
js/english-data.js    resmi okuma/yazma kelimeleri + dikte cümleleri
js/interview-data.js  mülakat akışı, small talk, yemin, kontrol listesi
js/db.js              IndexedDB sarmalayıcı (kartlar, ayarlar, sınavlar, streak)
js/srs.js             SM-2 aralıklı tekrar zamanlayıcı
js/speech.js          TTS + STT + esnek cevap eşleştirme
js/coach.js           Claude API entegrasyonu (sınav sonrası koç)
js/selfcheck.js       veri bütünlüğü testleri
js/ui.js              DOM yardımcıları + yönlendirici
js/views/*.js         ekranlar (bugün, çalış, sınav, ingilizce, mülakat, ilerleme, ayarlar)
icons/                PWA ikonları
```

## Önemli notlar

- **Mülakattan önce** dinamik soruların cevaplarını doğrula:
  https://www.uscis.gov/citizenship/testupdates → sonra Ayarlar'daki isimleri güncelle.
- Ses tanıma (🎤) en iyi Safari (iOS) ve Chrome'da çalışır; desteklenmeyen tarayıcıda uygulama
  otomatik olarak dokun-göster akışına düşer.
- Bu uygulama resmi bir USCIS ürünü değildir; çalışma yardımcısıdır.
