# ☀️ SABAH CANLIYA ALMA CHECKLIST

## 🌙 2. GECE RAPORU (5 Tem 2026, v8) — istediğin her şey yapıldı, tek kalan STRIPE

1. **"En çok sorulan sorular" araştırması** → dürüst sonuç: USCIS Politika El Kitabı'na
   göre sorular sistemce RASTGELE seçiliyor; "memurun favori sorusu" efsane. Tek resmî
   öncelik ★20. Bu yüzden kazanç stratejisi kuruldu: **kaldıraç** — "The President" tek
   cevabı 5 soruyu, "Declaration of Independence" 4 soruyu açıyor; Ayarlar'daki 9 isim
   8 soruyu birden cevaplıyor. Detay: METHODOLOGY.md "Sorulma olasılığı katmanı".
2. **Kart formatın birebir uygulandı:** TR soru → EN soru (renkli tetik kelime) →
   "👀 ... kelimelerini duyduğunda cevabın: X" (en kolay cevap adıyla) → cevap kocaman.
   "Name two/three" sorularında tam ezber seti gösteriliyor (Equality + Liberty gibi).
   Yeni kartlar artık kaldıraç önceliğiyle tanıtılıyor (bir ezber → çok soru önce gelir).
3. **Öğreten diyagramlar (22 soru):** bayrak 13 çizgi / 50 yıldız, görev süreleri 2-4-6,
   mahkeme 9 koltuk / 5 oy, oy hakkı 1870→1920→18+, Memorial↔Veterans karşıtlığı,
   1776↔1787... NOT: Higgsfield kredin 0 olduğundan AI görsel üretilemedi; bunun yerine
   satır içi SVG (sıfır indirme, tema uyumlu). Kredi yüklersen AI görsel eklenebilir.
4. **İspanyolca paket hazır** (lang-es.js, 128 soru, resmî USCIS İspanyolca üslubu,
   selfcheck'te doğrulanıyor). Kullanıcıya açmak ayrı karar: arayüz dili şu an Türkçe —
   İspanyol pazarı için arayüz çevirisi + karşılama seçeneği gerekir (konuşuruz).
5. **Restore artık doğrulamalı olabilir:** Resend anahtarı girersen 6 haneli kod akışı
   (15 dk, 5 deneme, tek kullanım; E2E kanıtlı). Aşağıda yeni adım 7 — 5 dk.
6. Selfcheck 19 → **22 test** (kaldıraç + diyagram + ES). Tarayıcıda 22/22 doğrulandı.

Gece yapılanlar (1. gece): öğrenme sistemi (Faz A), paywall+fiyatlandırma (Faz B),
backend+Stripe akışı MOCK modda uçtan uca kanıtlandı (Faz C), prod cilası (Faz D).
Uygulama canlı: https://loadwizz.github.io/us-citizenship — ödeme hariç her şey çalışıyor.
Ödemeyi canlıya almak ~30-40 dk sürer, sıra aşağıda. **Hiçbir gizli anahtar repoda değil.**

## 0) Önce fiyatları gözden geçir (5 dk)
`js/pricing.js` — Hazırlık $8.99/ay·$49.99/yıl, Vatandaşlık $14.99/ay·$79.99/yıl,
Ömür Boyu $129. Gerekçeler dosya başında. Değiştirirsen backend'e de (adım 2) aynı
fiyatlarla ürün açacaksın.

## 1) Stripe TEST modunda dene (10 dk)
1. dashboard.stripe.com → test moduna geç → Developers > API keys → `sk_test_...` kopyala.
2. Products → 5 fiyat oluştur (Hazırlık ay/yıl, Vatandaşlık ay/yıl, Ömür Boyu tek seferlik).
   Her birinin `price_...` ID'sini not al.
3. `backend/.env` dosyası oluştur ( `.env.example`'ı kopyala):
   - `STRIPE_SECRET_KEY=sk_test_...`
   - `JWT_SECRET=` → `openssl rand -hex 32` çıktısı
   - 5 adet `PRICE_...` ID
   - `MOCK_STRIPE=false`
4. `node backend/local-server.mjs` → uygulamada (localhost:8471) Ayarlar başlığına
   7 kez dokun → Geliştirici → Backend URL `http://localhost:8787` olduğundan emin ol.
5. Paywall'dan satın al → GERÇEK Stripe test sayfası gelir → kart `4242 4242 4242 4242`,
   herhangi bir gelecek tarih + CVC → dönüşte plan aktifleşmeli.

## 2) Cloudflare Workers'a dağıt (10 dk — ücretsiz)
```bash
npm i -g wrangler && wrangler login
cd backend
wrangler kv namespace create ENTITLEMENTS   # çıkan id'yi wrangler.toml'a yaz
wrangler secret put STRIPE_SECRET_KEY
wrangler secret put STRIPE_WEBHOOK_SECRET   # adım 3'ten sonra da eklenebilir
wrangler secret put JWT_SECRET
# Price ID'leri: wrangler.toml [vars] altına ekle veya secret put ile
wrangler deploy                              # → https://us-citizenship-backend.XXX.workers.dev
```
Sonra `js/pricing.js` → `defaultBackendUrl`'i workers.dev adresine çevir,
`sw.js` CACHE sürümünü artır, commit+push.

## 3) Webhook bağla (5 dk)
Stripe Dashboard → Developers > Webhooks → Add endpoint:
`https://us-citizenship-backend.XXX.workers.dev/webhook`
Events: `checkout.session.completed`, `customer.subscription.updated`,
`customer.subscription.deleted`, `invoice.payment_failed`.
Çıkan `whsec_...` → `wrangler secret put STRIPE_WEBHOOK_SECRET`.

## 4) Customer Portal'ı aç (2 dk)
Stripe Dashboard → Settings > Billing > Customer portal → etkinleştir
(iptal + plan değişikliği + fatura geçmişi izinlerini aç).

## 5) CANLIYA geçiş (5 dk)
Test akışı sorunsuzsa: Stripe canlı moda geç → canlı `sk_live_...` + canlı
Price'lar + canlı webhook → wrangler secret'ları canlılarla güncelle →
`wrangler deploy`. Stripe hesap ayarlarında işletme adının
**"Ardaluna Holding LLC"** olduğunu doğrula (fatura/ekstre görünümü).

## 6) Gerçek kartla duman testi
Telefondan kendi kartınla en ucuz planı al → kilitlerin açıldığını gör →
Stripe'tan iade et (Payments → Refund). Faturalama ekranı + portal + geri
yükle akışlarını dene.

## 7) İSTEĞE BAĞLI: Restore e-posta doğrulaması — Resend (5 dk)
Kod hazır (4 Tem gecesi eklendi, E2E kanıtlı). Anahtar girilmezse eski davranış sürer.
1. resend.com → ücretsiz hesap → API Keys → `re_...` oluştur.
2. `wrangler secret put RESEND_API_KEY` (yerelde `.env`'e `RESEND_API_KEY=re_...`).
3. İstersen kendi alan adını doğrula ve `MAIL_FROM="US Citizenship <no-reply@alanin.com>"`
   ekle; doğrulamazsan test göndericisi `onboarding@resend.dev` kullanılır.
4. Test: Geri Yükle → e-postana 6 haneli kod gelir → gir → plan açılır.

## ⚠️ Bilinen sınırlar / kararların
- **Restore:** Resend anahtarı GİRİLMEDİĞİ sürece e-posta-tabanlıdır (e-postayı
  bilen erişim açabilir; risk içerik erişimiyle sınırlı). Adım 7'yi yapınca
  6 haneli kod doğrulamalı olur — kod 15 dk geçerli, 5 deneme, tek kullanımlık.
- Yasal sayfalar TASLAK — hukukçuya inceletmeden reklam verme.
- Mağazalar (Play/App Store) ayrı faz: STORE.md'de dürüst durum + IAP şartı.
- Fiyat rakamları hipotez — A/B ile doğrula (yapı kanıta dayalı, rakam pazara göre).

## Gece test kanıtları
- Kendini-doğrulama: **18/18** (içerik+ipucu+TR+blok+mühür+entitlement)
- API E2E: checkout→ödeme→token→verify→restore ✅; sahte token 401, yabancı e-posta 404 ✅
- Tarayıcı E2E: paywall→mock Stripe→dönüş→pro kilitleri açıldı ✅
- Konsol: 0 hata
