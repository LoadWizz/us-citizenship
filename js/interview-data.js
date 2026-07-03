/* =========================================================================
 * interview-data.js — Mülakat hazırlığı: memur akışı, small talk,
 * yemin soruları, N-400 gözden geçirme hatırlatmaları.
 * critical: true => "kritik an" (make-or-break) işareti
 * ========================================================================= */
"use strict";

/* Mülakatın baştan sona akışı — memurun izlediği sıra */
const INTERVIEW_FLOW = [
  {
    step: 1, title: "Karşılama ve Small Talk", critical: true,
    en: "\"Good morning! How are you today? Did you have any trouble finding the office?\"",
    tr: "Memur seni bekleme salonundan alır ve yürürken sohbet eder. DİKKAT: Bu masum sohbet aslında İngilizce konuşma değerlendirmesinin başlangıcıdır. Rahat, kısa ve doğal cevaplar ver: \"I'm fine, thank you. No, it was easy to find.\"",
    tips: ["Gülümse, göz teması kur.", "\"Fine, thank you. And you?\" gibi kısa kalıplar yeterli.", "Anlamadıysan: \"Could you please repeat that?\" demek sorun değil — hiç cevap vermemek sorundur."]
  },
  {
    step: 2, title: "Doğruluk Yemini", critical: true,
    en: "\"Do you promise to tell the truth, the whole truth, and nothing but the truth?\" → \"I do.\"",
    tr: "Ofise girince ayakta, sağ elini kaldırarak doğruyu söyleyeceğine yemin edersin. Cevap tek: \"I do.\" Bundan sonra söylediğin HER ŞEY yeminli ifadedir.",
    tips: ["Cevap: \"I do.\" — bu kadar.", "Bu andan itibaren asla tahmin etme; bilmiyorsan \"I don't remember exactly, but...\" de."]
  },
  {
    step: 3, title: "Kimlik Kontrolü", critical: false,
    en: "\"May I see your green card, passport, and driver's license?\"",
    tr: "Memur kimliğini doğrular. Yanında olması gerekenler: Green Card, tüm pasaportlar (eski/yeni), eyalet kimliği/ehliyet, randevu mektubu.",
    tips: ["Belgeleri düzenli bir dosyada götür.", "Tüm seyahatlerde kullandığın eski pasaportları da götür."]
  },
  {
    step: 4, title: "N-400 Formunun Gözden Geçirilmesi", critical: true,
    en: "\"Have you traveled outside the United States since you filed your application?\" ... \"Have you ever failed to file taxes?\"",
    tr: "Memur, N-400'deki cevaplarını tek tek seninle doğrular — adresler, işler, seyahatler, evlilik, vergiler, sabıka. Formda ne yazdıysan onu bilmen gerekir. Formdan sonra değişen bir şey varsa (yeni seyahat, adres değişikliği) MUTLAKA söyle.",
    tips: ["Başvurundaki N-400'ün bir kopyasını sınavdan önce baştan sona tekrar oku.", "Seyahat tarihlerini listele: son 5 yıldaki tüm ABD dışı seyahatler.", "Vergi beyannamelerini (son 3-5 yıl) yanında götür.", "\"Yes/No\" sorularını dikkatli dinle — 'Have you EVER...' soruları tüm hayatını kapsar."]
  },
  {
    step: 5, title: "İngilizce Okuma Testi", critical: true,
    en: "\"Please read this sentence aloud.\" (örn: \"Who was the first President?\")",
    tr: "Sana 1-3 cümle gösterilir; birini doğru okuman yeterli. Cümleler yurttaşlık temalıdır (İngilizce sekmesindeki kelime listesinden).",
    tips: ["Yavaş ve net oku — hız puanı yok.", "Bir kelimeyi atlarsan telaşlanma, tekrar oku."]
  },
  {
    step: 6, title: "İngilizce Yazma Testi", critical: true,
    en: "\"Please write this sentence: 'Citizens can vote.'\"",
    tr: "Memur 1-3 cümle söyler; birini doğru yazman yeterli. Küçük imla hataları genelde tolere edilir, anlam bozulmasın yeter.",
    tips: ["Dikte pratiği yap (İngilizce sekmesi).", "Büyük harf ve nokta kullan — özensizlik izlenimi verme."]
  },
  {
    step: 7, title: "Yurttaşlık Testi (Civics) — 20 Soru", critical: true,
    en: "\"What is the supreme law of the land?\" ...",
    tr: "2025 kuralları: memur 128 soruluk havuzdan 20 soru sorar, 12 doğru = geçer. Test SÖZLÜdür. 12 doğruya ulaşınca veya 9 yanlış olunca test erken bitebilir.",
    tips: ["Cevabı bilmiyorsan tahmin et — yanlış cevap ile boş cevap aynı sayılır.", "Kısa cevap ver; tek kelime/kalıp yeterli.", "Anlamadıysan: \"Could you repeat the question, please?\""]
  },
  {
    step: 8, title: "Karar ve Sonraki Adımlar", critical: false,
    en: "\"Congratulations, I'm recommending your application for approval.\"",
    tr: "Memur çoğunlukla aynı gün sonucu söyler: onay önerisi (N-652 formu), ek belge talebi veya devam eden inceleme. Onaylanırsa yemin töreni (Oath Ceremony) tarihi bildirilir — vatandaşlık yemin töreninde tamamlanır.",
    tips: ["N-652 kağıdını sakla.", "Yemin törenine kadar green card statün devam eder — yurtdışı seyahatte dikkat."]
  }
];

/* Small talk pratik soruları */
const SMALL_TALK = [
  { en: "How are you today?", sample: "I'm fine, thank you. And you?", tr: "Bugün nasılsın?" },
  { en: "How did you get here today?", sample: "I drove here. / I came by car.", tr: "Buraya nasıl geldin?" },
  { en: "Did you have trouble finding the office?", sample: "No, it was easy to find.", tr: "Ofisi bulmakta zorlandın mı?" },
  { en: "How is the weather today?", sample: "It's sunny and warm today.", tr: "Bugün hava nasıl?" },
  { en: "Where do you live?", sample: "I live in Chattanooga, Tennessee.", tr: "Nerede yaşıyorsun?" },
  { en: "What do you do for work?", sample: "I work as a truck driver. (kendi işini söyle)", tr: "Ne iş yapıyorsun?" },
  { en: "How long have you been a permanent resident?", sample: "About five years. (kendi süreni söyle)", tr: "Ne zamandır green card sahibisin?" }
];

/* Yemin (Oath of Allegiance) soruları — sınavın son bölümünde N-400 Part 12'den sorulur */
const OATH_QUESTIONS = [
  { en: "Do you support the Constitution and form of government of the United States?", answer: "Yes.", tr: "ABD Anayasası'nı ve hükümet biçimini destekliyor musun?" },
  { en: "Are you willing to take the full Oath of Allegiance to the United States?", answer: "Yes.", tr: "ABD'ye tam Bağlılık Yemini etmeye hazır mısın?" },
  { en: "If the law requires it, are you willing to bear arms on behalf of the United States?", answer: "Yes.", tr: "Yasa gerektirirse ABD adına silah taşımaya hazır mısın?" },
  { en: "If the law requires it, are you willing to perform noncombatant services in the U.S. armed forces?", answer: "Yes.", tr: "Yasa gerektirirse orduda savaşçı olmayan görevler yapmaya hazır mısın?" },
  { en: "If the law requires it, are you willing to perform work of national importance under civilian direction?", answer: "Yes.", tr: "Yasa gerektirirse sivil yönetim altında ulusal öneme sahip işler yapmaya hazır mısın?" }
];

/* Yeminde verilen sözler — Soru 67 ile birebir bağlantılı */
const OATH_PROMISES = {
  questionId: 67,
  intro: "Yemin töreninde vereceğin sözler (Soru 67'nin cevapları — ikisini ezberle):",
  promises: [
    { en: "Give up loyalty to other countries", tr: "Diğer ülkelere bağlılıktan vazgeçmek" },
    { en: "Defend the (U.S.) Constitution", tr: "ABD Anayasası'nı savunmak" },
    { en: "Obey the laws of the United States", tr: "ABD yasalarına uymak" },
    { en: "Serve in the military (if needed)", tr: "Gerekirse askerlik yapmak" },
    { en: "Serve (help, do important work for) the nation (if needed)", tr: "Gerekirse ulusa hizmet etmek" },
    { en: "Be loyal to the United States", tr: "ABD'ye sadık olmak" }
  ]
};

/* Sınav günü kontrol listesi */
const CHECKLIST = [
  { item: "Randevu mektubu (interview notice)", critical: true },
  { item: "Green Card (Permanent Resident Card)", critical: true },
  { item: "Tüm pasaportlar ve seyahat belgeleri (eski pasaportlar dahil)", critical: true },
  { item: "Eyalet kimliği / ehliyet", critical: true },
  { item: "Son 5 yılın vergi beyannameleri (tax returns / IRS transcript)", critical: false },
  { item: "N-400 kopyası (verdiğin cevapları tekrar okumuş ol)", critical: true },
  { item: "Evlilik cüzdanı / boşanma kararları (durumuna göre)", critical: false },
  { item: "Seyahat tarihleri listesi (son 5 yıl, tüm ABD dışı seyahatler)", critical: false },
  { item: "Varsa: trafik cezası dahil tüm mahkeme/sabıka evrakları", critical: false }
];
