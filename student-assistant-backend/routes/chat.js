const express = require("express");
const router = express.Router();
const OpenAI = require("openai");
const prisma = require("../lib/prisma");
const authMiddleware = require("../middleware/auth");

const groq = new OpenAI({
  baseURL: "https://generativelanguage.googleapis.com/v1beta/openai",
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const GRADE_POINTS = {
  AA: 4.0, BA: 3.5, BB: 3.0, CB: 2.5,
  CC: 2.0, DC: 1.5, DD: 1.0, FF: 0.0,
};

const MAX_HISTORY = 50;
const RATE_LIMIT_MSG = "Şu an çok fazla istek gönderildi. Lütfen birkaç dakika bekleyip tekrar deneyin.";

function is429(err) {
  return err?.status === 429 || err?.response?.status === 429 || /429|rate.?limit|too.?many/i.test(err?.message ?? "");
}

async function callGeminiWithRetry(client, params) {
  try {
    return await client.chat.completions.create(params);
  } catch (err) {
    if (is429(err)) {
      console.log("[chat] 429 rate limit — retrying in 5 s…");
      await new Promise((r) => setTimeout(r, 5000));
      return await client.chat.completions.create(params);
    }
    throw err;
  }
}

async function buildStudentContext(userId) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return null;

  // ── Old system ──────────────────────────────────────────────────────────────
  const [courses, attendanceRecords, transcripts] = await Promise.all([
    prisma.course.findMany({ where: { userId } }),
    prisma.attendance.findMany({ where: { userId } }),
    prisma.transcript.findMany({
      where: { userId },
      include: { courses: true },
      orderBy: { id: "asc" },
    }),
  ]);

  // ── Unread announcements ────────────────────────────────────────────────────
  // Include any enrollment status except dropped/rejected so graded/completed
  // students still receive announcements for their offering.
  const unreadAnnouncements = await prisma.announcement.findMany({
    where: {
      offering: {
        enrollments: {
          some: {
            studentId: userId,
            status: { notIn: ["dropped", "rejected"] },
          },
        },
      },
      reads: { none: { studentId: userId } },
    },
    include: { offering: { include: { curriculum: true } } },
    orderBy: { createdAt: "desc" },
    take: 5,
  });

  console.log("[chat] Student ID used:", userId);
  console.log("[chat] Unread announcements found:", unreadAnnouncements.map((a) => ({
    id: a.id,
    title: a.title,
    type: a.type,
    offeringId: a.offeringId,
    courseCode: a.offering.curriculum.courseCode,
  })));

  // ── New system ──────────────────────────────────────────────────────────────
  const [enrollments, newAttRecs] = await Promise.all([
    prisma.enrollment.findMany({
      where: { studentId: userId },
      include: {
        offering: {
          include: {
            curriculum: true,
            instructor: { select: { fullName: true, title: true } },
          },
        },
      },
    }),
    prisma.attendanceNew.findMany({
      where: { studentId: userId },
      include: { offering: { include: { curriculum: true } } },
      orderBy: { date: "desc" },
    }),
  ]);

  // Group new attendance by offering
  const newAttMap = {};
  for (const r of newAttRecs) {
    const oid = r.offeringId;
    if (!newAttMap[oid]) {
      newAttMap[oid] = {
        code: r.offering.curriculum.courseCode,
        name: r.offering.curriculum.courseName,
        total: 0, attended: 0, absent: 0, late: 0,
      };
    }
    newAttMap[oid].total++;
    if (r.status === "present")      newAttMap[oid].attended++;
    else if (r.status === "absent")  newAttMap[oid].absent++;
    else if (r.status === "late")    newAttMap[oid].late++;
  }

  const newAttendance = Object.values(newAttMap).map((a) => ({
    code: a.code,
    name: a.name,
    totalWeeks: a.total,
    attended: a.attended,
    absent: a.absent,
    late: a.late,
    percentage: a.total > 0 ? Math.round((a.attended / a.total) * 100) : 100,
  }));

  // Categorize enrollments
  const enrolledOfferings = enrollments
    .filter((e) => e.status === "active" || e.status === "graded")
    .map((e) => ({
      code: e.offering.curriculum.courseCode,
      name: e.offering.curriculum.courseName,
      instructor: e.offering.instructor
        ? `${e.offering.instructor.title} ${e.offering.instructor.fullName}`
        : "—",
      term: e.offering.academicTerm,
      day: e.offering.day,
      startTime: e.offering.startTime,
      endTime: e.offering.endTime,
      room: e.offering.room,
      grade: e.grade,
      status: e.status,
    }));

  const pendingOfferings = enrollments
    .filter((e) => e.status === "pending")
    .map((e) => ({
      code: e.offering.curriculum.courseCode,
      name: e.offering.curriculum.courseName,
      term: e.offering.academicTerm,
    }));

  // ── Old system mappings ─────────────────────────────────────────────────────
  const currentCourses = courses.map((c) => ({
    code: c.courseCode,
    name: c.courseName,
    instructor: c.instructor,
    grade: c.grade,
    credits: c.credits,
    progress: c.progress,
    status: c.status,
    schedule: c.schedule,
    room: c.room,
  }));

  const oldAttendance = attendanceRecords.map((a) => ({
    code: a.courseCode,
    name: a.courseName,
    totalWeeks: a.totalWeeks,
    attended: a.attended,
    absent: a.absent,
    late: a.late,
    percentage: a.totalWeeks > 0 ? Math.round((a.attended / a.totalWeeks) * 100) : 100,
  }));

  // Merge attendance — new system first
  const attendance = [...newAttendance, ...oldAttendance];

  // ── Transcript + cumulative GPA ─────────────────────────────────────────────
  let totalCredits = 0;
  let totalPoints = 0;

  const semesterSummary = transcripts.map((sem) => {
    if (sem.status === "completed") {
      for (const tc of sem.courses) {
        const pts = GRADE_POINTS[tc.grade];
        if (pts !== undefined) {
          totalCredits += tc.credits;
          totalPoints += pts * tc.credits;
        }
      }
    }
    return { label: sem.label, status: sem.status, gpa: sem.gpa, credits: sem.creditsEarned };
  });

  const cumulativeGpa = totalCredits > 0
    ? Math.round((totalPoints / totalCredits) * 100) / 100
    : 0;

  return {
    user: {
      name: user.fullName,
      studentId: user.studentNumber,
      program: user.program,
      year: user.year,
      totalYears: user.totalYears,
      advisor: user.advisor,
      department: user.department,
    },
    currentCourses,
    enrolledOfferings,
    pendingOfferings,
    attendance,
    transcript: semesterSummary,
    cumulativeGpa,
    totalCredits,
    unreadAnnouncements: unreadAnnouncements.map((a) => ({
      title: a.title,
      type: a.type,
      courseCode: a.offering.curriculum.courseCode,
      courseName: a.offering.curriculum.courseName,
      createdAt: a.createdAt.toISOString().slice(0, 10),
    })),
  };
}

const LANG_INSTRUCTION = `\n\nIMPORTANT: Always respond in the same language the user is writing in. If the user writes in Turkish, respond in Turkish. If the user writes in English, respond in English. Detect the language from each message and match it automatically.`;

function buildSystemPrompt(studentCtx, basePrompt) {
  if (!studentCtx) return basePrompt + LANG_INSTRUCTION;

  const {
    user, currentCourses, enrolledOfferings, pendingOfferings,
    attendance, transcript, cumulativeGpa, totalCredits,
    unreadAnnouncements = [],
  } = studentCtx;

  // ── Unread announcements block (injected at top, first-message-only instruction) ──
  const announcementBlock = unreadAnnouncements.length > 0
    ? `🔔 OKUNMAMIŞ DUYURULAR (${unreadAnnouncements.length} adet):
${unreadAnnouncements.map((a) => `  - ${a.courseCode} ${a.courseName}: "${a.title}" (${a.type === "pdf" ? "PDF" : "mesaj"}) — ${a.createdAt}`).join("\n")}

ÖNEMLİ TALİMAT: Bu konuşmadaki İLK CEVAPTA, soruyu yanıtlamadan önce öğrenciye bu okunmamış duyurulardan proaktif olarak bahset. Örneğin: "Merhaba! Cevaplamadan önce belirteyim — ${unreadAnnouncements.length} okunmamış duyurunuz var: ..." Bunu yalnızca bir kez yap, her mesajda tekrarlama.

`
    : "";


  // ── Smart warnings ──────────────────────────────────────────────────────────
  const warnings = [];

  for (const a of attendance) {
    if (a.totalWeeks === 0) continue;
    if (a.percentage < 70) {
      warnings.push(`⚠️ UYARI: ${a.code} ${a.name} dersinde devamsızlık kritik seviyede (%${a.percentage}) — ders çekilme riski var`);
    } else if (a.percentage < 80) {
      warnings.push(`⚠️ UYARI: ${a.code} ${a.name} dersinde devamsızlık sınırına yaklaşıyor (%${a.percentage})`);
    }
  }

  if (cumulativeGpa > 0 && cumulativeGpa < 2.0) {
    warnings.push(`⚠️ GPA düşük (${cumulativeGpa}), akademik risk var — not yükseltme stratejisi önerilebilir`);
  }

  const warningBlock = warnings.length > 0
    ? `\nAKADEMİK UYARILAR (Konuya bağlıysa öğrenciye proaktif olarak belirt):\n${warnings.join("\n")}\n`
    : "";

  // ── Format sections ─────────────────────────────────────────────────────────
  const enrolledText = enrolledOfferings.length > 0
    ? enrolledOfferings
        .map((o) => `  - ${o.code} ${o.name} | ${o.term} | ${o.day ?? ""} ${o.startTime ?? ""}${o.endTime ? `–${o.endTime}` : ""} | Oda: ${o.room ?? "—"} | Hoca: ${o.instructor} | Not: ${o.grade ?? "—"}`)
        .join("\n")
    : "  (Kayıtlı ders yok)";

  const pendingBlock = pendingOfferings.length > 0
    ? `\nONAY BEKLEYEN TALEPLER:\n${pendingOfferings.map((o) => `  - ${o.code} ${o.name} (${o.term})`).join("\n")}\n`
    : "";

  const legacyText = currentCourses.length > 0
    ? currentCourses
        .map((c) => `  - ${c.code} ${c.name} | Not: ${c.grade ?? "—"} | Kredi: ${c.credits} | Hoca: ${c.instructor ?? "—"}`)
        .join("\n")
    : "";

  const legacyBlock = legacyText
    ? `\nESKİ SİSTEM DERSLERİ:\n${legacyText}\n`
    : "";

  const attendanceText = attendance.length > 0
    ? attendance
        .map((c) => {
          const flag = c.percentage < 70 ? " ⚠️ KRİTİK" : c.percentage < 80 ? " ⚠️ DİKKAT" : "";
          return `  - ${c.code} ${c.name}: ${c.attended}/${c.totalWeeks} hafta katıldı (%${c.percentage}), ${c.absent} devamsız, ${c.late} geç${flag}`;
        })
        .join("\n")
    : "  (Devamsızlık kaydı yok)";

  const transcriptText = transcript
    .map((s) => `  - ${s.label}: ${s.status === "completed" ? `GPA ${s.gpa}, ${s.credits} kredi` : "Devam ediyor"}`)
    .join("\n");

  return `${announcementBlock}${basePrompt}
${warningBlock}
---
ŞU AN GİRİŞ YAPAN ÖĞRENCİ BİLGİLERİ:

Ad: ${user.name}
Öğrenci No: ${user.studentId}
Program: ${user.program}
Sınıf: ${user.year}. sınıf (${user.totalYears} yıllık)
Danışman: ${user.advisor}
Bölüm: ${user.department}
Kümülatif GPA: ${cumulativeGpa}
Toplam Tamamlanan Kredi: ${totalCredits}

KAYITLI DERSLER (Bu Dönem):
${enrolledText}
${pendingBlock}${legacyBlock}
DEVAMSIZLIK DURUMU:
${attendanceText}

TRANSKRİPT ÖZETİ (Dönemler):
${transcriptText}

Bu öğrenciye özel, gerçek verilerine dayanarak yardımcı ol. Devamsızlık veya GPA uyarısı varsa konuya bağlı olduğunda proaktif olarak belirt. Notlarını, devamsızlığını, GPA'sını sormadan bil ve ona göre cevap ver.
---${LANG_INSTRUCTION}`;
}

// POST /api/chat
router.post("/", authMiddleware, async (req, res) => {
  const { messages, system } = req.body;

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ message: "messages alani gerekli ve dolu olmali" });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || apiKey === "your_api_key_here") {
    return res.json({ content: [{ text: "API key eksik. .env dosyasına ANTHROPIC_API_KEY ekle." }] });
  }

  const studentCtx = await buildStudentContext(req.user.id);
  const enrichedSystem = buildSystemPrompt(
    studentCtx,
    system || "Sen yardımcı bir öğrenci asistanısın."
  );

  // Trim to last MAX_HISTORY messages to avoid token overflow
  const trimmedMessages = messages.slice(-MAX_HISTORY);

  try {
    const completion = await callGeminiWithRetry(groq, {
      model: "gemini-2.5-flash",
      max_tokens: 1024,
      messages: [
        { role: "system", content: enrichedSystem },
        ...trimmedMessages,
      ],
    });

    const text = completion.choices[0]?.message?.content ?? "Yanıt alınamadı.";
    res.json({ content: [{ text }] });
  } catch (err) {
    console.log("Chat hatasi:", err.message);
    if (is429(err)) {
      return res.json({ content: [{ text: RATE_LIMIT_MSG }] });
    }
    res.status(500).json({ message: "Bir hata olustu: " + err.message });
  }
});

// POST /api/chat/recommend-courses
router.post("/recommend-courses", authMiddleware, async (req, res) => {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || apiKey === "your_api_key_here") {
    return res.status(500).json({ message: "API key eksik" });
  }

  try {
    const studentCtx = await buildStudentContext(req.user.id);
    if (!studentCtx) return res.status(404).json({ message: "Öğrenci bulunamadı" });

    const { user, enrolledOfferings, currentCourses, cumulativeGpa } = studentCtx;

    // Curriculum for the student's department (empty array is fine — AI still works)
    const allCurriculum = await prisma.curriculum.findMany({
      where: { department: user.department },
      orderBy: [{ year: "asc" }, { semester: "asc" }],
    });

    // Transcript course codes (from the underlying DB, not the summary)
    const transcriptCourses = await prisma.transcriptCourse.findMany({
      where: { transcript: { userId: req.user.id } },
      select: { courseCode: true },
    });

    const takenCodes = new Set([
      ...enrolledOfferings.map((o) => o.code),
      ...currentCourses.map((c) => c.code),
      ...transcriptCourses.map((tc) => tc.courseCode),
    ]);

    const takenList    = allCurriculum.filter((c) =>  takenCodes.has(c.courseCode));
    const notTakenList = allCurriculum.filter((c) => !takenCodes.has(c.courseCode));

    const currentList  = enrolledOfferings.filter((o) => o.status === "active" || o.status === "graded");

    const systemPrompt = `Sen bir akademik danışman yapay zekasısın. Öğrencinin transkriptine, GPA'ine, mevcut derslerine ve müfredatına bakarak sonraki dönem için en uygun dersleri öner.

Önerileri SADECE aşağıdaki JSON formatında ver, başka hiçbir metin veya markdown ekleme:
{"recommendations":[{"courseCode":"MAT301","courseName":"Diferansiyel Denklemler","reason":"Neden önerildi","priority":"high","credits":3}],"generalAdvice":"Genel tavsiye"}

priority değerleri: "high", "medium", "low". Maksimum 5 ders öner.
Türkçe veya İngilizce cevap ver (öğrencinin diline göre).`;

    const userMsg = `Öğrenci Bilgileri:
Ad: ${user.name} | Bölüm: ${user.department} | Yıl: ${user.year}. sınıf | GPA: ${cumulativeGpa}

Mevcut Dönem Dersleri:
${currentList.length ? currentList.map((c) => `- ${c.code} ${c.name}`).join("\n") : "(Yok)"}

Tamamlanan Dersler (müfredattan):
${takenList.length ? takenList.map((c) => `- ${c.courseCode} ${c.courseName}`).join("\n") : "(Yok)"}

Henüz Alınmamış Müfredat Dersleri:
${notTakenList.length
  ? notTakenList.map((c) => `- ${c.courseCode} ${c.courseName} (${c.credits} kr, ${c.year}. yıl ${c.semester}, ${c.type === "Z" ? "Zorunlu" : "Seçmeli"})`).join("\n")
  : "(Tüm müfredat dersleri tamamlanmış veya müfredat verisi yok)"}`;

    const completion = await callGeminiWithRetry(groq, {
      model: "gemini-2.5-flash",
      max_tokens: 1500,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user",   content: userMsg },
      ],
    });

    const raw     = (completion.choices[0]?.message?.content ?? "").trim();
    const jsonStr = raw.replace(/^```json?\s*/i, "").replace(/\s*```\s*$/i, "").trim();
    const parsed  = JSON.parse(jsonStr);

    res.json({
      recommendations: parsed.recommendations ?? [],
      generalAdvice:   parsed.generalAdvice   ?? "",
      studentName:     user.name,
      gpa:             cumulativeGpa,
    });
  } catch (err) {
    console.error("[recommend-courses]", err.message);
    if (is429(err)) return res.status(429).json({ message: RATE_LIMIT_MSG });
    res.status(500).json({ message: "Tavsiye alınamadı: " + err.message });
  }
});

module.exports = router;
