const express = require("express");
const router = express.Router();
const prisma = require("../lib/prisma");
const authMiddleware = require("../middleware/auth");

router.use(authMiddleware);

// Aggregate AttendanceNew records for this student, grouped by offering.
// Returns { newCourses, newRecentAbsences }
async function buildFromNewSystem(studentId) {
  const records = await prisma.attendanceNew.findMany({
    where: { studentId },
    include: {
      offering: {
        include: {
          curriculum: true,
          instructor: { select: { fullName: true, title: true } },
        },
      },
    },
    orderBy: { date: "desc" },
  });

  const offeringMap = {};
  for (const r of records) {
    const oid = r.offeringId;
    if (!offeringMap[oid]) {
      const cur = r.offering.curriculum;
      const instr = r.offering.instructor;
      offeringMap[oid] = {
        offeringId: oid,
        code: cur.courseCode,
        name: cur.courseName,
        instructor: instr ? `${instr.title} ${instr.fullName}` : "",
        totalWeeks: 0,
        attended: 0,
        absent: 0,
        late: 0,
        nonPresent: [],
      };
    }
    const entry = offeringMap[oid];
    entry.totalWeeks++;
    if (r.status === "present") {
      entry.attended++;
    } else if (r.status === "absent") {
      entry.absent++;
      entry.nonPresent.push({ course: entry.name, code: entry.code, date: r.date.toISOString().slice(0, 10), type: "absent" });
    } else if (r.status === "late") {
      entry.late++;
      entry.nonPresent.push({ course: entry.name, code: entry.code, date: r.date.toISOString().slice(0, 10), type: "late" });
    }
  }

  const newCourses = Object.values(offeringMap).map((o, i) => ({
    id: `new-${o.offeringId}`,
    code: o.code,
    name: o.name,
    instructor: o.instructor,
    totalWeeks: o.totalWeeks,
    attended: o.attended,
    absent: o.absent,
    late: o.late,
  }));

  const newRecentAbsences = Object.values(offeringMap)
    .flatMap((o) => o.nonPresent)
    .sort((a, b) => new Date(b.date) - new Date(a.date));

  return { newCourses, newRecentAbsences };
}

// GET /api/attendance/summary — must be defined before "/"
router.get("/summary", async (req, res) => {
  try {
    const { newCourses } = await buildFromNewSystem(req.user.id);

    const oldRecords = await prisma.attendance.findMany({
      where: { userId: req.user.id },
    });

    let totalClasses = 0, totalAttended = 0, totalAbsent = 0, atRiskCount = 0;

    for (const c of newCourses) {
      totalClasses += c.totalWeeks;
      totalAttended += c.attended;
      totalAbsent += c.absent;
      const pct = c.totalWeeks > 0 ? (c.attended / c.totalWeeks) * 100 : 100;
      if (pct < 80) atRiskCount++;
    }

    for (const c of oldRecords) {
      totalClasses += c.totalWeeks;
      totalAttended += c.attended;
      totalAbsent += c.absent;
      const pct = c.totalWeeks > 0 ? (c.attended / c.totalWeeks) * 100 : 100;
      if (pct < 80) atRiskCount++;
    }

    const overallPercentage = totalClasses > 0
      ? Math.round((totalAttended / totalClasses) * 100)
      : 0;

    res.json({ overallPercentage, totalClasses, totalAttended, totalAbsent, atRiskCount });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Sunucu hatası" });
  }
});

// GET /api/attendance
router.get("/", async (req, res) => {
  try {
    const { newCourses, newRecentAbsences } = await buildFromNewSystem(req.user.id);

    const oldRecords = await prisma.attendance.findMany({
      where: { userId: req.user.id },
      include: { records: true },
      orderBy: { id: "asc" },
    });

    const oldCourses = oldRecords.map((a, i) => ({
      id: i + 1,
      code: a.courseCode,
      name: a.courseName,
      instructor: a.instructor,
      totalWeeks: a.totalWeeks,
      attended: a.attended,
      absent: a.absent,
      late: a.late,
    }));

    const oldRecentAbsences = oldRecords
      .flatMap((a) =>
        a.records.map((r) => ({
          course: a.courseName,
          code: r.courseCode,
          date: r.date,
          type: r.type,
        }))
      )
      .sort((a, b) => new Date(b.date) - new Date(a.date));

    const courses = [...newCourses, ...oldCourses];
    const recentAbsences = [...newRecentAbsences, ...oldRecentAbsences]
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 10);

    res.json({ courses, recentAbsences });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Sunucu hatası" });
  }
});

module.exports = router;
