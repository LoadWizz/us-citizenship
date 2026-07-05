# Bilimsel Metodoloji — US Citizenship

Bu uygulamanın her tasarım kararı yayımlanmış öğrenme bilimi bulgularına dayanır.
Aşağıda karar → kanıt eşlemesi.

## Öğrenme motoru

| Uygulamadaki karar | Bilimsel temel | Kaynak |
|---|---|---|
| Kartı çevirmeden önce cevabı (sesli) üretme | Test etme etkisi (retrieval practice) — pasif okumadan çok daha kalıcı | Roediger & Karpicke 2006 |
| SM-2 aralıklı tekrar; doğru cevap aralığı büyütür | Aralık etkisi (spacing) — kalıcılıkta en büyük ikinci etken | Ebbinghaus 1885; Cepeda ve ark. 2006 (meta) |
| Cevabı yüksek sesle söyleme (TTS+mikrofon akışı) | Üretim etkisi (production effect) + sınav sözlü olduğu için birebir prova | MacLeod ve ark. 2010 |
| Karma Tekrar: mühürlü bloklardan karışık quiz; çalışma kuyruğunda kategoriler daima karışık | Interleaving — bloklu çalışmadan üstün, benzer öğeleri ayırt etmeyi öğretir | Rohrer & Taylor 2007 |
| "Ustalaşıldı" = FARKLI İKİ GÜNDE İngilizce doğru | Successive relearning — kriterli, oturumlar-arası yeniden öğrenme | Rawson & Dunlosky 2011 |
| 7 blok + %85 eşik + sıradaki blok kilidi | Mastery learning — birimi geçmeden ilerlememek kalıcılığı belirgin artırır | Bloom 1968 (2-sigma bağlamı) |
| İngilizce Mührü: bloğu tamamlamak için salt İngilizce test şart | Kodlama-geri getirme uyumu (transfer-appropriate processing) — pratik koşulu sınav koşuluna eşitlenir | Morris, Bransford & Franks 1977; Tulving & Thomson 1973 |
| Türkçe destek: soru önce anadilde, anlam kurulunca İngilizce | İşleme derinliği — anlamlandırılmış içerik ezberden kalıcı | Craik & Lockhart 1972 |
| Renkli benzersiz ipucu öbeği (soru başına TEK vurgu) | Von Restorff izolasyon etkisi + çift kodlama | von Restorff 1933; Paivio 1971 |
| İpucu 128 bankada benzersiz olmak ZORUNDA ("supreme" değil "law of the land") | İpucu aşırı yüklenmesi ilkesi — çok hedefe bağlı ipucu zayıftır | Watkins & Watkins 1975 |
| Blok sınavında sorular her seferinde karışık | Bağlam/sıra ezberini önleme; testin ölçtüğü şey bilgi kalsın | encoding specificity uygulaması |
| Dekoratif görsel YOK; vurgu yalnız cevabı ayırt eden öbekte | Mayer'in tutarlılık ilkesi — alakasız görsel öğrenmeyi düşürür | Mayer & Moreno 2003 |

Dunlosky ve ark. 2013 derlemesi (Improving Students' Learning...) pratik test etme
ve aralıklı tekrarı "yüksek fayda" olarak sınıflar — bu ikisi uygulamanın motorudur;
imgelem/anahtar kelime teknikleri destekleyici katmandır (renkli ipucu), motor değildir.

## Sorulma olasılığı katmanı (freq.js — 4 Tem 2026 araştırması)

**Soru: "En çok sorulan sorular hangileri?"** — Erkan'ın isteğiyle arşiv/veri taraması yapıldı.

**Bulgu 1 — seçim rastgeledir.** USCIS Politika El Kitabı (Cilt 12, Kısım E, Bölüm 2):
sınav soruları *"a USCIS system randomly selects the test questions"* — memur sistemin
ürettiği standart formdan okur. 2025 testinde de aynı mekanizma (20 soru çekilir,
12 doğruda veya 9 yanlışta durur). Dolayısıyla **"memurların en çok sorduğu soru"
diye resmî bir dağılım yoktur**; her sorunun çekilme olasılığı ~20/128 ≈ %16'dır.
Hazırlık sitelerindeki "en sık çıkan 10 soru" listeleri anekdottur (hatırlanabilirlik
yanlılığı); 2025 testi için saha verisi henüz istatistiksel anlam taşımayacak kadar az.

**Bulgu 2 — tek resmî öncelik 65/20 ★listesi.** USCIS'in kendisi 20 soruyu yıldızlar
(65 yaş + 20 yıl GC: yalnız bu 20'den 10 soru, 6 doğru, istediği dilde). Bu, USCIS'in
"çekirdek bilgi" tanımıdır → Blok 1.

**Sonuç — dürüst optimizasyon "tahmin" değil "beklenen değer"dir.** Seçim rastgele
olduğuna göre kazanç, hangi sorunun geleceğini bilmekte değil, EN AZ EMEKLE EN ÇOK
SORUYU cevaplar hale gelmektedir. freq.js bunu üç katmanla kodlar:

| Katman | Gerekçe |
|---|---|
| ★20 önce (Blok 1 + tanıtım önceliği +3) | USCIS'in kendi çekirdek seçkisi |
| Kaldıraç kümeleri: aynı cevap birden çok soruda ("The President" 5 soru, "Declaration of Independence" 4, "Civil War" 3, "communism" 2, "Freed the slaves" 2, "Required by law" 2) + tek-hikâye kümeleri (yetkililer 8 soru, oy hakkı zinciri, bayrak çifti, Memorial/Veterans tuzağı, WWII üçlüsü) | Bir ezber → N soru: beklenen doğru/emek oranını maksimize eder; ÖĞRET kartında tek satır notla gösterilir (Gestalt/örgütleme: ilişkili öğeler birlikte kodlanınca hatırlama artar — Bower ve ark. 1969 kümeleme) |
| Tek cevaplı kısa sorular önce (+1) | Sınav 12 doğruda biter: hızlı-kesin cevaplar tabanı kurar, riskli sorulara sıra gelmeden sınav biter (Hick yasası: seçenek azlığı = hız) |

Kaynaklar: USCIS Policy Manual Vol.12-E-2 (uscis.gov/policy-manual/volume-12-part-e-chapter-2),
65/20 soru listesi (uscis.gov/sites/default/files/document/questions-and-answers/65-20q.pdf),
CLINIC 2025 testi rehberi (cliniclegal.org). Erişim: 4 Tem 2026.

## Fiyatlandırma (davranışsal)

| Karar | Temel |
|---|---|
| N-400 harcı ($710+) çıpası paywall başlığında | Çıpalama + kayıptan kaçınma (Kahneman & Tversky 1979) |
| Pro Aylık bilinçli "zayıf" seçenek; Pro Yıllık yanında bariz kazanç | Decoy / asimetrik baskınlık (Huber ve ark. 1982; Ariely'nin Economist örneği) |
| "EN POPÜLER" rozeti ortadaki kartta | Center-stage etkisi (Valenzuela & Raghubir 2009) + sosyal kanıt |
| $8.99 / $49.99 / $79.99 / $129 | Charm pricing (Thomas & Morwitz 2005) |
| Paywall, Çekirdek'te ilerleme sonrası; ilerleme çubuğuyla | Goal-gradient (Hull 1932; Kivetz ve ark. 2006) + endowment |
| Yıllık öne, aylık daima görünür; iptalde "duraklat/aylığa geç" | Churn azaltma — ödeyemeyeni kaybetme, küçült |
| Ömür Boyu tek ödeme | Kategoriye özgü rasyonellik: kullanıcı vatandaş olunca doğal churn; tavan çıpası olarak da çalışır |

> Not: Fiyat SAYILARI hipotezdir — canlıda A/B testi ile doğrulanmalıdır.
> Yapı (çıpa/decoy/center-stage) kanıta dayalıdır, rakamlar pazara göre ayarlanabilir.

## Dürüst sınırlar

- "%100 çıkacak soru" iddiası bilerek YOKTUR — USCIS soru frekansı yayınlamaz.
  Blok 1'in ★20'si resmi 65/20 alt kümesidir; "en sağlam başlangıç seti" doğru çerçevedir.
- Renkli ipucu etkisi bireysel farklılık gösterir; motor her zaman test+aralık kalır.
- Ses tanıma eşleştirmesi yardımcıdır; nihai değerlendirme kullanıcının kendi beyanıdır
  (gerçek mülakatta da memurun takdiridir).
