# Mağaza Yolu — Google Play & App Store (dürüst durum notu)

Bu turda TAM mağaza gönderimi YAPILMADI. Aşağıdakiler hazır ve yol açık;
eksikler açıkça işaretli.

## Kritik kural: mağazalarda Stripe kullanılamaz

Apple (App Store Review Guideline 3.1.1) ve Google Play (Payments policy),
uygulama İÇİNDE satılan dijital abonelikler için kendi ödeme sistemlerini
zorunlu tutar (%15-30 komisyon). Bu yüzden:

- **Web PWA (şu anki dağıtım):** Stripe — komisyonsuz, canlı.
- **Mağaza sürümleri:** aynı uygulama + mağaza IAP'si. `entitlements.js`
  hibrit dikişi tam bu yüzden var: `AppleIAPStub` / `GooglePlayStub`
  gerçek implementasyonla değiştirilir, `applyStoreEntitlement()` AYNI
  kilidi besler; UI/özellik matrisi hiç değişmez.

## Google Play — TWA (önerilen ilk mağaza)

1. `npm i -g @bubblewrap/cli`
2. `bubblewrap init --manifest https://loadwizz.github.io/us-citizenship/manifest.webmanifest`
3. `assetlinks.json` → `https://loadwizz.github.io/.well-known/assetlinks.json`
   (Bubblewrap üretir; LoadWizz.github.io ana repoya konur — alt yol DEĞİL kök!)
4. `bubblewrap build` → imzalı AAB → Play Console'a yükle.
5. **EKSİK:** Play Billing entegrasyonu (Digital Goods API TWA'da Play
   faturalandırmasıyla çalışır) + `GooglePlayStub` implementasyonu.
   Play, dijital abonelik satan TWA'da bunu zorunlu kılar. Alternatif:
   mağaza sürümünde satın almayı kapatıp yalnız "geri yükle" bırakmak da
   politika ihlalidir (reader app istisnası bize uymaz) — IAP şart.

## App Store — Capacitor

1. `npm i @capacitor/core @capacitor/ios && npx cap init`
2. `webDir` olarak bu klasör; `npx cap add ios && npx cap open ios`
3. **EKSİK:** StoreKit 2 entegrasyonu (`AppleIAPStub` implementasyonu),
   Apple Developer hesabı ($99/yıl), App Review süreci.
4. Not: WKWebView'da SpeechRecognition kısıtlı olabilir — mikrofon akışı
   cihazda test edilmeli; TTS sorunsuz.

## Sürümleme

Tek kod tabanı. Dağıtım hedefi `Entitlements` sağlayıcısını seçer:
web → Stripe; TWA → Play Billing; iOS → StoreKit. Fiyat noktaları
mağaza komisyonunu karşılamak için mağazada +%20-30 ayarlanabilir
(yaygın ve Apple/Google'a uygun pratik).
