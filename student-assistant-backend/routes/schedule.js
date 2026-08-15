const express = require("express");
const router = express.Router();
const prisma = require("../lib/prisma");
const authMiddleware = require("../middleware/auth");

router.use(authMiddleware);

function formatScheduleCourse(c) {
  return {
    id: c.id,
    code: c.courseCode,
    name: c.courseName,
    instructor: c.instructor,
    room: c.room,
    credits: c.credits,
    color: c.color,
    days: c.days ? c.days.split(",").map(Number) : [],
    startHour: c.startHour,
    startMin: c.startMin,
    endHour: c.endHour,
    endMin: c.endMin,
  };
}

// GET /api/schedule — haftalik program (day/startTime dolu olanlar)
router.get("/", async (req, res) => {
  const courses = await prisma.course.findMany({
    where: {
      userId: req.user.id,
      NOT: { days: null },
    },
  });

  res.json(courses.map(formatScheduleCourse));
});

// GET /api/schedule/today — bugunun dersleri
router.get("/today", async (req, res) => {
  const courses = await prisma.course.findMany({
    where: {
      userId: req.user.id,
      NOT: { days: null },
    },
  });

  // Pazartesi=1, Sali=2, ..., Pazar=0 (JS getDay())
  const today = new Date().getDay();

  const todayCourses = courses
    .filter((c) => c.days && c.days.split(",").map(Number).includes(today))
    .sort((a, b) => {
      if (a.startHour !== b.startHour) return a.startHour - b.startHour;
      return a.startMin - b.startMin;
    });

  res.json(todayCourses.map(formatScheduleCourse));
});

module.exports = router;
