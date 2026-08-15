const express = require("express");
const router = express.Router();
const prisma = require("../lib/prisma");
const authMiddleware = require("../middleware/auth");

router.use(authMiddleware);

// DB satırını frontend'in beklediği formata çevirir
function formatCourse(c) {
  return {
    id: c.id,
    code: c.courseCode,
    name: c.courseName,
    nameEn: c.courseNameEn || c.courseName,
    department: c.department,
    instructor: c.instructor,
    instructorInitials: c.instructorInitials,
    schedule: c.schedule,
    room: c.room,
    credits: c.credits,
    grade: c.grade,
    progress: c.progress,
    status: c.status,
    semester: c.semester,
    color: c.color,
    days: c.days ? c.days.split(",").map(Number) : [],
    startHour: c.startHour,
    startMin: c.startMin,
    endHour: c.endHour,
    endMin: c.endMin,
  };
}

// GET /api/courses
router.get("/", async (req, res) => {
  const { status, search } = req.query;

  const where = { userId: req.user.id };
  if (status && status !== "all") where.status = status;
  if (search) {
    const q = search.toLowerCase();
    where.OR = [
      { courseName: { contains: q } },
      { courseCode: { contains: q } },
      { instructor: { contains: q } },
    ];
  }

  const courses = await prisma.course.findMany({ where });
  res.json(courses.map(formatCourse));
});

// GET /api/courses/summary
router.get("/summary", async (req, res) => {
  const courses = await prisma.course.findMany({ where: { userId: req.user.id } });

  const totalCourses = courses.length;
  const activeCourses = courses.filter((c) => c.status === "active").length;
  const totalCredits = courses.reduce((s, c) => s + c.credits, 0);
  const avgProgress = totalCourses
    ? Math.round(courses.reduce((s, c) => s + c.progress, 0) / totalCourses)
    : 0;

  res.json({ totalCourses, activeCourses, totalCredits, avgProgress });
});

// GET /api/courses/:id
router.get("/:id", async (req, res) => {
  const course = await prisma.course.findFirst({
    where: { id: parseInt(req.params.id), userId: req.user.id },
  });

  if (!course) {
    return res.status(404).json({ message: "Ders bulunamadi" });
  }

  res.json(formatCourse(course));
});

module.exports = router;
