const express = require("express");
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const prisma = require("../lib/prisma");
const instructorAuth = require("../middleware/instructorAuth");
const authMiddleware = require("../middleware/auth");

// ── Multer setup ────────────────────────────────────────────────────────────
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
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype === "application/pdf") cb(null, true);
    else cb(new Error("Sadece PDF dosyaları yüklenebilir"), false);
  },
});

// ── Helper ──────────────────────────────────────────────────────────────────
async function getOwnOffering(instructorId, offeringId) {
  const offering = await prisma.courseOffering.findUnique({ where: { id: offeringId } });
  if (!offering) return { error: 404, message: "Ders bulunamadı" };
  if (offering.instructorId !== instructorId) return { error: 403, message: "Bu ders size ait değil" };
  return { offering };
}

// ════════════════════════════════════════════════════════════════════════════
//  INSTRUCTOR ROUTER
// ════════════════════════════════════════════════════════════════════════════
const instructorRouter = express.Router();
instructorRouter.use(instructorAuth);

// POST /api/instructor/announcements
instructorRouter.post(
  "/announcements",
  upload.single("file"),
  async (req, res) => {
    try {
      const { offeringId, title, content, type } = req.body;

      if (!offeringId || !title || !type) {
        return res.status(400).json({ message: "offeringId, title ve type zorunludur" });
      }
      if (!["message", "pdf"].includes(type)) {
        return res.status(400).json({ message: "type 'message' veya 'pdf' olmalı" });
      }
      if (type === "pdf" && !req.file) {
        return res.status(400).json({ message: "PDF tipinde dosya zorunludur" });
      }
      if (type === "message" && !content?.trim()) {
        return res.status(400).json({ message: "Mesaj tipinde içerik zorunludur" });
      }

      const check = await getOwnOffering(req.instructor.id, parseInt(offeringId));
      if (check.error) return res.status(check.error).json({ message: check.message });

      const announcement = await prisma.announcement.create({
        data: {
          offeringId: parseInt(offeringId),
          instructorId: req.instructor.id,
          type,
          title: title.trim(),
          content: content?.trim() || null,
          fileName: req.file ? req.file.originalname : null,
          filePath: req.file ? `/uploads/announcements/${req.file.filename}` : null,
        },
        include: {
          offering: { include: { curriculum: { select: { courseCode: true, courseName: true } } } },
        },
      });

      res.json(announcement);
    } catch (err) {
      console.error(err);
      if (err.message === "Sadece PDF dosyaları yüklenebilir") {
        return res.status(400).json({ message: err.message });
      }
      res.status(500).json({ message: "Sunucu hatası" });
    }
  }
);

// GET /api/instructor/announcements
instructorRouter.get("/announcements", async (req, res) => {
  try {
    const announcements = await prisma.announcement.findMany({
      where: { instructorId: req.instructor.id },
      include: {
        offering: {
          include: { curriculum: { select: { courseCode: true, courseName: true } } },
        },
        _count: { select: { reads: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    res.json(
      announcements.map((a) => ({
        id: a.id,
        type: a.type,
        title: a.title,
        content: a.content,
        fileName: a.fileName,
        filePath: a.filePath,
        createdAt: a.createdAt,
        offeringId: a.offeringId,
        courseCode: a.offering.curriculum.courseCode,
        courseName: a.offering.curriculum.courseName,
        readCount: a._count.reads,
      }))
    );
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Sunucu hatası" });
  }
});

// POST /api/instructor/announcements/ai-create  (called programmatically by the chat AI)
instructorRouter.post("/announcements/ai-create", async (req, res) => {
  try {
    const { offeringId, title, content } = req.body;

    if (!offeringId || !title) {
      return res.status(400).json({ message: "offeringId ve title zorunludur" });
    }

    const offering = await prisma.courseOffering.findFirst({
      where: { id: parseInt(offeringId), instructorId: req.instructor.id },
      include: { curriculum: true },
    });
    if (!offering) return res.status(403).json({ message: "Bu ders size ait değil veya bulunamadı" });

    const announcement = await prisma.announcement.create({
      data: {
        offeringId:   offering.id,
        instructorId: req.instructor.id,
        type:         "message",
        title:        title.trim(),
        content:      content?.trim() || title.trim(),
      },
    });

    res.json({
      message: "Duyuru oluşturuldu",
      announcement: {
        id:         announcement.id,
        title:      announcement.title,
        courseCode: offering.curriculum.courseCode,
        courseName: offering.curriculum.courseName,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Sunucu hatası" });
  }
});

// DELETE /api/instructor/announcements/:id
instructorRouter.delete("/announcements/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const ann = await prisma.announcement.findUnique({ where: { id } });
    if (!ann) return res.status(404).json({ message: "Duyuru bulunamadı" });
    if (ann.instructorId !== req.instructor.id) {
      return res.status(403).json({ message: "Bu duyuru size ait değil" });
    }

    // Delete reads first, then the announcement
    await prisma.announcementRead.deleteMany({ where: { announcementId: id } });

    if (ann.filePath) {
      const absPath = path.join(__dirname, "..", ann.filePath);
      fs.unlink(absPath, () => {});
    }

    await prisma.announcement.delete({ where: { id } });
    res.json({ message: "Duyuru silindi" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Sunucu hatası" });
  }
});

// ════════════════════════════════════════════════════════════════════════════
//  STUDENT ROUTER
// ════════════════════════════════════════════════════════════════════════════
const studentRouter = express.Router();
studentRouter.use(authMiddleware);

// GET /api/announcements/unread-count
studentRouter.get("/unread-count", async (req, res) => {
  try {
    const count = await prisma.announcement.count({
      where: {
        offering: {
          enrollments: {
            some: {
              studentId: req.user.id,
              status: { notIn: ["dropped", "rejected"] },
            },
          },
        },
        reads: { none: { studentId: req.user.id } },
      },
    });
    res.json({ count });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Sunucu hatası" });
  }
});

// GET /api/announcements/my
studentRouter.get("/my", async (req, res) => {
  try {
    const announcements = await prisma.announcement.findMany({
      where: {
        offering: {
          enrollments: {
            some: {
              studentId: req.user.id,
              status: { notIn: ["dropped", "rejected"] },
            },
          },
        },
      },
      include: {
        offering: {
          include: { curriculum: { select: { courseCode: true, courseName: true } } },
        },
        reads: { where: { studentId: req.user.id } },
      },
      orderBy: { createdAt: "desc" },
    });

    const unreadCount = announcements.filter((a) => a.reads.length === 0).length;

    res.json({
      announcements: announcements.map((a) => ({
        id: a.id,
        type: a.type,
        title: a.title,
        content: a.content,
        fileName: a.fileName,
        createdAt: a.createdAt,
        offeringId: a.offeringId,
        courseCode: a.offering.curriculum.courseCode,
        courseName: a.offering.curriculum.courseName,
        isRead: a.reads.length > 0,
      })),
      unreadCount,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Sunucu hatası" });
  }
});

// POST /api/announcements/:id/read
studentRouter.post("/:id/read", async (req, res) => {
  try {
    const id = parseInt(req.params.id);

    // Verify student is enrolled in the offering this announcement belongs to
    const ann = await prisma.announcement.findUnique({
      where: { id },
      include: {
        offering: {
          include: { enrollments: { where: { studentId: req.user.id, status: "active" } } },
        },
      },
    });
    if (!ann) return res.status(404).json({ message: "Duyuru bulunamadı" });
    if (ann.offering.enrollments.length === 0) {
      return res.status(403).json({ message: "Bu duyuruya erişim izniniz yok" });
    }

    await prisma.announcementRead.upsert({
      where: { announcementId_studentId: { announcementId: id, studentId: req.user.id } },
      update: {},
      create: { announcementId: id, studentId: req.user.id },
    });

    res.json({ message: "Okundu olarak işaretlendi" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Sunucu hatası" });
  }
});

// GET /api/announcements/:id/download
studentRouter.get("/:id/download", async (req, res) => {
  try {
    const id = parseInt(req.params.id);

    const ann = await prisma.announcement.findUnique({
      where: { id },
      include: {
        offering: {
          include: { enrollments: { where: { studentId: req.user.id, status: "active" } } },
        },
      },
    });
    if (!ann) return res.status(404).json({ message: "Duyuru bulunamadı" });
    if (ann.offering.enrollments.length === 0) {
      return res.status(403).json({ message: "Bu dosyaya erişim izniniz yok" });
    }
    if (ann.type !== "pdf" || !ann.filePath) {
      return res.status(400).json({ message: "Bu duyurunun PDF dosyası yok" });
    }

    const absPath = path.join(__dirname, "..", ann.filePath);
    if (!fs.existsSync(absPath)) {
      return res.status(404).json({ message: "Dosya bulunamadı" });
    }

    // Mark as read on download
    await prisma.announcementRead.upsert({
      where: { announcementId_studentId: { announcementId: id, studentId: req.user.id } },
      update: {},
      create: { announcementId: id, studentId: req.user.id },
    });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${ann.fileName || "document.pdf"}"`);
    fs.createReadStream(absPath).pipe(res);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Sunucu hatası" });
  }
});

module.exports = { instructorRouter, studentRouter };
