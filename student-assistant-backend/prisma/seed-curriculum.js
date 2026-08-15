const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const DEPARTMENT = "Bilgisayar Mühendisliği";

const CURRICULUM = [
  // 1. Sınıf Güz
  { year: 1, semester: "Güz",   courseCode: "ATA 103", courseName: "Atatürk İlkeleri ve İnkılap Tarihi I", type: "Z", credits: 2, ects: 2  },
  { year: 1, semester: "Güz",   courseCode: "CENG 101", courseName: "Bilgisayar Mühendisliğine Giriş",      type: "Z", credits: 3, ects: 2  },
  { year: 1, semester: "Güz",   courseCode: "CENG 111", courseName: "Bilgisayar Programlama",               type: "Z", credits: 4, ects: 6  },
  { year: 1, semester: "Güz",   courseCode: "ENG 113",  courseName: "Mühendislik İngilizcesi I",            type: "Z", credits: 3, ects: 4  },
  { year: 1, semester: "Güz",   courseCode: "MAT 123",  courseName: "Mühendislik Matematiği I",             type: "Z", credits: 4, ects: 6  },
  { year: 1, semester: "Güz",   courseCode: "PHY 101",  courseName: "Fizik I",                              type: "Z", credits: 4, ects: 6  },
  { year: 1, semester: "Güz",   courseCode: "SOC 137",  courseName: "İş Sağlığı ve Güvenliği I",            type: "Z", credits: 1, ects: 2  },
  { year: 1, semester: "Güz",   courseCode: "TUR 105",  courseName: "Türk Dili I",                          type: "Z", credits: 2, ects: 2  },

  // 1. Sınıf Bahar
  { year: 1, semester: "Bahar", courseCode: "ATA 104",  courseName: "Atatürk İlkeleri ve İnkılap Tarihi II", type: "Z", credits: 2, ects: 2  },
  { year: 1, semester: "Bahar", courseCode: "CENG 114", courseName: "Problem Çözme Teknikleri",              type: "Z", credits: 3, ects: 6  },
  { year: 1, semester: "Bahar", courseCode: "CHEM 101", courseName: "Genel Kimya",                           type: "Z", credits: 3, ects: 4  },
  { year: 1, semester: "Bahar", courseCode: "ENG 114",  courseName: "Mühendislik İngilizcesi II",            type: "Z", credits: 3, ects: 4  },
  { year: 1, semester: "Bahar", courseCode: "MAT 124",  courseName: "Mühendislik Matematiği II",             type: "Z", credits: 4, ects: 6  },
  { year: 1, semester: "Bahar", courseCode: "PHY 102",  courseName: "Fizik II",                              type: "Z", credits: 4, ects: 6  },
  { year: 1, semester: "Bahar", courseCode: "TUR 106",  courseName: "Türk Dili II",                          type: "Z", credits: 2, ects: 2  },

  // 2. Sınıf Güz
  { year: 2, semester: "Güz",   courseCode: "CENG 201", courseName: "Veri Yapıları ve Algoritmalar",        type: "Z", credits: 3, ects: 6  },
  { year: 2, semester: "Güz",   courseCode: "MAT 201",  courseName: "Ayrık Matematik",                      type: "Z", credits: 3, ects: 6  },
  { year: 2, semester: "Güz",   courseCode: "MAT 221",  courseName: "Doğrusal Cebir",                       type: "Z", credits: 3, ects: 6  },
  { year: 2, semester: "Güz",   courseCode: "SENG 211", courseName: "Nesne Tabanlı Programlama",            type: "Z", credits: 4, ects: 5  },
  { year: 2, semester: "Güz",   courseCode: "SENG 213", courseName: "İnsan Bilgisayar Etkileşimi",          type: "Z", credits: 3, ects: 6  },
  { year: 2, semester: "Güz",   courseCode: "SENG 215", courseName: "Dosya Organizasyonu",                  type: "Z", credits: 1, ects: 1  },

  // 2. Sınıf Bahar
  { year: 2, semester: "Bahar", courseCode: "CENG 223", courseName: "Programlama Dilleri",                  type: "Z", credits: 3, ects: 7  },
  { year: 2, semester: "Bahar", courseCode: "MAT 224",  courseName: "Diferansiyel Denklemler",              type: "Z", credits: 3, ects: 6  },
  { year: 2, semester: "Bahar", courseCode: "SENG 200", courseName: "Staj I",                               type: "Z", credits: 0, ects: 5  },
  { year: 2, semester: "Bahar", courseCode: "SENG 224", courseName: "Veri Etiği",                           type: "Z", credits: 1, ects: 1  },
  { year: 2, semester: "Bahar", courseCode: "SENG 226", courseName: "Algoritma Tasarımı ve Analizi",        type: "Z", credits: 3, ects: 5  },
  { year: 2, semester: "Bahar", courseCode: "ELEC 1",   courseName: "Teknik Seçmeli Ders I",                type: "S", credits: 3, ects: 6  },

  // 3. Sınıf Güz
  { year: 3, semester: "Güz",   courseCode: "CENG 301", courseName: "Veritabanı Sistemleri",               type: "Z", credits: 4, ects: 6  },
  { year: 3, semester: "Güz",   courseCode: "CENG 305", courseName: "İşletim Sistemleri",                  type: "Z", credits: 3, ects: 6  },
  { year: 3, semester: "Güz",   courseCode: "STAT 301", courseName: "İstatistik ve Olasılık",              type: "Z", credits: 3, ects: 6  },
  { year: 3, semester: "Güz",   courseCode: "ELEC 2",   courseName: "Teknik Seçmeli Ders II",              type: "S", credits: 3, ects: 6  },
  { year: 3, semester: "Güz",   courseCode: "ELEC 3",   courseName: "Teknik Seçmeli Ders III",             type: "S", credits: 3, ects: 6  },

  // 3. Sınıf Bahar
  { year: 3, semester: "Bahar", courseCode: "SENG 300", courseName: "Staj II",                             type: "Z", credits: 0, ects: 5  },
  { year: 3, semester: "Bahar", courseCode: "SENG 322", courseName: "Sistem Geliştirme İçin Veri Modelleme", type: "Z", credits: 3, ects: 7 },
  { year: 3, semester: "Bahar", courseCode: "SENG 324", courseName: "Gereksinimlerin Belirlenmesi ve Analizi", type: "Z", credits: 3, ects: 6 },
  { year: 3, semester: "Bahar", courseCode: "ELEC 4",   courseName: "Teknik Seçmeli Ders IV",              type: "S", credits: 3, ects: 6  },
  { year: 3, semester: "Bahar", courseCode: "ELEC 5",   courseName: "Teknik Seçmeli Ders V",               type: "S", credits: 3, ects: 6  },

  // 4. Sınıf Güz
  { year: 4, semester: "Güz",   courseCode: "SENG 413", courseName: "Yazılım Test Doğrulama ve Analizi",   type: "Z", credits: 4, ects: 6  },
  { year: 4, semester: "Güz",   courseCode: "SENG 495", courseName: "Yazılım Mühendisliği Bitirme Tasarımı I", type: "Z", credits: 3, ects: 6 },
  { year: 4, semester: "Güz",   courseCode: "ELEC 6",   courseName: "Teknik Seçmeli Ders VI",              type: "S", credits: 3, ects: 6  },
  { year: 4, semester: "Güz",   courseCode: "ELEC 7",   courseName: "Teknik Seçmeli Ders VII",             type: "S", credits: 3, ects: 6  },
  { year: 4, semester: "Güz",   courseCode: "ELEC 8",   courseName: "Kültür Seçmeli Ders I",               type: "S", credits: 3, ects: 3  },
  { year: 4, semester: "Güz",   courseCode: "ELEC 9",   courseName: "Kültür Seçmeli Ders II",              type: "S", credits: 3, ects: 3  },

  // 4. Sınıf Bahar
  { year: 4, semester: "Bahar", courseCode: "SENG 422", courseName: "Yazılım Mühendisliğinde İleri Konular",    type: "Z", credits: 3, ects: 6 },
  { year: 4, semester: "Bahar", courseCode: "SENG 496", courseName: "Yazılım Mühendisliği Bitirme Tasarımı II", type: "Z", credits: 3, ects: 6 },
  { year: 4, semester: "Bahar", courseCode: "ELEC 10",  courseName: "Teknik Seçmeli Ders X",               type: "S", credits: 3, ects: 6  },
  { year: 4, semester: "Bahar", courseCode: "ELEC 11",  courseName: "Teknik Seçmeli Ders XI",              type: "S", credits: 3, ects: 6  },
  { year: 4, semester: "Bahar", courseCode: "ELEC 12",  courseName: "Teknik Seçmeli Ders XII",             type: "S", credits: 3, ects: 6  },
];

async function main() {
  console.log(`Mevcut "${DEPARTMENT}" kayıtları siliniyor…`);
  await prisma.curriculum.deleteMany({ where: { department: DEPARTMENT } });

  console.log(`${CURRICULUM.length} ders ekleniyor…`);
  const result = await prisma.curriculum.createMany({
    data: CURRICULUM.map((c) => ({ ...c, department: DEPARTMENT })),
  });

  console.log(`✓ ${result.count} ders Curriculum tablosuna eklendi.`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
