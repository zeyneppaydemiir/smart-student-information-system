const express = require("express");
const router = express.Router();
const prisma = require("../lib/prisma");

// GET /api/curriculum/departments
// Mevcut bölümlerin listesi (DISTINCT department)
router.get("/departments", async (req, res) => {
  try {
    const rows = await prisma.curriculum.findMany({
      distinct: ["department"],
      select: { department: true },
      orderBy: { department: "asc" },
    });
    res.json(rows.map((r) => r.department));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Sunucu hatası" });
  }
});

// GET /api/curriculum/:department/year/:year/semester/:semester
// Belirli yıl ve dönemin dersleri
router.get("/:department/year/:year/semester/:semester", async (req, res) => {
  try {
    const { department, year, semester } = req.params;
    const courses = await prisma.curriculum.findMany({
      where: {
        department: decodeURIComponent(department),
        year: parseInt(year),
        semester: decodeURIComponent(semester),
      },
      orderBy: [{ type: "asc" }, { courseCode: "asc" }],
    });
    res.json(courses);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Sunucu hatası" });
  }
});

// GET /api/curriculum/:department
// Bölümün tüm dersleri (year ve semester'a göre sıralı)
router.get("/:department", async (req, res) => {
  try {
    const { department } = req.params;
    const courses = await prisma.curriculum.findMany({
      where: { department: decodeURIComponent(department) },
      orderBy: [{ year: "asc" }, { semester: "asc" }, { type: "asc" }, { courseCode: "asc" }],
    });
    res.json(courses);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Sunucu hatası" });
  }
});

// GET /api/curriculum
// Tüm müfredatı dön (department > year > semester > type > code sıralı)
router.get("/", async (req, res) => {
  try {
    const courses = await prisma.curriculum.findMany({
      orderBy: [
        { department: "asc" },
        { year: "asc" },
        { semester: "asc" },
        { type: "asc" },
        { courseCode: "asc" },
      ],
    });
    res.json(courses);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Sunucu hatası" });
  }
});

module.exports = router;
