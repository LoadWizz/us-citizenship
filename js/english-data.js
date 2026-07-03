/* =========================================================================
 * english-data.js — USCIS İngilizce testi: resmi okuma/yazma kelime listeleri
 * ve dikte pratiği cümleleri.
 * Kaynak: USCIS Reading Vocabulary (M-715) ve Writing Vocabulary (M-716).
 * ========================================================================= */
"use strict";

const READING_VOCAB = [
  { group: "Kişiler (People)", words: ["Abraham Lincoln", "George Washington"] },
  { group: "Yurttaşlık (Civics)", words: ["American flag", "Bill of Rights", "capital", "citizen", "city", "Congress", "country", "Father of Our Country", "government", "President", "right", "Senators", "state / states", "White House"] },
  { group: "Yerler (Places)", words: ["America", "United States", "U.S."] },
  { group: "Bayramlar (Holidays)", words: ["Presidents' Day", "Memorial Day", "Flag Day", "Independence Day", "Labor Day", "Columbus Day", "Thanksgiving"] },
  { group: "Soru Kelimeleri (Question Words)", words: ["how", "what", "when", "where", "who", "why"] },
  { group: "Fiiller (Verbs)", words: ["can", "come", "do / does", "elects", "have / has", "is / are / was / be", "lives / lived", "meet", "name", "pay", "vote", "want"] },
  { group: "Diğer — İşlev (Function)", words: ["a", "for", "here", "in", "of", "on", "the", "to", "we"] },
  { group: "Diğer — İçerik (Content)", words: ["colors", "dollar bill", "first", "largest", "many", "most", "north", "one", "people", "second", "south"] }
];

const WRITING_VOCAB = [
  { group: "Kişiler (People)", words: ["Adams", "Lincoln", "Washington"] },
  { group: "Yurttaşlık (Civics)", words: ["American Indians", "capital", "citizens", "Civil War", "Congress", "Father of Our Country", "flag", "free", "freedom of speech", "President", "right", "Senators", "state / states", "White House"] },
  { group: "Yerler (Places)", words: ["Alaska", "California", "Canada", "Delaware", "Mexico", "New York City", "United States", "Washington", "Washington, D.C."] },
  { group: "Aylar (Months)", words: ["February", "May", "June", "July", "September", "October", "November"] },
  { group: "Bayramlar (Holidays)", words: ["Presidents' Day", "Memorial Day", "Flag Day", "Independence Day", "Labor Day", "Columbus Day", "Thanksgiving"] },
  { group: "Fiiller (Verbs)", words: ["can", "come", "elect", "have / has", "is / was / be", "lives / lived", "meets", "pay", "vote", "want"] },
  { group: "Diğer — İşlev (Function)", words: ["and", "during", "for", "here", "in", "of", "on", "the", "to", "we"] },
  { group: "Diğer — İçerik (Content)", words: ["blue", "dollar bill", "fifty / 50", "first", "free", "largest", "most", "north", "one", "one hundred / 100", "people", "red", "second", "south", "taxes", "white"] }
];

/* Dikte + sesli okuma pratiği cümleleri.
 * Resmi kelime listelerinden türetilmiş, sınav formatına uygun cümleler.
 * Gerçek sınavda: memur 1 cümle okur → sen yazarsın (3 hakkın var, 1 doğru yeter).
 * Okuma testi: 1 cümleyi sesli okursun (3 hakkın var, 1 doğru yeter). */
const ENGLISH_SENTENCES = [
  { en: "Citizens can vote.",                                    tr: "Vatandaşlar oy verebilir." },
  { en: "Citizens have the right to vote.",                      tr: "Vatandaşların oy verme hakkı vardır." },
  { en: "We elect the President.",                               tr: "Başkanı biz seçeriz." },
  { en: "The President lives in the White House.",               tr: "Başkan Beyaz Saray'da yaşar." },
  { en: "The White House is in Washington, D.C.",                tr: "Beyaz Saray Washington D.C.'dedir." },
  { en: "Congress meets in Washington, D.C.",                    tr: "Kongre Washington D.C.'de toplanır." },
  { en: "The capital of the United States is Washington, D.C.", tr: "ABD'nin başkenti Washington D.C.'dir." },
  { en: "Washington is the Father of Our Country.",              tr: "Washington, Ülkemizin Babası'dır." },
  { en: "Washington was the first President.",                   tr: "Washington ilk başkandı." },
  { en: "Adams was the second President.",                       tr: "Adams ikinci başkandı." },
  { en: "Lincoln was the President during the Civil War.",       tr: "Lincoln, İç Savaş sırasındaki başkandı." },
  { en: "The American flag is red, white, and blue.",            tr: "Amerikan bayrağı kırmızı, beyaz ve mavidir." },
  { en: "The flag has fifty stars.",                             tr: "Bayrakta elli yıldız vardır." },
  { en: "Senators are elected by the people.",                   tr: "Senatörler halk tarafından seçilir." },
  { en: "The people elect Congress.",                            tr: "Kongreyi halk seçer." },
  { en: "People pay taxes.",                                     tr: "İnsanlar vergi öder." },
  { en: "People want to be free.",                               tr: "İnsanlar özgür olmak ister." },
  { en: "The largest state is Alaska.",                          tr: "En büyük eyalet Alaska'dır." },
  { en: "California has the most people.",                       tr: "En çok nüfus California'dadır." },
  { en: "Canada is north of the United States.",                 tr: "Kanada, ABD'nin kuzeyindedir." },
  { en: "Mexico is south of the United States.",                 tr: "Meksika, ABD'nin güneyindedir." },
  { en: "Independence Day is in July.",                          tr: "Bağımsızlık Günü temmuzdadır." },
  { en: "Memorial Day is in May.",                               tr: "Anma Günü mayıstadır." },
  { en: "Flag Day is in June.",                                  tr: "Bayrak Günü haziranda." },
  { en: "Labor Day is in September.",                            tr: "İşçi Bayramı eylüldedir." },
  { en: "Columbus Day is in October.",                           tr: "Kolomb Günü ekimdedir." },
  { en: "Thanksgiving is in November.",                          tr: "Şükran Günü kasımdadır." },
  { en: "Presidents' Day is in February.",                       tr: "Başkanlar Günü şubattadır." }
];
