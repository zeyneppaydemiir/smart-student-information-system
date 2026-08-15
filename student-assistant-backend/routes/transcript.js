const express = require("express");
const router = express.Router();
const prisma = require("../lib/prisma");
const authMiddleware = require("../middleware/auth");

router.use(authMiddleware);

const GRADE_POINTS = {
  AA: 4.00, BA: 3.50, BB: 3.00, CB: 2.50,
  CC: 2.00, DC: 1.50, DD: 1.00, FD: 0.50, FF: 0.00,
};

function formatSemester(tr) {
  return {
    id: tr.id,
    label: tr.label,
    semester: tr.semester,
    status: tr.status,
    gpa: tr.gpa,
    credits: tr.creditsEarned,
    color: tr.color,
    courses: (tr.courses || []).map((tc) => ({
      code: tc.courseCode,
      name: tc.courseName,
      nameEn: tc.courseNameEn || tc.courseName,
      credits: tc.credits,
      grade: tc.grade,
    })),
  };
}

// GET /api/transcript/summary — önce tanimlanmali
router.get("/summary", async (req, res) => {
  const semesters = await prisma.transcript.findMany({
    where: { userId: req.user.id, status: "completed" },
    include: { courses: true },
  });

  let totalCredits = 0;
  let totalPoints = 0;

  for (const sem of semesters) {
    for (const tc of sem.courses) {
      const pts = GRADE_POINTS[tc.grade];
      if (pts === undefined) continue;
      totalCredits += tc.credits;
      totalPoints += pts * tc.credits;
    }
  }

  const cumulativeGpa = totalCredits > 0
    ? Math.round((totalPoints / totalCredits) * 100) / 100
    : 0;

  const allSemesters = await prisma.transcript.count({ where: { userId: req.user.id } });

  res.json({
    cumulativeGpa,
    totalCredits,
    completedSemesters: semesters.length,
    totalSemesters: allSemesters,
  });
});

// GET /api/transcript
router.get("/", async (req, res) => {
  const semesters = await prisma.transcript.findMany({
    where: { userId: req.user.id },
    include: { courses: true },
    orderBy: { id: "asc" },
  });

  res.json(semesters.map(formatSemester));
});

// GET /api/transcript/:id
router.get("/:id", async (req, res) => {
  const tr = await prisma.transcript.findFirst({
    where: { id: parseInt(req.params.id), userId: req.user.id },
    include: { courses: true },
  });

  if (!tr) {
    return res.status(404).json({ message: "Donem bulunamadi" });
  }

  res.json(formatSemester(tr));
});

module.exports = router;
