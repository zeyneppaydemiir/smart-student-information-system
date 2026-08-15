const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const WORD_MAP = [
  ["Yapay Zeka",        "Artificial Intelligence"],
  ["Makine Öğrenmesi",  "Machine Learning"],
  ["Matematik",         "Mathematics"],
  ["Fizik",             "Physics"],
  ["Kimya",             "Chemistry"],
  ["Bilgisayar",        "Computer"],
  ["Mühendisliği",      "Engineering"],
  ["Yazılım",           "Software"],
  ["Donanım",           "Hardware"],
  ["Veri",              "Data"],
  ["Yapıları",          "Structures"],
  ["Algoritma",         "Algorithms"],
  ["Programlama",       "Programming"],
  ["Veritabanı",        "Database"],
  ["Ağ",                "Network"],
  ["Sistem",            "Systems"],
  ["Analiz",            "Analysis"],
  ["Tasarım",           "Design"],
  ["Proje",             "Project"],
  ["Bitirme",           "Graduation"],
  ["Seçmeli",           "Elective"],
  ["Teknik",            "Technical"],
  ["İleri",             "Advanced"],
  ["Konular",           "Topics"],
  ["Giriş",             "Introduction"],
  ["Temel",             "Fundamentals"],
  ["Yönetimi",          "Management"],
  ["Güvenlik",          "Security"],
  ["İşletim",           "Operating"],
  ["Derleyici",         "Compiler"],
  ["Mimari",            "Architecture"],
  ["Hesaplama",         "Computing"],
  ["Mobil",             "Mobile"],
  ["Web",               "Web"],
  ["Test",              "Testing"],
  ["Kalite",            "Quality"],
];

const TURKISH_CHARS = /[ğĞüÜşŞıİöÖçÇ]/;

function translate(name) {
  if (!name) return name;
  if (!TURKISH_CHARS.test(name)) return name;

  let result = name;
  for (const [tr, en] of WORD_MAP) {
    const regex = new RegExp(tr, "g");
    result = result.replace(regex, en);
  }
  return result;
}

async function main() {
  console.log("Translating Course records...");
  const courses = await prisma.course.findMany();
  let courseUpdated = 0;
  for (const c of courses) {
    const nameEn = translate(c.courseName) || c.courseName;
    await prisma.course.update({
      where: { id: c.id },
      data: { courseNameEn: nameEn },
    });
    courseUpdated++;
  }
  console.log(`  Updated ${courseUpdated} Course records.`);

  console.log("Translating Curriculum records...");
  const curriculumItems = await prisma.curriculum.findMany();
  let currUpdated = 0;
  for (const c of curriculumItems) {
    const nameEn = translate(c.courseName) || c.courseName;
    await prisma.curriculum.update({
      where: { id: c.id },
      data: { courseNameEn: nameEn },
    });
    currUpdated++;
  }
  console.log(`  Updated ${currUpdated} Curriculum records.`);

  console.log("Translating TranscriptCourse records...");
  const tcItems = await prisma.transcriptCourse.findMany();
  let tcUpdated = 0;
  for (const tc of tcItems) {
    const nameEn = translate(tc.courseName) || tc.courseName;
    await prisma.transcriptCourse.update({
      where: { id: tc.id },
      data: { courseNameEn: nameEn },
    });
    tcUpdated++;
  }
  console.log(`  Updated ${tcUpdated} TranscriptCourse records.`);

  console.log("Translation complete.");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
