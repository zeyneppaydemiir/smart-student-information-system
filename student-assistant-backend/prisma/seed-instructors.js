const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcrypt");
const prisma = new PrismaClient();

const INSTRUCTORS = [
  {
    email: "mehmet@uni.edu.tr",
    password: "123456",
    fullName: "Mehmet Yılmaz",
    title: "Dr.",
    department: "Bilgisayar Mühendisliği",
  },
  {
    email: "ayse@uni.edu.tr",
    password: "123456",
    fullName: "Ayşe Kara",
    title: "Prof. Dr.",
    department: "Bilgisayar Mühendisliği",
  },
  {
    email: "ali@uni.edu.tr",
    password: "123456",
    fullName: "Ali Demir",
    title: "Doç. Dr.",
    department: "Bilgisayar Mühendisliği",
  },
];

async function main() {
  console.log("Mevcut Instructor kayıtları siliniyor…");
  await prisma.instructor.deleteMany({});

  console.log("3 demo öğretim üyesi ekleniyor…");
  for (const inst of INSTRUCTORS) {
    const passwordHash = await bcrypt.hash(inst.password, 10);
    await prisma.instructor.create({
      data: {
        email: inst.email,
        passwordHash,
        fullName: inst.fullName,
        title: inst.title,
        department: inst.department,
      },
    });
    console.log(`  ✓ ${inst.title} ${inst.fullName} (${inst.email})`);
  }

  console.log(`\n✓ ${INSTRUCTORS.length} öğretim üyesi Instructor tablosuna eklendi.`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
