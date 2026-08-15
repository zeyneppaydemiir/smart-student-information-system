const express = require("express");
const router = express.Router();
const prisma = require("../lib/prisma");

// GET /api/offerings
// Query: ?department=...&year=...&semester=...&academicTerm=...
router.get("/", async (req, res) => {
  try {
    const { department, year, semester, academicTerm } = req.query;

    const curriculumWhere = {};
    if (department) curriculumWhere.department = department;
    if (year)       curriculumWhere.year        = parseInt(year);
    if (semester)   curriculumWhere.semester    = semester;

    const where = {};
    if (academicTerm)                          where.academicTerm = academicTerm;
    if (Object.keys(curriculumWhere).length)   where.curriculum   = curriculumWhere;

    const offerings = await prisma.courseOffering.findMany({
      where,
      include: {
        curriculum: true,
        instructor: { select: { id: true, fullName: true, title: true, department: true } },
        _count: { select: { enrollments: { where: { status: "active" } } } },
      },
      orderBy: { curriculum: { courseCode: "asc" } },
    });

    res.json(
      offerings.map((o) => ({ ...o, enrolledCount: o._count.enrollments, _count: undefined }))
    );
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Sunucu hatası" });
  }
});

// GET /api/offerings/:id
router.get("/:id", async (req, res) => {
  try {
    const offering = await prisma.courseOffering.findUnique({
      where: { id: parseInt(req.params.id) },
      include: {
        curriculum: true,
        instructor: { select: { id: true, fullName: true, title: true, department: true } },
        _count: { select: { enrollments: { where: { status: "active" } } } },
      },
    });

    if (!offering) return res.status(404).json({ message: "Ders bulunamadı" });

    res.json({ ...offering, enrolledCount: offering._count.enrollments, _count: undefined });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Sunucu hatası" });
  }
});

module.exports = router;
