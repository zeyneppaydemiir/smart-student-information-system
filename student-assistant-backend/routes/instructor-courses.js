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

// GET /api/instructor/curriculum
router.get("/curriculum", async (req, res) => {
  try {
    const courses = await prisma.curriculum.findMany({
      where: { department: req.instructor.department },
      orderBy: [{ year: "asc" }, { semester: "asc" }, { type: "asc" }, { courseCode: "asc" }],
    });
    res.json(courses);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Sunucu hatası" });
  }
});

// GET /api/instructor/offerings
router.get("/offerings", async (req, res) => {
  try {
    const offerings = await prisma.courseOffering.findMany({
      where: { instructorId: req.instructor.id },
      include: {
        curriculum: {
          select: { courseCode: true, courseName: true, courseNameEn: true, credits: true, year: true, semester: true },
        },
        _count: { select: { enrollments: { where: { status: "active" } } } },
      },
      orderBy: { id: "desc" },
    });

    const offeringIds = offerings.map((o) => o.id);
    const pendingGroups = await prisma.enrollment.groupBy({
      by: ["offeringId"],
      where: { offeringId: { in: offeringIds }, status: "pending" },
      _count: { _all: true },
    });
    const pendingCountMap = Object.fromEntries(pendingGroups.map((p) => [p.offeringId, p._count._all]));

    res.json(offerings.map((o) => ({
      ...o,
      enrolledCount: o._count.enrollments,
      pendingCount:  pendingCountMap[o.id] ?? 0,
      _count: undefined,
    })));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Sunucu hatası" });
  }
});

// GET /api/instructor/offerings/:id
router.get("/offerings/:id", async (req, res) => {
  try {
    const offeringId = parseInt(req.params.id);
    const check = await getOwnOffering(req.instructor.id, offeringId);
    if (check.error) return res.status(check.error).json({ message: check.message });

    const [offering, pendingCount] = await Promise.all([
      prisma.courseOffering.findUnique({
        where: { id: offeringId },
        include: {
          curriculum: true,
          instructor: { select: { id: true, fullName: true, title: true } },
          _count: { select: { enrollments: { where: { status: "active" } } } },
        },
      }),
      prisma.enrollment.count({ where: { offeringId, status: "pending" } }),
    ]);

    res.json({ ...offering, enrolledCount: offering._count.enrollments, pendingCount, _count: undefined });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Sunucu hatası" });
  }
});

// POST /api/instructor/offerings
router.post("/offerings", async (req, res) => {
  try {
    const { curriculumId, academicTerm, day, startTime, endTime, room } = req.body;

    if (!curriculumId || !academicTerm) {
      return res.status(400).json({ message: "curriculumId ve academicTerm zorunludur" });
    }

    const curriculum = await prisma.curriculum.findUnique({ where: { id: parseInt(curriculumId) } });
    if (!curriculum) return res.status(404).json({ message: "Müfredatta bu ders bulunamadı" });

    const existing = await prisma.courseOffering.findUnique({
      where: {
        curriculumId_academicTerm_instructorId: {
          curriculumId: parseInt(curriculumId),
          academicTerm,
          instructorId: req.instructor.id,
        },
      },
    });
    if (existing) return res.status(409).json({ message: "Bu dersi bu dönemde zaten açtınız" });

    const offering = await prisma.courseOffering.create({
      data: {
        curriculumId: parseInt(curriculumId),
        instructorId: req.instructor.id,
        academicTerm,
        day: day || null,
        startTime: startTime || null,
        endTime: endTime || null,
        room: room || null,
      },
      include: { curriculum: true },
    });

    res.json(offering);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Sunucu hatası" });
  }
});

// DELETE /api/instructor/offerings/:id
router.delete("/offerings/:id", async (req, res) => {
  try {
    const offeringId = parseInt(req.params.id);
    const check = await getOwnOffering(req.instructor.id, offeringId);
    if (check.error) return res.status(check.error).json({ message: check.message });

    await prisma.attendanceNew.deleteMany({ where: { offeringId } });
    await prisma.enrollment.deleteMany({ where: { offeringId } });
    await prisma.courseOffering.delete({ where: { id: offeringId } });

    res.json({ message: "Ders silindi" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Sunucu hatası" });
  }
});

module.exports = router;
