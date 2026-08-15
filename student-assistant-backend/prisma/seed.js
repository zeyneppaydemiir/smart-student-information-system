require("dotenv").config();
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcrypt");
const fs = require("fs");
const path = require("path");

const prisma = new PrismaClient();
const DATA = (file) =>
  JSON.parse(fs.readFileSync(path.join(__dirname, "../data", file), "utf-8"));

async function main() {
  console.log("Seed basliyor...");

  // ── 1. USERS ────────────────────────────────────────────────────────────
  const usersJson = DATA("users.json");

  const createdUsers = [];
  for (const u of usersJson) {
    const hash = await bcrypt.hash(u.password, 10);
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: {
        email: u.email,
        passwordHash: hash,
        fullName: u.name,
        studentNumber: u.studentId,
        program: u.program,
        department: u.department,
        year: u.year,
        totalYears: u.totalYears,
        advisor: u.advisor ?? null,
        gpa: u.gpa ?? null,
      },
    });
    createdUsers.push(user);
    console.log(`  Kullanici: ${user.fullName} (${user.email})`);
  }

  // ── 2. COURSES ──────────────────────────────────────────────────────────
  // Her kullaniciya ayni dersleri kopyaliyoruz.
  // Strateji: JSON'da userId yoktu, herkes ayni ekrana bakiyordu.
  // Artik her ogrencinin kendine ait ders listesi var.
  const coursesJson = DATA("courses.json");

  const SEMESTER = "Spring 2025-2026";

  // courseId eslestirme haritasi: { userId -> { jsonId -> dbId } }
  const courseIdMap = {};

  for (const user of createdUsers) {
    courseIdMap[user.id] = {};
    for (const c of coursesJson) {
      const course = await prisma.course.upsert({
        where: {
          userId_courseCode_semester: {
            userId: user.id,
            courseCode: c.code,
            semester: SEMESTER,
          },
        },
        update: {},
        create: {
          userId: user.id,
          courseCode: c.code,
          courseName: c.name,
          department: c.department ?? null,
          instructor: c.instructor ?? null,
          instructorInitials: c.instructorInitials ?? null,
          schedule: c.schedule ?? null,
          room: c.room ?? null,
          credits: c.credits,
          grade: c.grade ?? null,
          progress: c.progress ?? 0,
          status: c.status ?? "active",
          semester: SEMESTER,
          color: c.color ?? null,
          days: Array.isArray(c.days) ? c.days.join(",") : null,
          startHour: c.startHour ?? null,
          startMin: c.startMin ?? null,
          endHour: c.endHour ?? null,
          endMin: c.endMin ?? null,
        },
      });
      courseIdMap[user.id][c.id] = course.id;
    }
    console.log(`  Dersler kaydedildi -> kullanici ${user.id}`);
  }

  // ── 3. ATTENDANCE ───────────────────────────────────────────────────────
  const attendanceJson = DATA("attendance.json");

  for (const user of createdUsers) {
    for (const ac of attendanceJson.courses) {
      const dbCourseId = courseIdMap[user.id][ac.id];
      if (!dbCourseId) continue;

      const att = await prisma.attendance.upsert({
        where: { courseId: dbCourseId },
        update: {},
        create: {
          userId: user.id,
          courseId: dbCourseId,
          courseCode: ac.code,
          courseName: ac.name,
          instructor: ac.instructor ?? null,
          totalWeeks: ac.totalWeeks,
          attended: ac.attended,
          absent: ac.absent,
          late: ac.late,
        },
      });

      // recentAbsences icinden bu kursun kayitlari
      const records = attendanceJson.recentAbsences.filter(
        (r) => r.code === ac.code
      );
      for (const rec of records) {
        await prisma.attendanceRecord.create({
          data: {
            attendanceId: att.id,
            courseCode: rec.code,
            date: rec.date,
            type: rec.type,
          },
        });
      }
    }
    console.log(`  Devamsizlik kaydedildi -> kullanici ${user.id}`);
  }

  // ── 4. TRANSCRIPT ───────────────────────────────────────────────────────
  const transcriptJson = DATA("transcript.json");

  for (const user of createdUsers) {
    for (const sem of transcriptJson) {
      // semester slug: "fall-2023-2024"
      const slug = sem.label.toLowerCase().replace(/[\s\/]+/g, "-");

      const tr = await prisma.transcript.upsert({
        where: {
          userId_semester: { userId: user.id, semester: slug },
        },
        update: {},
        create: {
          userId: user.id,
          semester: slug,
          label: sem.label,
          status: sem.status,
          gpa: sem.gpa ?? null,
          creditsEarned: sem.credits,
          color: sem.color ?? null,
        },
      });

      for (const tc of sem.courses) {
        await prisma.transcriptCourse.create({
          data: {
            transcriptId: tr.id,
            courseCode: tc.code,
            courseName: tc.name,
            credits: tc.credits,
            grade: tc.grade,
          },
        });
      }
    }
    console.log(`  Transkript kaydedildi -> kullanici ${user.id}`);
  }

  // ── 5. FORMS ────────────────────────────────────────────────────────────
  const formsJson = DATA("forms.json");

  for (const f of formsJson) {
    await prisma.form.upsert({
      where: { id: f.id },
      update: {},
      create: {
        id: f.id,
        title: f.title,
        description: f.description ?? null,
        iconColor: f.iconColor ?? null,
        status: f.status ?? "open",
        deadline: f.deadline ?? null,
        urgent: f.urgent ?? false,
        fields: f.fields ? JSON.stringify(f.fields) : null,
        info: f.info ?? null,
      },
    });
  }
  console.log(`  Formlar kaydedildi (${formsJson.length} adet)`);

  // ── 6. SUBMISSIONS ──────────────────────────────────────────────────────
  const submissionsJson = DATA("submissions.json");
  if (Array.isArray(submissionsJson) && submissionsJson.length > 0) {
    for (const s of submissionsJson) {
      await prisma.submission.create({
        data: {
          userId: s.userId,
          formId: s.formId,
          status: s.status ?? "pending",
          data: s.data ? JSON.stringify(s.data) : null,
        },
      });
    }
    console.log(`  Submissions kaydedildi (${submissionsJson.length} adet)`);
  } else {
    console.log("  Submissions: bos, atlandi");
  }

  console.log("\nSeed tamamlandi!");
}

main()
  .catch((e) => {
    console.error("Seed HATA:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
