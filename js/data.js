/* =========================================================================
 * data.js — 2025 USCIS Vatandaşlık Sınavı: 128 resmi soru ve cevap
 * Kaynak: 2025-Civics-Test-128-Questions-and-Answers.pdf (M-1778, 09/25)
 * Sorular ve cevaplar İngilizce (sınav İngilizce yapılır),
 * açıklamalar (tr) ve hafıza kancaları (hook) Türkçe.
 *
 * Alanlar:
 *   id    : resmi soru numarası (1-128)
 *   q     : İngilizce soru (birebir)
 *   a     : kabul edilen İngilizce cevaplar (birebir)
 *   cat   : kategori kodu (aşağıdaki CATEGORIES)
 *   star  : true => 65/20 yıldızlı soru ("CORE — en yüksek çıkma olasılığı")
 *   dyn   : true => cevap seçim/atamayla değişebilir (testupdates uyarısı)
 *   pers  : kişiselleştirilmiş cevap anahtarı (settings'ten gelir) veya null
 *   note  : resmi ek not (varsa)
 *   tr    : 1-2 cümle Türkçe bağlam/açıklama
 *   hook  : kısa Türkçe hafıza kancası
 * ========================================================================= */
"use strict";

const CATEGORIES = {
  GOV_A:  { name: "Amerikan Hükümeti — A: Amerikan Hükümetinin İlkeleri", short: "Hükümet: İlkeler",   color: "#6366f1" },
  GOV_B:  { name: "Amerikan Hükümeti — B: Hükümet Sistemi",               short: "Hükümet: Sistem",    color: "#3b82f6" },
  GOV_C:  { name: "Amerikan Hükümeti — C: Haklar ve Sorumluluklar",       short: "Haklar & Görevler",  color: "#06b6d4" },
  HIST_A: { name: "Amerikan Tarihi — A: Koloni Dönemi ve Bağımsızlık",    short: "Tarih: Bağımsızlık", color: "#f59e0b" },
  HIST_B: { name: "Amerikan Tarihi — B: 1800'ler",                        short: "Tarih: 1800'ler",    color: "#f97316" },
  HIST_C: { name: "Amerikan Tarihi — C: Yakın Tarih ve Diğer Önemli Bilgiler", short: "Tarih: Yakın",  color: "#ef4444" },
  SYM:    { name: "Semboller ve Bayramlar — A: Semboller",                short: "Semboller",          color: "#10b981" },
  HOL:    { name: "Semboller ve Bayramlar — B: Bayramlar",                short: "Bayramlar",          color: "#84cc16" }
};

/* 65/20 yıldızlı soruların resmi listesi (kendini-doğrulama için) */
const STAR_IDS = [2, 7, 12, 20, 30, 36, 38, 39, 44, 52, 61, 66, 74, 78, 86, 94, 113, 115, 121, 126];

/* Cevabı seçimle/atamayla değişebilen sorular */
const DYNAMIC_IDS = [23, 29, 30, 38, 39, 57, 61, 62];

const TESTUPDATES_URL = "https://www.uscis.gov/citizenship/testupdates";

const QUESTIONS = [
  { id: 1, cat: "GOV_A", star: false, dyn: false, pers: null, note: null,
    q: "What is the form of government of the United States?",
    a: ["Republic", "Constitution-based federal republic", "Representative democracy"],
    tr: "ABD, halkın temsilciler seçtiği ve Anayasa'ya dayanan federal bir cumhuriyettir. En kolay cevap: \"Republic\".",
    hook: "Tek kelime yeter: REPUBLIC." },

  { id: 2, cat: "GOV_A", star: true, dyn: false, pers: null, note: null,
    q: "What is the supreme law of the land?",
    a: ["(U.S.) Constitution"],
    tr: "Anayasa (Constitution) ülkenin en üstün yasasıdır; diğer tüm yasalar ona uymak zorundadır.",
    hook: "Supreme = Constitution. \"Süpermen'in yasası Anayasa.\"" },

  { id: 3, cat: "GOV_A", star: false, dyn: false, pers: null, note: null,
    q: "Name one thing the U.S. Constitution does.",
    a: ["Forms the government", "Defines powers of government", "Defines the parts of government", "Protects the rights of the people"],
    tr: "Anayasa hükümeti kurar, yetkilerini tanımlar ve halkın haklarını korur. Bir tanesini söylemen yeterli.",
    hook: "Kur + Tanımla + Koru. En kolayı: \"Protects the rights of the people.\"" },

  { id: 4, cat: "GOV_A", star: false, dyn: false, pers: null, note: null,
    q: "The U.S. Constitution starts with the words “We the People.” What does “We the People” mean?",
    a: ["Self-government", "Popular sovereignty", "Consent of the governed", "People should govern themselves", "(Example of) social contract"],
    tr: "\"Biz Halk\" ifadesi, yönetme gücünün halktan geldiğini anlatır: halk kendi kendini yönetir.",
    hook: "We the People = halk yönetir → \"Self-government.\"" },

  { id: 5, cat: "GOV_A", star: false, dyn: false, pers: null, note: null,
    q: "How are changes made to the U.S. Constitution?",
    a: ["Amendments", "The amendment process"],
    tr: "Anayasa değişiklikleri \"amendment\" (değişiklik/ek madde) yoluyla yapılır.",
    hook: "Değişiklik = AMENDMENT. (Türkçedeki 'amenna' gibi: kabul edilen ek.)" },

  { id: 6, cat: "GOV_A", star: false, dyn: false, pers: null, note: null,
    q: "What does the Bill of Rights protect?",
    a: ["(The basic) rights of Americans", "(The basic) rights of people living in the United States"],
    tr: "Bill of Rights (ilk 10 anayasa değişikliği) Amerika'da yaşayan herkesin temel haklarını korur — sadece vatandaşların değil.",
    hook: "Bill of RIGHTS → RIGHTS'ı korur. Herkesin hakları." },

  { id: 7, cat: "GOV_A", star: true, dyn: false, pers: null, note: null,
    q: "How many amendments does the U.S. Constitution have?",
    a: ["Twenty-seven (27)"],
    tr: "Anayasada toplam 27 değişiklik vardır. Sayı sorusu — ezberle.",
    hook: "27 = 2+7... \"27 dolarlık amendment\". Yirmi yedi!" },

  { id: 8, cat: "GOV_A", star: false, dyn: false, pers: null, note: null,
    q: "Why is the Declaration of Independence important?",
    a: ["It says America is free from British control.", "It says all people are created equal.", "It identifies inherent rights.", "It identifies individual freedoms."],
    tr: "Bağımsızlık Bildirgesi Amerika'nın İngiltere'den bağımsız olduğunu ilan eder ve herkesin eşit yaratıldığını söyler.",
    hook: "Declaration = İngiltere'den ÖZGÜRLÜK + herkes EŞİT." },

  { id: 9, cat: "GOV_A", star: false, dyn: false, pers: null, note: null,
    q: "What founding document said the American colonies were free from Britain?",
    a: ["Declaration of Independence"],
    tr: "Kolonilerin İngiltere'den bağımsızlığını ilan eden kurucu belge Bağımsızlık Bildirgesi'dir (1776).",
    hook: "\"Free from Britain\" duyunca → Declaration of Independence." },

  { id: 10, cat: "GOV_A", star: false, dyn: false, pers: null, note: null,
    q: "Name two important ideas from the Declaration of Independence and the U.S. Constitution.",
    a: ["Equality", "Liberty", "Social contract", "Natural rights", "Limited government", "Self-government"],
    tr: "İKİ fikir söylemen gerekiyor. En kolay ikili: \"Equality and Liberty\" (eşitlik ve özgürlük).",
    hook: "E + L: Equality & Liberty. İki kelime, iki fikir." },

  { id: 11, cat: "GOV_A", star: false, dyn: false, pers: null, note: null,
    q: "The words “Life, Liberty, and the pursuit of Happiness” are in what founding document?",
    a: ["Declaration of Independence"],
    tr: "\"Yaşam, Özgürlük ve Mutluluğu Arama\" sözleri Bağımsızlık Bildirgesi'ndedir.",
    hook: "Life-Liberty-Happiness üçlüsü → Declaration (Jefferson'ın kalemi)." },

  { id: 12, cat: "GOV_A", star: true, dyn: false, pers: null, note: null,
    q: "What is the economic system of the United States?",
    a: ["Capitalism", "Free market economy"],
    tr: "ABD'nin ekonomik sistemi kapitalizm / serbest piyasa ekonomisidir.",
    hook: "Amerika = Kapitalizm. \"Capital\" zaten para demek." },

  { id: 13, cat: "GOV_A", star: false, dyn: false, pers: null, note: null,
    q: "What is the rule of law?",
    a: ["Everyone must follow the law.", "Leaders must obey the law.", "Government must obey the law.", "No one is above the law."],
    tr: "Hukukun üstünlüğü: hiç kimse — liderler ve hükümet dahil — yasaların üzerinde değildir.",
    hook: "\"No one is above the law\" — kimse yasadan büyük değil." },

  { id: 14, cat: "GOV_A", star: false, dyn: false, pers: null, note: null,
    q: "Many documents influenced the U.S. Constitution. Name one.",
    a: ["Declaration of Independence", "Articles of Confederation", "Federalist Papers", "Anti-Federalist Papers", "Virginia Declaration of Rights", "Fundamental Orders of Connecticut", "Mayflower Compact", "Iroquois Great Law of Peace"],
    tr: "Anayasayı etkileyen belgelerden birini söyle. En bilineni: Declaration of Independence.",
    hook: "Kolay yol: yine \"Declaration of Independence\" de." },

  { id: 15, cat: "GOV_A", star: false, dyn: false, pers: null, note: null,
    q: "There are three branches of government. Why?",
    a: ["So one part does not become too powerful", "Checks and balances", "Separation of powers"],
    tr: "Üç erk vardır ki hiçbiri aşırı güçlenmesin: denge ve denetim (checks and balances).",
    hook: "Neden 3? Tek el güçlenmesin → \"Checks and balances.\"" },

  /* ================= B: System of Government (16-62) ================= */

  { id: 16, cat: "GOV_B", star: false, dyn: false, pers: null, note: null,
    q: "Name the three branches of government.",
    a: ["Legislative, executive, and judicial", "Congress, president, and the courts"],
    tr: "Üç erk: yasama (Kongre), yürütme (Başkan), yargı (mahkemeler).",
    hook: "L-E-J: Legislative, Executive, Judicial. Ya da basitçe: Congress, President, Courts." },

  { id: 17, cat: "GOV_B", star: false, dyn: false, pers: null, note: null,
    q: "The President of the United States is in charge of which branch of government?",
    a: ["Executive branch"],
    tr: "Başkan yürütme erkinin (executive branch) başıdır.",
    hook: "President = EXECUTIVE (yönetici → yürütme)." },

  { id: 18, cat: "GOV_B", star: false, dyn: false, pers: null, note: null,
    q: "What part of the federal government writes laws?",
    a: ["(U.S.) Congress", "(U.S. or national) legislature", "Legislative branch"],
    tr: "Yasaları Kongre (yasama organı) yazar.",
    hook: "Yasa YAZAN = Congress. (Legis = yasa, Latince.)" },

  { id: 19, cat: "GOV_B", star: false, dyn: false, pers: null, note: null,
    q: "What are the two parts of the U.S. Congress?",
    a: ["Senate and House (of Representatives)"],
    tr: "Kongre iki kanatlıdır: Senato ve Temsilciler Meclisi.",
    hook: "S + H: Senate & House." },

  { id: 20, cat: "GOV_B", star: true, dyn: false, pers: null, note: null,
    q: "Name one power of the U.S. Congress.",
    a: ["Writes laws", "Declares war", "Makes the federal budget"],
    tr: "Kongre'nin yetkileri: yasa yazmak, savaş ilan etmek, federal bütçeyi yapmak. Biri yeterli.",
    hook: "Kongre'nin 3 silahı: Yasa, Savaş, Bütçe. En kolayı: \"Writes laws.\"" },

  { id: 21, cat: "GOV_B", star: false, dyn: false, pers: null, note: null,
    q: "How many U.S. senators are there?",
    a: ["One hundred (100)"],
    tr: "50 eyalet × 2 senatör = 100 senatör.",
    hook: "50 eyalet × 2 = 100." },

  { id: 22, cat: "GOV_B", star: false, dyn: false, pers: null, note: null,
    q: "How long is a term for a U.S. senator?",
    a: ["Six (6) years"],
    tr: "Bir senatörün görev süresi 6 yıldır.",
    hook: "Senatör = 6 yıl. (S harfi: Six-Senator.)" },

  { id: 23, cat: "GOV_B", star: false, dyn: true, pers: "senators",
    note: "Answers will vary. [District of Columbia residents and residents of U.S. territories should answer that D.C. (or the territory where the applicant lives) has no U.S. senators.]",
    q: "Who is one of your state’s U.S. senators now?",
    a: [],
    tr: "Tennessee'nin iki senatöründen BİRİNİN adını söyle. Mülakattan önce güncel isimleri mutlaka doğrula.",
    hook: "TN'nin 2 senatörü var — birini ezberle, ikisini bil." },

  { id: 24, cat: "GOV_B", star: false, dyn: false, pers: null, note: null,
    q: "How many voting members are in the House of Representatives?",
    a: ["Four hundred thirty-five (435)"],
    tr: "Temsilciler Meclisi'nde 435 oy hakkı olan üye vardır.",
    hook: "4-3-5: sayılar merdiven gibi iner çıkar → 435." },

  { id: 25, cat: "GOV_B", star: false, dyn: false, pers: null, note: null,
    q: "How long is a term for a member of the House of Representatives?",
    a: ["Two (2) years"],
    tr: "Temsilciler Meclisi üyesinin görev süresi 2 yıldır.",
    hook: "House = 2 yıl (kısa), Senate = 6 yıl (uzun)." },

  { id: 26, cat: "GOV_B", star: false, dyn: false, pers: null, note: null,
    q: "Why do U.S. representatives serve shorter terms than U.S. senators?",
    a: ["To more closely follow public opinion"],
    tr: "Temsilcilerin süresi kısadır ki halkın güncel görüşünü daha yakından yansıtsınlar.",
    hook: "Kısa süre = halkın nabzını yakından tut." },

  { id: 27, cat: "GOV_B", star: false, dyn: false, pers: null, note: null,
    q: "How many senators does each state have?",
    a: ["Two (2)"],
    tr: "Her eyaletin, nüfusu ne olursa olsun, 2 senatörü vardır.",
    hook: "Her eyalete 2 senatör — istisnasız." },

  { id: 28, cat: "GOV_B", star: false, dyn: false, pers: null, note: null,
    q: "Why does each state have two senators?",
    a: ["Equal representation (for small states)", "The Great Compromise (Connecticut Compromise)"],
    tr: "Küçük eyaletler de eşit temsil edilsin diye her eyalete 2 senatör verildi (Büyük Uzlaşma).",
    hook: "2 senatör = küçük eyalete EŞİTLİK sözü." },

  { id: 29, cat: "GOV_B", star: false, dyn: true, pers: "representative",
    note: "Answers will vary. [Residents of territories with nonvoting Delegates or Resident Commissioners may provide the name of that Delegate or Commissioner. Also acceptable is any statement that the territory has no (voting) representatives in Congress.]",
    q: "Name your U.S. representative.",
    a: [],
    tr: "Chattanooga, Tennessee'nin 3. kongre bölgesindedir (TN-3). Kendi temsilcinin adını söyle; mülakattan önce doğrula.",
    hook: "Chattanooga = TN-3 bölgesi. Temsilcinin adını ezberle." },

  { id: 30, cat: "GOV_B", star: true, dyn: true, pers: "speaker",
    note: "Visit uscis.gov/citizenship/testupdates for the name of the Speaker of the House of Representatives.",
    q: "What is the name of the Speaker of the House of Representatives now?",
    a: [],
    tr: "Temsilciler Meclisi Başkanı'nın adı seçimlere göre değişir. Mülakattan önce testupdates sayfasından doğrula.",
    hook: "Speaker = Meclisin 'konuşan' başı. Güncel ismi kontrol et!" },

  { id: 31, cat: "GOV_B", star: false, dyn: false, pers: null, note: null,
    q: "Who does a U.S. senator represent?",
    a: ["Citizens of their state", "People of their state"],
    tr: "Senatör kendi EYALETİNİN tüm halkını temsil eder.",
    hook: "Senatör → STATE (eyalet) halkı." },

  { id: 32, cat: "GOV_B", star: false, dyn: false, pers: null, note: null,
    q: "Who elects U.S. senators?",
    a: ["Citizens from their state"],
    tr: "Senatörleri kendi eyaletlerinin vatandaşları seçer.",
    hook: "Eyalet vatandaşı seçer → senatör eyaleti temsil eder." },

  { id: 33, cat: "GOV_B", star: false, dyn: false, pers: null, note: null,
    q: "Who does a member of the House of Representatives represent?",
    a: ["Citizens in their (congressional) district", "Citizens in their district", "People from their (congressional) district", "People in their district"],
    tr: "Temsilci kendi KONGRE BÖLGESİNİN (district) halkını temsil eder — senatörden farkı bu.",
    hook: "Representative → DISTRICT (bölge). Senatör → STATE." },

  { id: 34, cat: "GOV_B", star: false, dyn: false, pers: null, note: null,
    q: "Who elects members of the House of Representatives?",
    a: ["Citizens from their (congressional) district"],
    tr: "Temsilcileri kendi bölgelerinin (district) vatandaşları seçer.",
    hook: "Yine DISTRICT: bölge halkı seçer." },

  { id: 35, cat: "GOV_B", star: false, dyn: false, pers: null, note: null,
    q: "Some states have more representatives than other states. Why?",
    a: ["(Because of) the state’s population", "(Because) they have more people", "(Because) some states have more people"],
    tr: "Temsilci sayısı eyaletin NÜFUSUNA bağlıdır: nüfus çoksa temsilci de çoktur.",
    hook: "Çok insan = çok temsilci → POPULATION." },

  { id: 36, cat: "GOV_B", star: true, dyn: false, pers: null, note: null,
    q: "The President of the United States is elected for how many years?",
    a: ["Four (4) years"],
    tr: "Başkan 4 yıllığına seçilir.",
    hook: "Başkan = 4 yıl. (4 harfli kelime gibi: P-R-E-S... 4 yıl!)" },

  { id: 37, cat: "GOV_B", star: false, dyn: false, pers: null, note: null,
    q: "The President of the United States can serve only two terms. Why?",
    a: ["(Because of) the 22nd Amendment", "To keep the president from becoming too powerful"],
    tr: "22. Anayasa Değişikliği başkanı iki dönemle sınırlar — aşırı güçlenmesin diye.",
    hook: "2 dönem → 22. Amendment (iki-iki!)." },

  { id: 38, cat: "GOV_B", star: true, dyn: true, pers: "president",
    note: "Visit uscis.gov/citizenship/testupdates for the name of the President of the United States.",
    q: "What is the name of the President of the United States now?",
    a: [],
    tr: "Şu anki Başkan'ın adı. Seçimle değişir — mülakat gününden önce mutlaka doğrula.",
    hook: "Mülakat GÜNÜNDEKİ başkanı söylemelisin. Testupdates'e bak!" },

  { id: 39, cat: "GOV_B", star: true, dyn: true, pers: "vicepresident",
    note: "Visit uscis.gov/citizenship/testupdates for the name of the Vice President of the United States.",
    q: "What is the name of the Vice President of the United States now?",
    a: [],
    tr: "Şu anki Başkan Yardımcısı'nın adı. Seçimle değişir — mülakattan önce doğrula.",
    hook: "Başkan + yardımcısı ikili paket: ikisini birlikte ezberle." },

  { id: 40, cat: "GOV_B", star: false, dyn: false, pers: null, note: null,
    q: "If the president can no longer serve, who becomes president?",
    a: ["The Vice President (of the United States)"],
    tr: "Başkan görevini sürdüremezse yerine Başkan Yardımcısı geçer.",
    hook: "Yedek koltuk: Vice President." },

  { id: 41, cat: "GOV_B", star: false, dyn: false, pers: null, note: null,
    q: "Name one power of the president.",
    a: ["Signs bills into law", "Vetoes bills", "Enforces laws", "Commander in Chief (of the military)", "Chief diplomat", "Appoints federal judges"],
    tr: "Başkanın yetkilerinden biri: yasaları imzalar, veto eder, orduyu komuta eder... En kolayı: \"Signs bills into law.\"",
    hook: "Başkan İMZALAR ya da VETO eder. Bir tanesi yeter." },

  { id: 42, cat: "GOV_B", star: false, dyn: false, pers: null, note: null,
    q: "Who is Commander in Chief of the U.S. military?",
    a: ["The President (of the United States)"],
    tr: "Ordunun başkomutanı Başkan'dır.",
    hook: "Ordu kime bağlı? → President." },

  { id: 43, cat: "GOV_B", star: false, dyn: false, pers: null, note: null,
    q: "Who signs bills to become laws?",
    a: ["The President (of the United States)"],
    tr: "Yasa tasarılarını imzalayıp yasalaştıran Başkan'dır.",
    hook: "İmza yetkisi → President." },

  { id: 44, cat: "GOV_B", star: true, dyn: false, pers: null, note: null,
    q: "Who vetoes bills?",
    a: ["The President (of the United States)"],
    tr: "Yasa tasarılarını veto etme yetkisi Başkan'ındır.",
    hook: "Veto da imza da aynı elde: President." },

  { id: 45, cat: "GOV_B", star: false, dyn: false, pers: null, note: null,
    q: "Who appoints federal judges?",
    a: ["The President (of the United States)"],
    tr: "Federal yargıçları Başkan atar (Senato onaylar).",
    hook: "Yargıç ATAYAN → President." },

  { id: 46, cat: "GOV_B", star: false, dyn: false, pers: null, note: null,
    q: "The executive branch has many parts. Name one.",
    a: ["President (of the United States)", "Cabinet", "Federal departments and agencies"],
    tr: "Yürütme erkinin parçaları: Başkan, Kabine, federal bakanlıklar ve kurumlar.",
    hook: "En kısa cevap: \"President.\"" },

  { id: 47, cat: "GOV_B", star: false, dyn: false, pers: null, note: null,
    q: "What does the President’s Cabinet do?",
    a: ["Advises the President (of the United States)"],
    tr: "Kabine, Başkan'a danışmanlık yapar (tavsiye verir).",
    hook: "Cabinet = ADVISE (danışma dolabı!)." },

  { id: 48, cat: "GOV_B", star: false, dyn: false, pers: null, note: null,
    q: "What are two Cabinet-level positions?",
    a: ["Attorney General", "Secretary of Agriculture", "Secretary of Commerce", "Secretary of Education", "Secretary of Energy", "Secretary of Health and Human Services", "Secretary of Homeland Security", "Secretary of Housing and Urban Development", "Secretary of the Interior", "Secretary of Labor", "Secretary of State", "Secretary of Transportation", "Secretary of the Treasury", "Secretary of Veterans Affairs", "Secretary of War (Defense)", "Vice-President", "Administrator of the Environmental Protection Agency", "Director of the Central Intelligence Agency", "Director of the Office of Management and Budget", "Director of National Intelligence", "United States Trade Representative", "Administrator of the Small Business Administration"],
    tr: "İKİ kabine pozisyonu söyle. En kolay ikili: \"Secretary of State and Vice-President.\"",
    hook: "Ezber ikili: \"Secretary of State + Vice-President.\"" },

  { id: 49, cat: "GOV_B", star: false, dyn: false, pers: null, note: null,
    q: "Why is the Electoral College important?",
    a: ["It decides who is elected president.", "It provides a compromise between the popular election of the president and congressional selection."],
    tr: "Seçiciler Kurulu (Electoral College) başkanın kim olacağına karar veren sistemdir.",
    hook: "Electoral College = başkanı SEÇEN mekanizma." },

  { id: 50, cat: "GOV_B", star: false, dyn: false, pers: null, note: null,
    q: "What is one part of the judicial branch?",
    a: ["Supreme Court", "Federal Courts"],
    tr: "Yargı erkinin bir parçası: Yüksek Mahkeme (Supreme Court) veya federal mahkemeler.",
    hook: "Yargı deyince: SUPREME COURT." },

  { id: 51, cat: "GOV_B", star: false, dyn: false, pers: null, note: null,
    q: "What does the judicial branch do?",
    a: ["Reviews laws", "Explains laws", "Resolves disputes (disagreements) about the law", "Decides if a law goes against the (U.S.) Constitution"],
    tr: "Yargı erki yasaları inceler, açıklar, uyuşmazlıkları çözer ve yasaların Anayasa'ya uygunluğunu denetler.",
    hook: "Yargı = yasaları İNCELER (reviews laws)." },

  { id: 52, cat: "GOV_B", star: true, dyn: false, pers: null, note: null,
    q: "What is the highest court in the United States?",
    a: ["Supreme Court"],
    tr: "ABD'nin en yüksek mahkemesi Supreme Court'tur.",
    hook: "Highest = SUPREME. (Zaten adında 'en üstün' yazıyor.)" },

  { id: 53, cat: "GOV_B", star: false, dyn: false, pers: null, note: null,
    q: "How many seats are on the Supreme Court?",
    a: ["Nine (9)"],
    tr: "Yüksek Mahkeme'de 9 koltuk (yargıç) vardır.",
    hook: "Supreme Court = 9 yargıç. (Dokuz köşeli kürsü.)" },

  { id: 54, cat: "GOV_B", star: false, dyn: false, pers: null, note: null,
    q: "How many Supreme Court justices are usually needed to decide a case?",
    a: ["Five (5)"],
    tr: "Bir davanın karara bağlanması için genellikle 5 yargıcın (çoğunluk) oyu gerekir.",
    hook: "9'un çoğunluğu = 5." },

  { id: 55, cat: "GOV_B", star: false, dyn: false, pers: null, note: null,
    q: "How long do Supreme Court justices serve?",
    a: ["(For) life", "Lifetime appointment", "(Until) retirement"],
    tr: "Yüksek Mahkeme yargıçları ömür boyu (veya emekliliğe kadar) görev yapar.",
    hook: "Justice = ömür boyu → \"For life.\"" },

  { id: 56, cat: "GOV_B", star: false, dyn: false, pers: null, note: null,
    q: "Supreme Court justices serve for life. Why?",
    a: ["To be independent (of politics)", "To limit outside (political) influence"],
    tr: "Ömür boyu görev, yargıçları siyasetten bağımsız kılmak içindir.",
    hook: "Ömür boyu = siyasetten BAĞIMSIZLIK." },

  { id: 57, cat: "GOV_B", star: false, dyn: true, pers: "chiefjustice",
    note: "Visit uscis.gov/citizenship/testupdates for the name of the Chief Justice of the United States.",
    q: "Who is the Chief Justice of the United States now?",
    a: [],
    tr: "Yüksek Mahkeme Başkanı'nın adı atamayla değişebilir — mülakattan önce doğrula.",
    hook: "Chief Justice = Yüksek Mahkeme'nin başı. Güncel ismi kontrol et." },

  { id: 58, cat: "GOV_B", star: false, dyn: false, pers: null, note: null,
    q: "Name one power that is only for the federal government.",
    a: ["Print paper money", "Mint coins", "Declare war", "Create an army", "Make treaties", "Set foreign policy"],
    tr: "Sadece federal hükümetin yetkileri: para basmak, savaş ilan etmek, ordu kurmak, antlaşma yapmak...",
    hook: "PARA basmak sadece federal iştir → \"Print paper money.\"" },

  { id: 59, cat: "GOV_B", star: false, dyn: false, pers: null, note: null,
    q: "Name one power that is only for the states.",
    a: ["Provide schooling and education", "Provide protection (police)", "Provide safety (fire departments)", "Give a driver’s license", "Approve zoning and land use"],
    tr: "Sadece eyaletlerin yetkileri: okul/eğitim, polis, itfaiye, ehliyet vermek, imar onayı.",
    hook: "EHLİYETİ eyalet verir → \"Give a driver's license.\" (DMV'yi hatırla!)" },

  { id: 60, cat: "GOV_B", star: false, dyn: false, pers: null, note: null,
    q: "What is the purpose of the 10th Amendment?",
    a: ["(It states that the) powers not given to the federal government belong to the states or to the people."],
    tr: "10. Değişiklik: federal hükümete verilmeyen yetkiler eyaletlere veya halka aittir.",
    hook: "10. madde = artan yetkiler EYALETLERİN/HALKIN." },

  { id: 61, cat: "GOV_B", star: true, dyn: true, pers: "governor",
    note: "Answers will vary. [District of Columbia residents should answer that D.C. does not have a governor.]",
    q: "Who is the governor of your state now?",
    a: [],
    tr: "Tennessee valisinin adını söyle. Seçimle değişir — mülakattan önce doğrula.",
    hook: "TN'nin valisi — güncel ismi ezberle ve doğrula." },

  { id: 62, cat: "GOV_B", star: false, dyn: true, pers: "capital",
    note: "Answers will vary. [District of Columbia residents should answer that D.C. is not a state and does not have a capital. Residents of U.S. territories should name the capital of the territory.]",
    q: "What is the capital of your state?",
    a: [],
    tr: "Tennessee'nin başkenti Nashville'dir. (Chattanooga değil!)",
    hook: "TN başkenti = NASHVILLE (müzik şehri)." },

  /* ================= C: Rights and Responsibilities (63-72) ================= */

  { id: 63, cat: "GOV_C", star: false, dyn: false, pers: null, note: null,
    q: "There are four amendments to the U.S. Constitution about who can vote. Describe one of them.",
    a: ["Citizens eighteen (18) and older (can vote).", "You don’t have to pay (a poll tax) to vote.", "Any citizen can vote. (Women and men can vote.)", "A male citizen of any race (can vote)."],
    tr: "Oy hakkıyla ilgili 4 anayasa değişikliğinden birini anlat. En kolayı: \"18 yaş ve üzeri vatandaşlar oy verebilir.\"",
    hook: "\"Citizens 18 and older can vote.\" — bunu ezberle." },

  { id: 64, cat: "GOV_C", star: false, dyn: false, pers: null, note: null,
    q: "Who can vote in federal elections, run for federal office, and serve on a jury in the United States?",
    a: ["Citizens", "Citizens of the United States", "U.S. citizens"],
    tr: "Federal seçimde oy vermek, aday olmak ve jüride görev yapmak yalnızca VATANDAŞLARA özgüdür.",
    hook: "Hepsinin cevabı tek kelime: CITIZENS." },

  { id: 65, cat: "GOV_C", star: false, dyn: false, pers: null, note: null,
    q: "What are three rights of everyone living in the United States?",
    a: ["Freedom of expression", "Freedom of speech", "Freedom of assembly", "Freedom to petition the government", "Freedom of religion", "The right to bear arms"],
    tr: "ÜÇ hak saymalısın. Kolay üçlü: \"Freedom of speech, freedom of religion, freedom of assembly.\"",
    hook: "3xFreedom: Speech + Religion + Assembly." },

  { id: 66, cat: "GOV_C", star: true, dyn: false, pers: null, note: null,
    q: "What do we show loyalty to when we say the Pledge of Allegiance?",
    a: ["The United States", "The flag"],
    tr: "Bağlılık Yemini'nde ABD'ye ve bayrağa bağlılık gösterilir.",
    hook: "Pledge → FLAG (bayrağa el basma sahnesini düşün)." },

  { id: 67, cat: "GOV_C", star: false, dyn: false, pers: null, note: null,
    q: "Name two promises that new citizens make in the Oath of Allegiance.",
    a: ["Give up loyalty to other countries", "Defend the (U.S.) Constitution", "Obey the laws of the United States", "Serve in the military (if needed)", "Serve (help, do important work for) the nation (if needed)", "Be loyal to the United States"],
    tr: "Yemin töreninde verilen İKİ sözü söyle. Kolay ikili: \"Defend the Constitution and obey the laws of the United States.\"",
    hook: "İkili söz: Anayasayı SAVUN + yasalara UY." },

  { id: 68, cat: "GOV_C", star: false, dyn: false, pers: null, note: null,
    q: "How can people become United States citizens?",
    a: ["Be born in the United States, under the conditions set by the 14th Amendment", "Naturalize", "Derive citizenship (under conditions set by Congress)"],
    tr: "Vatandaşlık yolları: ABD'de doğmak, naturalizasyon (senin yolun!) veya türetilmiş vatandaşlık.",
    hook: "Senin cevabın hazır: \"Naturalize\" — şu an yaptığın şey!" },

  { id: 69, cat: "GOV_C", star: false, dyn: false, pers: null, note: null,
    q: "What are two examples of civic participation in the United States?",
    a: ["Vote", "Run for office", "Join a political party", "Help with a campaign", "Join a civic group", "Join a community group", "Give an elected official your opinion (on an issue)", "Contact elected officials", "Support or oppose an issue or policy", "Write to a newspaper"],
    tr: "İKİ sivil katılım örneği: oy vermek, aday olmak, partiye katılmak... Kolay ikili: \"Vote and run for office.\"",
    hook: "\"Vote + Run for office\" — iki kısa örnek." },

  { id: 70, cat: "GOV_C", star: false, dyn: false, pers: null, note: null,
    q: "What is one way Americans can serve their country?",
    a: ["Vote", "Pay taxes", "Obey the law", "Serve in the military", "Run for office", "Work for local, state, or federal government"],
    tr: "Ülkeye hizmet yolları: oy vermek, vergi ödemek, yasalara uymak, askerlik... Biri yeterli.",
    hook: "En kısa: \"Vote.\" (Ya da \"Pay taxes\" — zaten yapıyorsun.)" },

  { id: 71, cat: "GOV_C", star: false, dyn: false, pers: null, note: null,
    q: "Why is it important to pay federal taxes?",
    a: ["Required by law", "All people pay to fund the federal government", "Required by the (U.S.) Constitution (16th Amendment)", "Civic duty"],
    tr: "Federal vergi ödemek yasal zorunluluktur ve federal hükümeti finanse eder.",
    hook: "Vergi = \"Required by law\" (yasa emrediyor)." },

  { id: 72, cat: "GOV_C", star: false, dyn: false, pers: null, note: null,
    q: "It is important for all men age 18 through 25 to register for the Selective Service. Name one reason why.",
    a: ["Required by law", "Civic duty", "Makes the draft fair, if needed"],
    tr: "18-25 yaş erkeklerin Selective Service kaydı yasal zorunluluktur; gerekirse askere almayı adil kılar.",
    hook: "Selective Service = \"Required by law.\" (Aynı kolay cevap.)" },

  /* ================= AMERICAN HISTORY A: Colonial Period and Independence (73-89) ================= */

  { id: 73, cat: "HIST_A", star: false, dyn: false, pers: null, note: null,
    q: "The colonists came to America for many reasons. Name one.",
    a: ["Freedom", "Political liberty", "Religious freedom", "Economic opportunity", "Escape persecution"],
    tr: "Kolonistler Amerika'ya özgürlük, dini özgürlük, ekonomik fırsat veya zulümden kaçmak için geldi.",
    hook: "Tek kelime yeter: \"Freedom.\"" },

  { id: 74, cat: "HIST_A", star: true, dyn: false, pers: null, note: null,
    q: "Who lived in America before the Europeans arrived?",
    a: ["American Indians", "Native Americans"],
    tr: "Avrupalılardan önce Amerika'da Amerikan Yerlileri (Native Americans) yaşıyordu.",
    hook: "Önce YERLİLER vardı: Native Americans." },

  { id: 75, cat: "HIST_A", star: false, dyn: false, pers: null, note: null,
    q: "What group of people was taken and sold as slaves?",
    a: ["Africans", "People from Africa"],
    tr: "Köle olarak alınıp satılan insanlar Afrikalılardı.",
    hook: "Köle ticareti → Africans." },

  { id: 76, cat: "HIST_A", star: false, dyn: false, pers: null, note: null,
    q: "What war did the Americans fight to win independence from Britain?",
    a: ["American Revolution", "The (American) Revolutionary War", "War for (American) Independence"],
    tr: "İngiltere'den bağımsızlık için verilen savaş: Amerikan Devrimi (Revolutionary War).",
    hook: "Bağımsızlık savaşı = REVOLUTION." },

  { id: 77, cat: "HIST_A", star: false, dyn: false, pers: null, note: null,
    q: "Name one reason why the Americans declared independence from Britain.",
    a: ["High taxes", "Taxation without representation", "British soldiers stayed in Americans’ houses (boarding, quartering)", "They did not have self-government", "Boston Massacre", "Boston Tea Party (Tea Act)", "Stamp Act", "Sugar Act", "Townshend Acts", "Intolerable (Coercive) Acts"],
    tr: "Bağımsızlık ilanının nedenlerinden biri: yüksek vergiler, temsilsiz vergilendirme, öz yönetim eksikliği...",
    hook: "\"High taxes\" — iki kelime, en kolay neden." },

  { id: 78, cat: "HIST_A", star: true, dyn: false, pers: null, note: null,
    q: "Who wrote the Declaration of Independence?",
    a: ["(Thomas) Jefferson"],
    tr: "Bağımsızlık Bildirgesi'ni Thomas Jefferson yazdı.",
    hook: "Declaration'ın kalemi: JEFFERSON." },

  { id: 79, cat: "HIST_A", star: false, dyn: false, pers: null, note: null,
    q: "When was the Declaration of Independence adopted?",
    a: ["July 4, 1776"],
    tr: "Bağımsızlık Bildirgesi 4 Temmuz 1776'da kabul edildi — bugünkü Independence Day.",
    hook: "4 Temmuz 1776. (4 July = havai fişek günü.)" },

  { id: 80, cat: "HIST_A", star: false, dyn: false, pers: null, note: null,
    q: "The American Revolution had many important events. Name one.",
    a: ["(Battle of) Bunker Hill", "Declaration of Independence", "Washington Crossing the Delaware (Battle of Trenton)", "(Battle of) Saratoga", "Valley Forge (Encampment)", "(Battle of) Yorktown (British surrender at Yorktown)"],
    tr: "Devrimin önemli olaylarından biri: Bunker Hill, Bağımsızlık Bildirgesi, Saratoga, Yorktown...",
    hook: "Kolay cevap: yine \"Declaration of Independence.\"" },

  { id: 81, cat: "HIST_A", star: false, dyn: false, pers: null, note: null,
    q: "There were 13 original states. Name five.",
    a: ["New Hampshire", "Massachusetts", "Rhode Island", "Connecticut", "New York", "New Jersey", "Pennsylvania", "Delaware", "Maryland", "Virginia", "North Carolina", "South Carolina", "Georgia"],
    tr: "13 kurucu eyaletten BEŞİNİ say. Kolay beşli: New York, New Jersey, Virginia, Georgia, Maryland.",
    hook: "NY + NJ + Virginia + Georgia + Maryland — 5'li ezber paketi." },

  { id: 82, cat: "HIST_A", star: false, dyn: false, pers: null, note: null,
    q: "What founding document was written in 1787?",
    a: ["(U.S.) Constitution"],
    tr: "1787'de yazılan kurucu belge Anayasa'dır. (1776 = Declaration, 1787 = Constitution.)",
    hook: "1776 Bildirge, 1787 Anayasa. \"87 = Constitution.\"" },

  { id: 83, cat: "HIST_A", star: false, dyn: false, pers: null, note: null,
    q: "The Federalist Papers supported the passage of the U.S. Constitution. Name one of the writers.",
    a: ["(James) Madison", "(Alexander) Hamilton", "(John) Jay", "Publius"],
    tr: "Federalist Yazıları'nın yazarları: Madison, Hamilton, Jay (ortak takma ad: Publius).",
    hook: "Müzikalden hatırla: HAMILTON." },

  { id: 84, cat: "HIST_A", star: false, dyn: false, pers: null, note: null,
    q: "Why were the Federalist Papers important?",
    a: ["They helped people understand the (U.S.) Constitution.", "They supported passing the (U.S.) Constitution."],
    tr: "Federalist Yazıları halkın Anayasa'yı anlamasına ve kabul edilmesine yardımcı oldu.",
    hook: "Federalist Papers = Anayasa'nın REKLAM kampanyası." },

  { id: 85, cat: "HIST_A", star: false, dyn: false, pers: null, note: null,
    q: "Benjamin Franklin is famous for many things. Name one.",
    a: ["Founded the first free public libraries", "First Postmaster General of the United States", "Helped write the Declaration of Independence", "Inventor", "U.S. diplomat"],
    tr: "Benjamin Franklin: mucit, diplomat, ilk Posta Genel Müdürü, ücretsiz kütüphanelerin kurucusu.",
    hook: "Tek kelimelik cevap: \"Inventor.\" (100 dolarlık banknottaki adam.)" },

  { id: 86, cat: "HIST_A", star: true, dyn: false, pers: null, note: null,
    q: "George Washington is famous for many things. Name one.",
    a: ["“Father of Our Country”", "First president of the United States", "General of the Continental Army", "President of the Constitutional Convention"],
    tr: "George Washington: ilk başkan, \"Ülkemizin Babası\", Kıta Ordusu'nun generali.",
    hook: "Washington = FIRST PRESIDENT (1 dolarlık banknot)." },

  { id: 87, cat: "HIST_A", star: false, dyn: false, pers: null, note: null,
    q: "Thomas Jefferson is famous for many things. Name one.",
    a: ["Writer of the Declaration of Independence", "Third president of the United States", "Doubled the size of the United States (Louisiana Purchase)", "First Secretary of State", "Founded the University of Virginia", "Writer of the Virginia Statute on Religious Freedom"],
    tr: "Jefferson: Bağımsızlık Bildirgesi'nin yazarı, 3. başkan, Louisiana Alımı ile ülkeyi ikiye katladı.",
    hook: "Jefferson = Declaration'ın YAZARI (soru 78 ile aynı bilgi!)." },

  { id: 88, cat: "HIST_A", star: false, dyn: false, pers: null, note: null,
    q: "James Madison is famous for many things. Name one.",
    a: ["“Father of the Constitution”", "Fourth president of the United States", "President during the War of 1812", "One of the writers of the Federalist Papers"],
    tr: "Madison: \"Anayasa'nın Babası\", 4. başkan, Federalist Yazıları'nın yazarlarından.",
    hook: "Madison = Father of the CONSTITUTION. (Washington ülkenin, Madison Anayasa'nın babası.)" },

  { id: 89, cat: "HIST_A", star: false, dyn: false, pers: null, note: null,
    q: "Alexander Hamilton is famous for many things. Name one.",
    a: ["First Secretary of the Treasury", "One of the writers of the Federalist Papers", "Helped establish the First Bank of the United States", "Aide to General George Washington", "Member of the Continental Congress"],
    tr: "Hamilton: ilk Hazine Bakanı, Federalist Yazıları'nın yazarlarından, ilk ABD bankasının kurucularından.",
    hook: "Hamilton = PARA adamı → \"First Secretary of the Treasury\" (10 dolarlık banknot)." },

  /* ================= B: 1800s (90-99) ================= */

  { id: 90, cat: "HIST_B", star: false, dyn: false, pers: null, note: null,
    q: "What territory did the United States buy from France in 1803?",
    a: ["Louisiana Territory", "Louisiana"],
    tr: "ABD 1803'te Fransa'dan Louisiana Bölgesi'ni satın aldı (ülkenin yüzölçümünü ikiye katladı).",
    hook: "Fransa'dan alınan → LOUISIANA (Fransızca isimli eyalet!)." },

  { id: 91, cat: "HIST_B", star: false, dyn: false, pers: null, note: null,
    q: "Name one war fought by the United States in the 1800s.",
    a: ["War of 1812", "Mexican-American War", "Civil War", "Spanish-American War"],
    tr: "1800'lerdeki savaşlar: 1812 Savaşı, Meksika-Amerika, İç Savaş, İspanya-Amerika. Biri yeterli.",
    hook: "En kolayı: \"Civil War.\"" },

  { id: 92, cat: "HIST_B", star: false, dyn: false, pers: null, note: null,
    q: "Name the U.S. war between the North and the South.",
    a: ["The Civil War"],
    tr: "Kuzey ile Güney arasındaki savaş İç Savaş'tır (1861-1865).",
    hook: "North vs South = CIVIL WAR." },

  { id: 93, cat: "HIST_B", star: false, dyn: false, pers: null, note: null,
    q: "The Civil War had many important events. Name one.",
    a: ["(Battle of) Fort Sumter", "Emancipation Proclamation", "(Battle of) Vicksburg", "(Battle of) Gettysburg", "Sherman’s March", "(Surrender at) Appomattox", "(Battle of) Antietam/Sharpsburg", "Lincoln was assassinated."],
    tr: "İç Savaş'ın önemli olaylarından biri: Gettysburg Savaşı, Özgürlük Bildirisi, Lincoln suikastı...",
    hook: "Ezber cevap: \"Battle of Gettysburg.\"" },

  { id: 94, cat: "HIST_B", star: true, dyn: false, pers: null, note: null,
    q: "Abraham Lincoln is famous for many things. Name one.",
    a: ["Freed the slaves (Emancipation Proclamation)", "Saved (or preserved) the Union", "Led the United States during the Civil War", "16th president of the United States", "Delivered the Gettysburg Address"],
    tr: "Lincoln: köleleri özgürleştirdi, Birliği korudu, İç Savaş'ta ülkeyi yönetti, 16. başkan.",
    hook: "Lincoln = FREED THE SLAVES (5 dolarlık banknot)." },

  { id: 95, cat: "HIST_B", star: false, dyn: false, pers: null, note: null,
    q: "What did the Emancipation Proclamation do?",
    a: ["Freed the slaves", "Freed slaves in the Confederacy", "Freed slaves in the Confederate states", "Freed slaves in most Southern states"],
    tr: "Özgürlük Bildirisi (1863) köleleri — özellikle Konfederasyon eyaletlerindekileri — özgürleştirdi.",
    hook: "Emancipation = ÖZGÜRLEŞTİRME → \"Freed the slaves.\"" },

  { id: 96, cat: "HIST_B", star: false, dyn: false, pers: null, note: null,
    q: "What U.S. war ended slavery?",
    a: ["The Civil War"],
    tr: "Köleliği bitiren savaş İç Savaş'tır.",
    hook: "Kölelik bitti → CIVIL WAR sayesinde." },

  { id: 97, cat: "HIST_B", star: false, dyn: false, pers: null, note: null,
    q: "What amendment says all persons born or naturalized in the United States, and subject to the jurisdiction thereof, are U.S. citizens?",
    a: ["14th Amendment"],
    tr: "14. Değişiklik: ABD'de doğan veya naturalize olan herkes ABD vatandaşıdır. (Senin vatandaşlığının anayasal temeli!)",
    hook: "Vatandaşlık maddesi = 14. Amendment." },

  { id: 98, cat: "HIST_B", star: false, dyn: false, pers: null, note: null,
    q: "When did all men get the right to vote?",
    a: ["After the Civil War", "During Reconstruction", "(With the) 15th Amendment", "1870"],
    tr: "Tüm erkekler oy hakkını İç Savaş'tan sonra, 1870'te 15. Değişiklik ile aldı.",
    hook: "Erkekler = 15. Amendment / 1870. (Kadınlar 1920 — soru 102.)" },

  { id: 99, cat: "HIST_B", star: false, dyn: false, pers: null, note: null,
    q: "Name one leader of the women’s rights movement in the 1800s.",
    a: ["Susan B. Anthony", "Elizabeth Cady Stanton", "Sojourner Truth", "Harriet Tubman", "Lucretia Mott", "Lucy Stone"],
    tr: "1800'lerin kadın hakları liderlerinden biri: Susan B. Anthony en bilineni.",
    hook: "Kadın hakları = SUSAN B. ANTHONY (dolar coininde yüzü var)." },

  /* ================= C: Recent American History (100-118) ================= */

  { id: 100, cat: "HIST_C", star: false, dyn: false, pers: null, note: null,
    q: "Name one war fought by the United States in the 1900s.",
    a: ["World War I", "World War II", "Korean War", "Vietnam War", "(Persian) Gulf War"],
    tr: "1900'lerdeki savaşlar: I. ve II. Dünya Savaşı, Kore, Vietnam, Körfez. Biri yeterli.",
    hook: "En kolay: \"World War II.\"" },

  { id: 101, cat: "HIST_C", star: false, dyn: false, pers: null, note: null,
    q: "Why did the United States enter World War I?",
    a: ["Because Germany attacked U.S. (civilian) ships", "To support the Allied Powers (England, France, Italy, and Russia)", "To oppose the Central Powers (Germany, Austria-Hungary, the Ottoman Empire, and Bulgaria)"],
    tr: "ABD I. Dünya Savaşı'na Almanya'nın ABD gemilerine saldırması üzerine girdi.",
    hook: "WWI nedeni: Almanya GEMİLERE saldırdı." },

  { id: 102, cat: "HIST_C", star: false, dyn: false, pers: null, note: null,
    q: "When did all women get the right to vote?",
    a: ["1920", "After World War I", "(With the) 19th Amendment"],
    tr: "Kadınlar oy hakkını 1920'de, 19. Değişiklik ile aldı.",
    hook: "Kadınlar = 1920 / 19. Amendment. (19 → 1920, sayılar yan yana.)" },

  { id: 103, cat: "HIST_C", star: false, dyn: false, pers: null, note: null,
    q: "What was the Great Depression?",
    a: ["Longest economic recession in modern history"],
    tr: "Büyük Buhran, modern tarihin en uzun ekonomik durgunluğuydu.",
    hook: "Great Depression = en UZUN ekonomik kriz." },

  { id: 104, cat: "HIST_C", star: false, dyn: false, pers: null, note: null,
    q: "When did the Great Depression start?",
    a: ["The Great Crash (1929)", "Stock market crash of 1929"],
    tr: "Büyük Buhran 1929 borsa çöküşüyle başladı.",
    hook: "1929 = borsa ÇÖKTÜ, buhran başladı." },

  { id: 105, cat: "HIST_C", star: false, dyn: false, pers: null, note: null,
    q: "Who was president during the Great Depression and World War II?",
    a: ["(Franklin) Roosevelt"],
    tr: "Buhran ve II. Dünya Savaşı döneminin başkanı Franklin Roosevelt'ti (FDR).",
    hook: "Kriz + Savaş = ROOSEVELT (FDR, 4 dönem)." },

  { id: 106, cat: "HIST_C", star: false, dyn: false, pers: null, note: null,
    q: "Why did the United States enter World War II?",
    a: ["(Bombing of) Pearl Harbor", "Japanese attacked Pearl Harbor", "To support the Allied Powers (England, France, and Russia)", "To oppose the Axis Powers (Germany, Italy, and Japan)"],
    tr: "ABD II. Dünya Savaşı'na Japonya'nın Pearl Harbor saldırısı üzerine girdi.",
    hook: "WWII nedeni: PEARL HARBOR." },

  { id: 107, cat: "HIST_C", star: false, dyn: false, pers: null, note: null,
    q: "Dwight Eisenhower is famous for many things. Name one.",
    a: ["General during World War II", "President at the end of (during) the Korean War", "34th president of the United States", "Signed the Federal-Aid Highway Act of 1956 (Created the Interstate System)"],
    tr: "Eisenhower: II. Dünya Savaşı generali, 34. başkan, eyaletlerarası otoyol sisteminin kurucusu.",
    hook: "Eisenhower = WWII GENERALİ (sonra başkan)." },

  { id: 108, cat: "HIST_C", star: false, dyn: false, pers: null, note: null,
    q: "Who was the United States’ main rival during the Cold War?",
    a: ["Soviet Union", "USSR", "Russia"],
    tr: "Soğuk Savaş'ta ABD'nin ana rakibi Sovyetler Birliği'ydi.",
    hook: "Cold War rakibi = SOVIET UNION." },

  { id: 109, cat: "HIST_C", star: false, dyn: false, pers: null, note: null,
    q: "During the Cold War, what was one main concern of the United States?",
    a: ["Communism", "Nuclear war"],
    tr: "Soğuk Savaş'ta ABD'nin ana endişesi komünizm (ve nükleer savaş) idi.",
    hook: "Soğuk Savaş korkusu: COMMUNISM." },

  { id: 110, cat: "HIST_C", star: false, dyn: false, pers: null, note: null,
    q: "Why did the United States enter the Korean War?",
    a: ["To stop the spread of communism"],
    tr: "ABD Kore Savaşı'na komünizmin yayılmasını durdurmak için girdi.",
    hook: "Kore = komünizmi DURDUR." },

  { id: 111, cat: "HIST_C", star: false, dyn: false, pers: null, note: null,
    q: "Why did the United States enter the Vietnam War?",
    a: ["To stop the spread of communism"],
    tr: "Vietnam Savaşı'nın nedeni de aynı: komünizmin yayılmasını durdurmak.",
    hook: "Kore ve Vietnam'ın cevabı AYNI: \"To stop the spread of communism.\"" },

  { id: 112, cat: "HIST_C", star: false, dyn: false, pers: null, note: null,
    q: "What did the civil rights movement do?",
    a: ["Fought to end racial discrimination"],
    tr: "Sivil haklar hareketi ırk ayrımcılığını bitirmek için mücadele etti.",
    hook: "Civil rights = ırk AYRIMCILIĞINA karşı savaş." },

  { id: 113, cat: "HIST_C", star: true, dyn: false, pers: null, note: null,
    q: "Martin Luther King, Jr. is famous for many things. Name one.",
    a: ["Fought for civil rights", "Worked for equality for all Americans", "Worked to ensure that people would “not be judged by the color of their skin, but by the content of their character”"],
    tr: "MLK: sivil haklar için mücadele etti, tüm Amerikalılar için eşitlik istedi.",
    hook: "MLK = CIVIL RIGHTS (\"I have a dream\")." },

  { id: 114, cat: "HIST_C", star: false, dyn: false, pers: null, note: null,
    q: "Why did the United States enter the Persian Gulf War?",
    a: ["To force the Iraqi military from Kuwait"],
    tr: "ABD Körfez Savaşı'na Irak ordusunu Kuveyt'ten çıkarmak için girdi.",
    hook: "Körfez = Irak'ı KUVEYT'ten çıkar." },

  { id: 115, cat: "HIST_C", star: true, dyn: false, pers: null, note: null,
    q: "What major event happened on September 11, 2001 in the United States?",
    a: ["Terrorists attacked the United States", "Terrorists took over two planes and crashed them into the World Trade Center in New York City", "Terrorists took over a plane and crashed into the Pentagon in Arlington, Virginia", "Terrorists took over a plane originally aimed at Washington, D.C., and crashed in a field in Pennsylvania"],
    tr: "11 Eylül 2001'de teröristler ABD'ye saldırdı.",
    hook: "Kısa cevap: \"Terrorists attacked the United States.\"" },

  { id: 116, cat: "HIST_C", star: false, dyn: false, pers: null, note: null,
    q: "Name one U.S. military conflict after the September 11, 2001 attacks.",
    a: ["(Global) War on Terror", "War in Afghanistan", "War in Iraq"],
    tr: "11 Eylül sonrası çatışmalar: Terörle Savaş, Afganistan Savaşı, Irak Savaşı.",
    hook: "9/11 sonrası → \"War in Afghanistan.\"" },

  { id: 117, cat: "HIST_C", star: false, dyn: false, pers: null,
    q: "Name one American Indian tribe in the United States.",
    a: ["Apache", "Blackfeet", "Cayuga", "Cherokee", "Cheyenne", "Chippewa", "Choctaw", "Creek", "Crow", "Hopi", "Huron", "Inupiat", "Lakota", "Mohawk", "Mohegan", "Navajo", "Oneida", "Onondaga", "Pueblo", "Seminole", "Seneca", "Shawnee", "Sioux", "Teton", "Tuscarora"],
    note: "For a complete list of tribes, please visit bia.gov.",
    tr: "Bir Amerikan Yerli kabilesi söyle. Tennessee için en anlamlısı: Cherokee (bu bölgenin tarihi halkı).",
    hook: "Chattanooga'da yaşıyorsun → CHEROKEE de." },

  { id: 118, cat: "HIST_C", star: false, dyn: false, pers: null, note: null,
    q: "Name one example of an American innovation.",
    a: ["Light bulb", "Automobile (cars, internal combustion engine)", "Skyscrapers", "Airplane", "Assembly line", "Landing on the moon", "Integrated circuit (IC)"],
    tr: "Amerikan buluşlarından biri: ampul, uçak, montaj hattı, aya iniş...",
    hook: "En kısa: \"Light bulb\" (Edison)." },

  /* ================= SYMBOLS (119-124) ================= */

  { id: 119, cat: "SYM", star: false, dyn: false, pers: null, note: null,
    q: "What is the capital of the United States?",
    a: ["Washington, D.C."],
    tr: "ABD'nin başkenti Washington, D.C.'dir. (Washington eyaleti ile karıştırma!)",
    hook: "Başkent = Washington, D.C. — \"D.C.\" demeyi unutma." },

  { id: 120, cat: "SYM", star: false, dyn: false, pers: null,
    q: "Where is the Statue of Liberty?",
    a: ["New York (Harbor)", "Liberty Island"],
    note: "Also acceptable are New Jersey, near New York City, and on the Hudson (River).",
    tr: "Özgürlük Heykeli New York Limanı'nda, Liberty Adası'ndadır.",
    hook: "Özgürlük Heykeli = NEW YORK." },

  { id: 121, cat: "SYM", star: true, dyn: false, pers: null, note: null,
    q: "Why does the flag have 13 stripes?",
    a: ["(Because there were) 13 original colonies", "(Because the stripes) represent the original colonies"],
    tr: "Bayraktaki 13 çizgi, 13 kurucu koloniyi temsil eder.",
    hook: "13 çizgi = 13 KOLONİ." },

  { id: 122, cat: "SYM", star: false, dyn: false, pers: null, note: null,
    q: "Why does the flag have 50 stars?",
    a: ["(Because there is) one star for each state", "(Because) each star represents a state", "(Because there are) 50 states"],
    tr: "Bayraktaki 50 yıldız, 50 eyaleti temsil eder — her eyalete bir yıldız.",
    hook: "50 yıldız = 50 EYALET. (Çizgi koloni, yıldız eyalet.)" },

  { id: 123, cat: "SYM", star: false, dyn: false, pers: null, note: null,
    q: "What is the name of the national anthem?",
    a: ["The Star-Spangled Banner"],
    tr: "Milli marşın adı \"The Star-Spangled Banner\"dır (Yıldızlarla Süslü Bayrak).",
    hook: "Marş = STAR-SPANGLED BANNER (maç öncesi söylenen)." },

  { id: 124, cat: "SYM", star: false, dyn: false, pers: null, note: null,
    q: "The Nation’s first motto was “E Pluribus Unum.” What does that mean?",
    a: ["Out of many, one", "We all become one"],
    tr: "\"E Pluribus Unum\" Latincedir: \"Çokluktan birlik\" — birçok eyaletten/insandan tek ulus.",
    hook: "E Pluribus Unum = \"Out of many, one\" (bozuk paraların üstünde yazar)." },

  /* ================= HOLIDAYS (125-128) ================= */

  { id: 125, cat: "HOL", star: false, dyn: false, pers: null, note: null,
    q: "What is Independence Day?",
    a: ["A holiday to celebrate U.S. independence (from Britain)", "The country’s birthday"],
    tr: "Independence Day (4 Temmuz), ABD'nin İngiltere'den bağımsızlığını kutlayan bayramdır — ülkenin doğum günü.",
    hook: "4 Temmuz = ülkenin DOĞUM GÜNÜ." },

  { id: 126, cat: "HOL", star: true, dyn: false, pers: null, note: null,
    q: "Name three national U.S. holidays.",
    a: ["New Year’s Day", "Martin Luther King, Jr. Day", "Presidents Day (Washington’s Birthday)", "Memorial Day", "Juneteenth", "Independence Day", "Labor Day", "Columbus Day", "Veterans Day", "Thanksgiving Day", "Christmas Day"],
    tr: "ÜÇ ulusal bayram say. Kolay üçlü: \"Christmas, Thanksgiving, Independence Day.\"",
    hook: "3'lü paket: Christmas + Thanksgiving + Independence Day." },

  { id: 127, cat: "HOL", star: false, dyn: false, pers: null, note: null,
    q: "What is Memorial Day?",
    a: ["A holiday to honor soldiers who died in military service"],
    tr: "Memorial Day (Mayıs), askerlik görevinde ÖLEN askerleri anma günüdür.",
    hook: "Memorial = ÖLENLERİ anma. (Veterans Day ile karıştırma!)" },

  { id: 128, cat: "HOL", star: false, dyn: false, pers: null, note: null,
    q: "What is Veterans Day?",
    a: ["A holiday to honor people in the (U.S.) military", "A holiday to honor people who have served (in the U.S. military)"],
    tr: "Veterans Day (Kasım), orduda görev yapmış/yapan HERKESİ onurlandırma günüdür (yaşayanlar dahil).",
    hook: "Veterans = HİZMET EDENLER (yaşayanlar). Memorial = ölenler." }
];

/* Kişiselleştirilmiş cevap tanımları — Settings'ten okunur */
const PERSONALIZED = {
  senators:      { label: "Tennessee ABD Senatörleri (2 kişi)", settingKeys: ["senator1", "senator2"], answerTemplate: (s) => [s.senator1, s.senator2].filter(Boolean) },
  representative:{ label: "TN-3 (Chattanooga) Temsilcisi",      settingKeys: ["representative"],       answerTemplate: (s) => [s.representative].filter(Boolean) },
  speaker:       { label: "Temsilciler Meclisi Başkanı",         settingKeys: ["speaker"],              answerTemplate: (s) => [s.speaker].filter(Boolean) },
  president:     { label: "ABD Başkanı",                          settingKeys: ["president"],            answerTemplate: (s) => [s.president].filter(Boolean) },
  vicepresident: { label: "ABD Başkan Yardımcısı",                settingKeys: ["vicepresident"],        answerTemplate: (s) => [s.vicepresident].filter(Boolean) },
  chiefjustice:  { label: "Yüksek Mahkeme Başkanı",               settingKeys: ["chiefjustice"],         answerTemplate: (s) => [s.chiefjustice].filter(Boolean) },
  governor:      { label: "Tennessee Valisi",                     settingKeys: ["governor"],             answerTemplate: (s) => [s.governor].filter(Boolean) },
  capital:       { label: "Tennessee Eyalet Başkenti",            settingKeys: ["capital"],              answerTemplate: (s) => [s.capital].filter(Boolean) }
};

/* Varsayılan yetkili isimleri — SON BİLİNEN değerler, kalıcı gerçek DEĞİL.
 * Kullanıcı Ayarlar ekranından düzenler; uygulama testupdates uyarısı gösterir. */
const DEFAULT_OFFICIALS = {
  president:      "Donald Trump",
  vicepresident:  "JD Vance",
  speaker:        "Mike Johnson",
  chiefjustice:   "John Roberts",
  governor:       "Bill Lee",
  senator1:       "Marsha Blackburn",
  senator2:       "Bill Hagerty",
  representative: "Chuck Fleischmann",
  capital:        "Nashville"
};

/* Bir sorunun etkin (çalışılabilir) cevap listesini döndürür */
function effectiveAnswers(question, officials) {
  if (question.pers && PERSONALIZED[question.pers]) {
    const fromSettings = PERSONALIZED[question.pers].answerTemplate(officials || DEFAULT_OFFICIALS);
    if (fromSettings.length) return fromSettings;
  }
  return question.a;
}
