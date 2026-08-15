const express = require("express");
const router = express.Router();
const prisma = require("../lib/prisma");
const instructorAuth = require("../middleware/instructorAuth");

router.use(instructorAuth);

async function getOwnOffering(instructorId, offeringId) {
  const offering = await prisma.courseOffering.findUnique({ where: { id: offeringId } });
  if (!offering) return { error: 404, message: "Ders bulunamadı" };
  if (offering.instructorId !== instructorId) return { error: 403, message: "Bu ders size ait değil" };
  return { offering };
}

// GET /api/instructor/students/all
router.get("/students/all", async (req, res) => {
  try {
    const students = await prisma.user.findMany({
      select: { id: true, fullName: true, studentNumber: true, department: true, year: true },
      orderBy: { fullName: "asc" },
    });
    res.json(students);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Sunucu hatası" });
  }
});

// GET /api/instructor/offerings/:offeringId/students
router.get("/offerings/:offeringId/students", async (req, res) => {
  try {
    const offeringId = parseInt(req.params.offeringId);
    console.log("[students] offeringId:", offeringId, "instructorId:", req.instructor.id);

    const check = await getOwnOffering(req.instructor.id, offeringId);
    console.log("[students] ownership check:", check.error ? `FAIL ${check.error} ${check.message}` : "OK");
    if (check.error) return res.status(check.error).json({ message: check.message });

    const enrollments = await prisma.enrollment.findMany({
      where: { offeringId },
      include: {
        student: { select: { id: true, fullName: true, studentNumber: true, email: true } },
      },
      orderBy: { enrolledAt: "asc" },
    });

    console.log("[students] found:", enrollments.length, "enrollments");
    res.json(enrollments);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Sunucu hatası" });
  }
});

// POST /api/instructor/offerings/:offeringId/students
router.post("/offerings/:offeringId/students", async (req, res) => {
  try {
    const offeringId = parseInt(req.params.offeringId);
    const check = await getOwnOffering(req.instructor.id, offeringId);
    if (check.error) return res.status(check.error).json({ message: check.message });

    const { studentNumber } = req.body;
    if (!studentNumber) return res.status(400).json({ message: "Öğrenci numarası zorunludur" });

    const student = await prisma.user.findUnique({ where: { studentNumber } });
    if (!student) return res.status(404).json({ message: "Öğrenci bulunamadı" });

    const existing = await prisma.enrollment.findUnique({
      where: { studentId_offeringId: { studentId: student.id, offeringId } },
    });

    if (existing) {
      if (existing.status === "dropped") {
        const updated = await prisma.enrollment.update({
          where: { id: existing.id },
          data: { status: "active" },
          include: { student: { select: { id: true, fullName: true, studentNumber: true, email: true } } },
        });
        return res.json(updated);
      }
      return res.status(409).json({ message: "Öğrenci zaten bu derse kayıtlı" });
    }

    const enrollment = await prisma.enrollment.create({
      data: { studentId: student.id, offeringId, status: "active" },
      include: { student: { select: { id: true, fullName: true, studentNumber: true, email: true } } },
    });

    res.json(enrollment);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Sunucu hatası" });
  }
});

// DELETE /api/instructor/offerings/:offeringId/students/:studentId
router.delete("/offerings/:offeringId/students/:studentId", async (req, res) => {
  try {
    const offeringId = parseInt(req.params.offeringId);
    const studentId = parseInt(req.params.studentId);
    const check = await getOwnOffering(req.instructor.id, offeringId);
    if (check.error) return res.status(check.error).json({ message: check.message });

    const enrollment = await prisma.enrollment.findUnique({
      where: { studentId_offeringId: { studentId, offeringId } },
    });
    if (!enrollment) return res.status(404).json({ message: "Öğrenci bu derse kayıtlı değil" });

    await prisma.enrollment.update({
      where: { id: enrollment.id },
      data: { status: "dropped" },
    });

    res.json({ message: "Öğrenci dersten çıkarıldı" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Sunucu hatası" });
  }
});

// GET /api/instructor/offerings/:offeringId/pending
router.get("/offerings/:offeringId/pending", async (req, res) => {
  try {
    const offeringId = parseInt(req.params.offeringId);
    const check = await getOwnOffering(req.instructor.id, offeringId);
    if (check.error) return res.status(check.error).json({ message: check.message });

    const pending = await prisma.enrollment.findMany({
      where: { offeringId, status: "pending" },
      include: {
        student: { select: { id: true, fullName: true, studentNumber: true, email: true, department: true } },
      },
      orderBy: { enrolledAt: "asc" },
    });

    res.json(pending);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Sunucu hatası" });
  }
});

// PUT /api/instructor/enrollment-requests/:id/respond
router.put("/enrollment-requests/:id/respond", async (req, res) => {
  try {
    const enrollmentId = parseInt(req.params.id);
    const { status } = req.body;

    if (!["active", "rejected"].includes(status)) {
      return res.status(400).json({ message: "Geçersiz durum. 'active' veya 'rejected' olmalı" });
    }

    const enrollment = await prisma.enrollment.findUnique({
      where: { id: enrollmentId },
      include: { offering: true },
    });

    if (!enrollment) return res.status(404).json({ message: "Kayıt talebi bulunamadı" });
    if (enrollment.offering.instructorId !== req.instructor.id) {
      return res.status(403).json({ message: "Bu talep size ait değil" });
    }
    if (enrollment.status !== "pending") {
      return res.status(400).json({ message: "Bu talep beklemede değil" });
    }

    const updated = await prisma.enrollment.update({
      where: { id: enrollmentId },
      data: { status },
      include: {
        student: { select: { id: true, fullName: true, studentNumber: true, email: true } },
      },
    });

    res.json({
      message: status === "active" ? "Talep kabul edildi" : "Talep reddedildi",
      enrollment: updated,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Sunucu hatası" });
  }
});

module.exports = router;
