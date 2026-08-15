const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// Whole-phrase overrides — checked first, most specific wins
const PHRASE_MAP = {
  "Atatürk İlkeleri ve İnkılap Tarihi I":       "Atatürk's Principles and History of Revolution I",
  "Atatürk İlkeleri ve İnkılap Tarihi II":      "Atatürk's Principles and History of Revolution II",
  "Türk Dili I":                                 "Turkish Language I",
  "Türk Dili II":                                "Turkish Language II",
  "İş Sağlığı ve Güvenliği I":                  "Occupational Health and Safety I",
  "İş Sağlığı ve Güvenliği II":                 "Occupational Health and Safety II",
  "Mühendislik İngilizcesi I":                   "Engineering English I",
  "Mühendislik İngilizcesi II":                  "Engineering English II",
  "Mühendislik Matematiği I":                    "Engineering Mathematics I",
  "Mühendislik Matematiği II":                   "Engineering Mathematics II",
  "Bilgisayar Mühendisliğine Giriş":             "Introduction to Computer Engineering",
  "Problem Çözme Teknikleri":                    "Problem Solving Techniques",
  "Genel Kimya":                                 "General Chemistry",
  "Ayrık Matematik":                             "Discrete Mathematics",
  "Doğrusal Cebir":                              "Linear Algebra",
  "Nesne Tabanlı Programlama":                   "Object-Oriented Programming",
  "İnsan Bilgisayar Etkileşimi":                 "Human-Computer Interaction",
  "Dosya Organizasyonu":                         "File Organization",
  "Programlama Dilleri":                         "Programming Languages",
  "Veri Etiği":                                  "Data Ethics",
  "Algoritma Tasarımı ve Analizi":               "Algorithm Design and Analysis",
  "Staj I":                                      "Internship I",
  "Staj II":                                     "Internship II",
  "Sistem Geliştirme İçin Veri Modelleme":       "Data Modeling for System Development",
  "Gereksinimlerin Belirlenmesi ve Analizi":     "Requirements Elicitation and Analysis",
  "Yazılım Test Doğrulama ve Analizi":           "Software Testing, Verification and Analysis",
  "Yazılım Mühendisliği Bitirme Tasarımı I":    "Software Engineering Capstone Design I",
  "Yazılım Mühendisliği Bitirme Tasarımı II":   "Software Engineering Capstone Design II",
  "Yazılım Mühendisliğinde İleri Konular":       "Advanced Topics in Software Engineering",
  "Kültür Seçmeli Ders I":                       "Cultural Elective Course I",
  "Kültür Seçmeli Ders II":                      "Cultural Elective Course II",
  "Teknik Seçmeli Ders I":                       "Technical Elective Course I",
  "Teknik Seçmeli Ders II":                      "Technical Elective Course II",
  "Teknik Seçmeli Ders III":                     "Technical Elective Course III",
  "Teknik Seçmeli Ders IV":                      "Technical Elective Course IV",
  "Teknik Seçmeli Ders V":                       "Technical Elective Course V",
  "Teknik Seçmeli Ders VI":                      "Technical Elective Course VI",
  "Teknik Seçmeli Ders VII":                     "Technical Elective Course VII",
  "Teknik Seçmeli Ders VIII":                    "Technical Elective Course VIII",
  "Teknik Seçmeli Ders IX":                      "Technical Elective Course IX",
  "Teknik Seçmeli Ders X":                       "Technical Elective Course X",
  "Teknik Seçmeli Ders XI":                      "Technical Elective Course XI",
  "Teknik Seçmeli Ders XII":                     "Technical Elective Course XII",
  "Veri Yapıları ve Algoritmalar":               "Data Structures and Algorithms",
  "Diferansiyel Denklemler":                     "Differential Equations",
  "İstatistik ve Olasılık":                      "Statistics and Probability",
  "Veritabanı Sistemleri":                       "Database Systems",
  "İşletim Sistemleri":                          "Operating Systems",
  "Fizik I":                                     "Physics I",
  "Fizik II":                                    "Physics II",
  "Bilgisayar Programlama":                      "Computer Programming",
};

// Word-by-word fallback map
const WORD_MAP = {
  "Matematik": "Mathematics", "Matematiği": "Mathematics",
  "Fizik": "Physics",
  "Kimya": "Chemistry",
  "İstatistik": "Statistics", "Olasılık": "Probability",
  "Diferansiyel": "Differential", "Denklemler": "Equations",
  "Sayısal": "Numerical", "Yöntemler": "Methods",
  "Bilgisayar": "Computer",
  "Mühendisliği": "Engineering", "Mühendislik": "Engineering",
  "Mühendisliğinde": "Engineering", "Mühendisliğine": "Engineering",
  "Yazılım": "Software", "Donanım": "Hardware",
  "Programlama": "Programming",
  "Algoritma": "Algorithms", "Algoritmalar": "Algorithms",
  "Veri": "Data", "Veritabanı": "Database",
  "Yapıları": "Structures", "Yapısı": "Structure",
  "Sistem": "Systems", "Sistemler": "Systems", "Sistemleri": "Systems",
  "Ağ": "Networks",
  "İşletim": "Operating",
  "Dağıtık": "Distributed", "Paralel": "Parallel",
  "Bulut": "Cloud", "Gömülü": "Embedded",
  "Yapay": "Artificial", "Zeka": "Intelligence",
  "Makine": "Machine", "Öğrenmesi": "Learning",
  "Görüntü": "Image", "İşleme": "Processing",
  "Tasarım": "Design", "Tasarımı": "Design",
  "Analiz": "Analysis", "Analizi": "Analysis",
  "Test": "Testing",
  "Güvenlik": "Security", "Güvenliği": "Security",
  "Derleyici": "Compiler", "Mimari": "Architecture",
  "Hesaplama": "Computing",
  "Geliştirme": "Development", "Uygulama": "Application",
  "Oyun": "Game", "Mobil": "Mobile",
  "Ses": "Audio", "Sinyal": "Signal",
  "Kontrol": "Control", "Robotik": "Robotics",
  "Elektronik": "Electronics", "Devreler": "Circuits",
  "Giriş": "Introduction", "Temel": "Fundamentals",
  "İleri": "Advanced", "Konular": "Topics",
  "Seçmeli": "Elective", "Teknik": "Technical",
  "Ders": "Course",
  "Proje": "Project", "Bitirme": "Graduation",
  "Yönetimi": "Management", "Yönetim": "Management",
  "Mesleki": "Professional", "Etik": "Ethics", "Etiği": "Ethics",
  "Ekonomi": "Economics", "Hukuk": "Law",
  "İngilizce": "English", "İngilizcesi": "English",
  "Türkçe": "Turkish", "Dili": "Language",
  "Türk": "Turkish",
  "Genel": "General",
  "Nesne": "Object", "Tabanlı": "Oriented",
  "İnsan": "Human", "Etkileşimi": "Interaction",
  "Dilleri": "Languages",
  "Ayrık": "Discrete",
  "Doğrusal": "Linear", "Cebir": "Algebra",
  "Staj": "Internship",
  "Dosya": "File", "Organizasyonu": "Organization",
  "Modelleme": "Modeling",
  "Gereksinimlerin": "Requirements", "Belirlenmesi": "Elicitation",
  "Doğrulama": "Verification",
  "Kültür": "Cultural",
  "İçin": "for",
  "ve": "and",
  "I": "I", "II": "II", "III": "III", "IV": "IV", "V": "V",
  "VI": "VI", "VII": "VII", "VIII": "VIII", "IX": "IX", "X": "X",
  "XI": "XI", "XII": "XII",
};

function translate(name) {
  if (!name) return name;
  if (PHRASE_MAP[name]) return PHRASE_MAP[name];
  const words = name.split(" ");
  return words.map(w => WORD_MAP[w] !== undefined ? WORD_MAP[w] : w).join(" ");
}

async function main() {
  const items = await prisma.curriculum.findMany();
  let updated = 0;

  for (const c of items) {
    const nameEn = translate(c.courseName);
    await prisma.curriculum.update({ where: { id: c.id }, data: { courseNameEn: nameEn } });
    console.log(`  "${c.courseName}" → "${nameEn}"`);
    updated++;
  }

  console.log(`\nDone: ${updated} records updated.`);
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
