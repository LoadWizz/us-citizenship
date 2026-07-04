/* =========================================================================
 * best.js — "En kolay cevap" küratörlüğü
 *
 * Çok cevaplı sorularda kullanıcının EZBERLEMESİ GEREKEN en basit/kısa
 * cevap(lar) renkli vurgulanır. Soru "Name two/three/five" istiyorsa tam
 * o sayıda cevap işaretlidir — kullanıcı ezber setini net görür.
 *
 * Bilimsel gerekçe: seçim yükünü kaldırmak (Hick yasası) + tek tutarlı
 * cevabın tekrarı (retrieval practice aynı ize vurur — encoding
 * variability değil, sınavda hız ve kesinlik hedefliyoruz).
 * Soru içi renkli İPUCU ↔ renkli EN KOLAY CEVAP çifti, çağrışım bağını
 * görselleştirir (paired-associate learning).
 *
 * Değerler data.js'teki a dizisinin İNDEKSLERİDİR (selfcheck doğrular:
 * indeks aralıkta + çok-cevaplı pers-olmayan her soruda kayıt var).
 * Tek cevaplı ve kişiselleştirilmiş (pers) sorularda kayıt YOKTUR.
 * ========================================================================= */
"use strict";

const BEST_ANSWERS = {
  1:   [0],        // Republic
  3:   [3],        // Protects the rights of the people
  4:   [0],        // Self-government
  5:   [0],        // Amendments
  6:   [0],        // (The basic) rights of Americans
  8:   [0],        // It says America is free from British control.
  10:  [0, 1],     // Equality + Liberty (iki fikir istenir)
  12:  [0],        // Capitalism
  13:  [3],        // No one is above the law.
  14:  [0],        // Declaration of Independence
  15:  [1],        // Checks and balances
  16:  [1],        // Congress, president, and the courts (daha basit kelimeler)
  18:  [0],        // (U.S.) Congress
  20:  [0],        // Writes laws
  28:  [0],        // Equal representation (for small states)
  31:  [1],        // People of their state
  33:  [1],        // Citizens in their district
  35:  [1],        // (Because) they have more people
  37:  [0],        // (Because of) the 22nd Amendment
  41:  [0],        // Signs bills into law
  46:  [0],        // President (of the United States)
  48:  [10, 15],   // Secretary of State + Vice-President (iki pozisyon istenir)
  49:  [0],        // It decides who is elected president.
  50:  [0],        // Supreme Court
  51:  [0],        // Reviews laws
  55:  [0],        // (For) life
  56:  [0],        // To be independent (of politics)
  58:  [0],        // Print paper money
  59:  [3],        // Give a driver's license
  63:  [0],        // Citizens eighteen (18) and older (can vote).
  64:  [0],        // Citizens
  65:  [1, 4, 2],  // speech + religion + assembly (üç hak istenir)
  66:  [1],        // The flag
  67:  [1, 2],     // Defend the Constitution + Obey the laws (iki söz istenir)
  68:  [1],        // Naturalize
  69:  [0, 1],     // Vote + Run for office (iki örnek istenir)
  70:  [0],        // Vote
  71:  [0],        // Required by law
  72:  [0],        // Required by law
  73:  [0],        // Freedom
  74:  [1],        // Native Americans
  75:  [0],        // Africans
  76:  [0],        // American Revolution
  77:  [0],        // High taxes
  80:  [1],        // Declaration of Independence
  81:  [4, 5, 9, 12, 8], // New York, New Jersey, Virginia, Georgia, Maryland (beş eyalet)
  83:  [1],        // (Alexander) Hamilton
  84:  [1],        // They supported passing the (U.S.) Constitution.
  85:  [3],        // Inventor
  86:  [1],        // First president of the United States
  87:  [0],        // Writer of the Declaration of Independence
  88:  [0],        // "Father of the Constitution"
  89:  [0],        // First Secretary of the Treasury
  90:  [1],        // Louisiana
  91:  [2],        // Civil War
  93:  [3],        // (Battle of) Gettysburg
  94:  [0],        // Freed the slaves (Emancipation Proclamation)
  95:  [0],        // Freed the slaves
  98:  [3],        // 1870 (söylemesi en kolay)
  99:  [0],        // Susan B. Anthony
  100: [1],        // World War II
  101: [0],        // Because Germany attacked U.S. (civilian) ships
  102: [0],        // 1920
  104: [0],        // The Great Crash (1929)
  106: [0],        // (Bombing of) Pearl Harbor
  107: [0],        // General during World War II
  108: [0],        // Soviet Union
  109: [0],        // Communism
  113: [0],        // Fought for civil rights
  115: [0],        // Terrorists attacked the United States
  116: [1],        // War in Afghanistan
  117: [3],        // Cherokee (Chattanooga'nın tarihi halkı!)
  118: [0],        // Light bulb
  120: [0],        // New York (Harbor)
  121: [0],        // (Because there were) 13 original colonies
  122: [2],        // (Because there are) 50 states
  124: [0],        // Out of many, one
  125: [1],        // The country's birthday
  126: [10, 9, 5], // Christmas + Thanksgiving + Independence Day (üç bayram)
  128: [0]         // A holiday to honor people in the (U.S.) military
};

/* Bir sorunun önerilen cevap indeksleri (yoksa null) */
function bestIndicesOf(q) {
  return BEST_ANSWERS[q.id] || null;
}
