const express = require("express");
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const router = express.Router();
const OpenAI = require("openai");
const prisma = require("../lib/prisma");
const instructorAuth = require("../middleware/instructorAuth");

const gemini = new OpenAI({
  baseURL: "https://generativelanguage.googleapis.com/v1beta/openai",
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const MAX_HISTORY = 50;
const RATE_LIMIT_MSG = "Şu an çok fazla istek gönderildi. Lütfen birkaç dakika bekleyip tekrar deneyin.";

function is429(err) {
  return err?.status === 429 || err?.response?.status === 429 || /429|rate.?limit|too.?many/i.test(err?.message ?? "");
}

async function callGeminiWithRetry(params) {
  try {
    return await gemini.chat.completions.create(params);
  } catch (err) {
    if (is429(err)) {
      console.log("[instructor-chat] 429 rate limit — retrying in 5 s…");
      await new Promise((r) => setTimeout(r, 5000));
      return await gemini.chat.completions.create(params);
    }
    throw err;
  }
}

// ── Multer for PDF uploads ───────────────────────────────────────────────────
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, "../uploads/announcements");
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
    cb(null, `${Date.now()}-${safe}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === "application/pdf") cb(null, true);
    else cb(new Error("Sadece PDF dosyaları yüklenebilir"), false);
  },
});

// ── System prompt ────────────────────────────────────────────────────────────
const BASE_SYSTEM_PROMPT = `You are a helpful assistant for university instructors. Help with course management, grading policies, student performance analysis, and academic processes. You are knowledgeable about university systems, LMS platforms, academic integrity, grade disputes, attendance policies, curriculum design, and best teaching practices. Be professional, concise, and helpful.

IMPORTANT: Always respond in the same language the user is writing in. If the user writes in Turkish, respond in Turkish. If the user writes in English, respond in English. Detect the language from each message and match it automatically.`;

// ── Keywords that signal an announcement intent ───────────────────────────────
const ANNOUNCE_KEYWORDS = [
  "duyur", "ilet", "yayınla", "bildir", "haber ver", "öğrencilere",
  "announce", "publish", "notify", "send to students", "inform students",
];

function hasAnnouncementKeyword(msg) {
  const lower = msg.toLowerCase();
  return ANNOUNCE_KEYWORDS.some((k) => lower.includes(k));
}

// ── Instructor context ────────────────────────────────────────────────────────
async function buildInstructorContext(instructorId) {
  const instructor = await prisma.instructor.findUnique({ where: { id: instructorId } });
  if (!instructor) return null;

  const offerings = await prisma.courseOffering.findMany({
    where: { instructorId },
    include: {
      curriculum: true,
      enrollments: {
        include: { student: { select: { fullName: true, studentNumber: true } } },
      },
    },
  });

  return {
    instructor: {
      name: instructor.fullName,
      title: instructor.title,
      department: instructor.department,
    },
    offerings: offerings.map((o) => {
      const active  = o.enrollments.filter((e) => e.status === "active");
      const pending = o.enrollments.filter((e) => e.status === "pending");
      const graded  = o.enrollments.filter((e) => e.status === "graded" || e.grade);

      const gradeDist = {};
      for (const e of o.enrollments) {
        if (e.grade) gradeDist[e.grade] = (gradeDist[e.grade] || 0) + 1;
      }
      const gradeDistText = Object.entries(gradeDist)
        .sort(([a], [b]) => {
          const order = ["AA","BA","BB","CB","CC","DC","DD","FD","FF"];
          return order.indexOf(a) - order.indexOf(b);
        })
        .map(([g, n]) => `${g}:${n}`)
        .join(", ") || "—";

      return {
        id: o.id,
        code: o.curriculum.courseCode,
        name: o.curriculum.courseName,
        credits: o.curriculum.credits,
        term: o.academicTerm,
        day: o.day,
        time: `${o.startTime ?? ""}–${o.endTime ?? ""}`,
        room: o.room,
        activeStudents: active.length,
        pendingStudents: pending.length,
        gradedStudents: graded.length,
        totalEnrolled: o.enrollments.length,
        gradeDistribution: gradeDistText,
      };
    }),
  };
}

function buildSystemPrompt(ctx, basePrompt) {
  if (!ctx) return basePrompt;
  const { instructor, offerings } = ctx;
  const offeringsText = offerings.length
    ? offerings.map((o) => {
        const pendingNote = o.pendingStudents > 0 ? ` | ⏳ ${o.pendingStudents} bekleyen talep` : "";
        const gradeNote   = o.gradedStudents  > 0 ? ` | Not dağılımı: ${o.gradeDistribution}` : "";
        return `  - ${o.code} ${o.name} (${o.credits} kr) | ${o.term} | ${o.day ?? "—"} ${o.time} | Oda: ${o.room ?? "—"} | ${o.activeStudents} aktif öğrenci${pendingNote}${gradeNote}`;
      }).join("\n")
    : "  (Henüz ders açılmamış)";

  return `${basePrompt}\n\n---\nGİRİŞ YAPAN ÖĞRETİM ÜYESİ:\nAd: ${instructor.title} ${instructor.name}\nBölüm: ${instructor.department}\n\nAÇIK DERSLER:\n${offeringsText}\n---`;
}

// ── Announcement JSON extraction (separate lightweight Gemini call) ───────────
async function extractAnnouncementData(userMessage, offerings) {
  const offeringList = offerings.map((o) => `${o.code}: ${o.name}`).join(", ");

  const completion = await callGeminiWithRetry({
    model: "gemini-2.5-flash",
    max_tokens: 300,
    messages: [
      {
        role: "system",
        content: `You are a JSON extractor. The instructor has these courses: ${offeringList}

Extract announcement data from the instructor's message. Respond ONLY with valid JSON, no markdown, no extra text:
{"isAnnouncement":true,"courseCode":"<code or null>","title":"<short title>","content":"<full message text>"}

Set isAnnouncement to true if the instructor wants to inform/notify their students (class cancellation, schedule change, homework, exam info, general notice, etc.).
Match courseCode to one of the available courses based on name or code mentioned.
If no specific course is mentioned and there is only one course, use that course's code.
If no course can be determined, set courseCode to null.`,
      },
      { role: "user", content: userMessage },
    ],
  });

  const raw = (completion.choices[0]?.message?.content ?? "").trim();
  const jsonStr = raw.replace(/^```json?\s*/i, "").replace(/\s*```\s*$/i, "").trim();
  return JSON.parse(jsonStr);
}

// ── Find offering by code or by name keywords ────────────────────────────────
async function resolveOffering(courseCode, userMessage, instructorId, offerings) {
  // 1. Try exact code match
  if (courseCode) {
    const match = offerings.find(
      (o) => o.code.toLowerCase() === courseCode.toLowerCase()
    );
    if (match) {
      return prisma.courseOffering.findFirst({
        where: { id: match.id, instructorId },
        include: { curriculum: true },
      });
    }
  }

  // 2. Try partial name/code match from message
  if (userMessage) {
    const lower = userMessage.toLowerCase();
    const match = offerings.find(
      (o) =>
        lower.includes(o.code.toLowerCase()) ||
        o.name.toLowerCase().split(" ").some((word) => word.length > 3 && lower.includes(word))
    );
    if (match) {
      return prisma.courseOffering.findFirst({
        where: { id: match.id, instructorId },
        include: { curriculum: true },
      });
    }
  }

  // 3. Only one offering — use it
  if (offerings.length === 1) {
    return prisma.courseOffering.findFirst({
      where: { id: offerings[0].id, instructorId },
      include: { curriculum: true },
    });
  }

  return null;
}

// ════════════════════════════════════════════════════════════════════════════
//  POST /api/instructor/chat  — main chat endpoint
// ════════════════════════════════════════════════════════════════════════════
router.post("/chat", instructorAuth, async (req, res) => {
  const { messages, system } = req.body;

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ message: "messages alanı gerekli ve dolu olmalı" });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || apiKey === "your_api_key_here") {
    return res.json({ content: [{ text: "API key eksik. .env dosyasına ANTHROPIC_API_KEY ekle." }] });
  }

  const ctx = await buildInstructorContext(req.instructor.id);
  const trimmedMessages = messages.slice(-MAX_HISTORY);
  const lastUserMsg = [...trimmedMessages].reverse().find((m) => m.role === "user")?.content ?? "";

  // ── Announcement fast path (keyword gate → JSON extraction → DB create) ──
  if (hasAnnouncementKeyword(lastUserMsg) && ctx?.offerings?.length) {
    try {
      const extracted = await extractAnnouncementData(lastUserMsg, ctx.offerings);
      console.log("[instructor-chat] Extracted intent:", extracted);

      if (extracted.isAnnouncement) {
        const offering = await resolveOffering(
          extracted.courseCode, lastUserMsg, req.instructor.id, ctx.offerings
        );
        console.log("[instructor-chat] Resolved offering:", offering
          ? `id=${offering.id}  code=${offering.curriculum.courseCode}  name=${offering.curriculum.courseName}`
          : "null — no matching offering found");

        if (!offering) {
          const list = ctx.offerings.map((o) => `${o.code} - ${o.name}`).join(", ");
          return res.json({
            content: [{ text: `Hangi ders için duyuru yayınlamak istediğinizi belirtir misiniz? Dersleriniz: ${list}` }],
          });
        }

        const createdAnnouncement = await prisma.announcement.create({
          data: {
            offeringId:   offering.id,
            instructorId: req.instructor.id,
            type:         "message",
            title:        extracted.title,
            content:      extracted.content || extracted.title,
          },
        });
        console.log("[instructor-chat] Announcement created:", {
          id:          createdAnnouncement.id,
          offeringId:  createdAnnouncement.offeringId,
          title:       createdAnnouncement.title,
          type:        createdAnnouncement.type,
        });

        const enrolledCount = await prisma.enrollment.count({
          where: { offeringId: offering.id, status: { notIn: ["dropped", "rejected"] } },
        });
        return res.json({
          content: [{
            text: `✅ Duyuru yayınlandı! "${extracted.title}" başlıklı duyurunuz ${offering.curriculum.courseCode} ${offering.curriculum.courseName} dersinizin ${enrolledCount} öğrencisine iletildi.`,
          }],
        });
      }
    } catch (extractErr) {
      console.log("[instructor-chat] Extraction failed, falling through:", extractErr.message);
      // Fall through to normal chat response
    }
  }

  // ── Normal chat response ─────────────────────────────────────────────────
  try {
    const enrichedSystem = buildSystemPrompt(ctx, system || BASE_SYSTEM_PROMPT);
    const completion = await callGeminiWithRetry({
      model: "gemini-2.5-flash",
      max_tokens: 1024,
      messages: [{ role: "system", content: enrichedSystem }, ...trimmedMessages],
    });
    const text = completion.choices[0]?.message?.content ?? "Yanıt alınamadı.";
    res.json({ content: [{ text }] });
  } catch (err) {
    console.log("Instructor chat error:", err.message);
    if (is429(err)) {
      return res.json({ content: [{ text: RATE_LIMIT_MSG }] });
    }
    res.status(500).json({ message: "Bir hata oluştu: " + err.message });
  }
});

// ════════════════════════════════════════════════════════════════════════════
//  POST /api/instructor/chat/upload-announce  — PDF announcement via chat
// ════════════════════════════════════════════════════════════════════════════
router.post("/chat/upload-announce", instructorAuth, upload.single("pdf"), async (req, res) => {
  try {
    const pdfFile = req.file;
    if (!pdfFile) {
      return res.status(400).json({ message: "PDF dosyası gerekli" });
    }

    const { message, courseCode } = req.body;
    const ctx = await buildInstructorContext(req.instructor.id);

    if (!ctx || !ctx.offerings.length) {
      fs.unlink(pdfFile.path, () => {});
      return res.status(400).json({ message: "Açık ders bulunamadı" });
    }

    // Resolve the offering (provided courseCode → message keywords → single offering)
    const offering = await resolveOffering(
      courseCode || null, message || pdfFile.originalname, req.instructor.id, ctx.offerings
    );

    if (!offering) {
      fs.unlink(pdfFile.path, () => {});
      const list = ctx.offerings.map((o) => `${o.code} - ${o.name}`).join(", ");
      return res.json({
        content: [{
          text: `Hangi ders için PDF yayınlamak istediğinizi belirtir misiniz? Dersleriniz: ${list}`,
        }],
      });
    }

    const title  = (message?.trim() || pdfFile.originalname.replace(/\.pdf$/i, "")).slice(0, 120);
    const filePath = `/uploads/announcements/${pdfFile.filename}`;

    await prisma.announcement.create({
      data: {
        offeringId:   offering.id,
        instructorId: req.instructor.id,
        type:         "pdf",
        title,
        content:      message?.trim() || null,
        fileName:     pdfFile.originalname,
        filePath,
      },
    });

    const enrolledCount = await prisma.enrollment.count({
      where: { offeringId: offering.id, status: { notIn: ["dropped", "rejected"] } },
    });

    console.log(`[instructor-chat] PDF announcement created for offering ${offering.id}: ${pdfFile.originalname}`);
    res.json({
      content: [{
        text: `✅ PDF duyurusu yayınlandı! "${pdfFile.originalname}" dosyası ${offering.curriculum.courseCode} ${offering.curriculum.courseName} dersinizin ${enrolledCount} öğrencisine iletildi.`,
      }],
    });
  } catch (err) {
    console.error(err);
    if (req.file) fs.unlink(req.file.path, () => {});
    if (err.message === "Sadece PDF dosyaları yüklenebilir") {
      return res.status(400).json({ message: err.message });
    }
    res.status(500).json({ message: "Sunucu hatası: " + err.message });
  }
});

module.exports = router;
