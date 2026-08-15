const express = require("express");
const router = express.Router();
const prisma = require("../lib/prisma");
const authMiddleware = require("../middleware/auth");

router.use(authMiddleware);

const DAY_MAP = { Pazartesi: 1, Salı: 2, Çarşamba: 3, Perşembe: 4, Cuma: 5 };
const COLORS  = ["blue", "green", "sky", "slate", "purple", "orange"];

function parseTime(t) {
  if (!t) return { hour: 0, min: 0 };
  const parts = t.split(":");
  return { hour: parseInt(parts[0]) || 0, min: parseInt(parts[1]) || 0 };
}

function toMinutes(timeStr) {
  const { hour, min } = parseTime(timeStr);
  return hour * 60 + min;
}

function formatEnrollment(enrollment, colorIndex) {
  const { offering } = enrollment;
  const { curriculum, instructor } = offering;
  const start = parseTime(offering.startTime);
  const end   = parseTime(offering.endTime);
  const dayNum = DAY_MAP[offering.day] || null;
  const instructorName     = instructor ? `${instructor.title} ${instructor.fullName}` : "";
  const instructorInitials = instructor
    ? instructor.fullName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : "?";

  return {
    id:                 enrollment.id,
    offeringId:         offering.id,
    code:               curriculum.courseCode,
    name:               curriculum.courseName,
    nameEn:             curriculum.courseNameEn || curriculum.courseName,
    credits:            curriculum.credits,
    ects:               curriculum.ects,
    type:               curriculum.type,
    department:         curriculum.department,
    instructor:         instructorName,
    instructorInitials,
    schedule:           offering.day && offering.startTime
                          ? `${offering.day}  ${offering.startTime}-${offering.endTime}`
                          : "",
    room:               offering.room || "",
    academicTerm:       offering.academicTerm,
    semester:           offering.academicTerm,
    grade:              enrollment.grade || null,
    status:             enrollment.status,
    enrolledAt:         enrollment.enrolledAt,
    color:              COLORS[colorIndex % COLORS.length],
    days:               dayNum ? [dayNum] : [],
    startHour:          start.hour,
    startMin:           start.min,
    endHour:            end.hour,
    endMin:             end.min,
    progress:           enrollment.status === "completed" || enrollment.status === "graded" ? 100 : 0,
  };
}

function formatOldCourse(c, colorIndex) {
  return {
    id:                 `old-${c.id}`,
    offeringId:         null,
    code:               c.courseCode,
    name:               c.courseName,
    nameEn:             c.courseNameEn || c.courseName,
    credits:            c.credits,
    ects:               null,
    type:               null,
    department:         c.department,
    instructor:         c.instructor,
    instructorInitials: c.instructorInitials,
    schedule:           c.schedule,
    room:               c.room,
    academicTerm:       c.semester,
    semester:           c.semester,
    grade:              c.grade,
    status:             c.status,
    color:              c.color || COLORS[colorIndex % COLORS.length],
    days:               c.days ? c.days.split(",").map(Number) : [],
    startHour:          c.startHour,
    startMin:           c.startMin,
    endHour:            c.endHour,
    endMin:             c.endMin,
    progress:           c.progress || 0,
  };
}

// ─── POST /api/student/enrollments ───────────────────────────────────────────
// Creates a PENDING enrollment request; instructor must approve before active.
router.post("/enrollments", async (req, res) => {
  try {
    const { offeringId } = req.body;
    if (!offeringId) return res.status(400).json({ message: "offeringId zorunludur" });

    const offering = await prisma.courseOffering.findUnique({
      where: { id: parseInt(offeringId) },
    });
    if (!offering) return res.status(404).json({ message: "Ders bulunamadı" });

    // Already enrolled/requested check — covers all blocking statuses
    const existing = await prisma.enrollment.findUnique({
      where: {
        studentId_offeringId: { studentId: req.user.id, offeringId: parseInt(offeringId) },
      },
    });
    if (existing) {
      if (existing.status === "active")    return res.status(409).json({ message: "Bu derse zaten kayıtlısınız" });
      if (existing.status === "graded")    return res.status(409).json({ message: "Bu derse zaten not aldınız" });
      if (existing.status === "completed") return res.status(409).json({ message: "Bu dersi zaten tamamladınız" });
      if (existing.status === "pending")   return res.status(409).json({ message: "Bu ders için zaten bir talebiniz var" });
    }

    // Conflict check: same day, overlapping time against active enrollments only
    if (offering.day && offering.startTime && offering.endTime) {
      const newStart = toMinutes(offering.startTime);
      const newEnd   = toMinutes(offering.endTime);

      const activeEnrollments = await prisma.enrollment.findMany({
        where: { studentId: req.user.id, status: "active" },
        include: { offering: true },
      });

      for (const enr of activeEnrollments) {
        const o = enr.offering;
        if (o.day !== offering.day || !o.startTime || !o.endTime) continue;
        const oStart = toMinutes(o.startTime);
        const oEnd   = toMinutes(o.endTime);
        if (newStart < oEnd && oStart < newEnd) {
          return res.status(409).json({ message: "Bu saatte başka dersiniz var" });
        }
      }
    }

    // Create pending request or re-activate a dropped/rejected one
    let enrollment;
    if (existing && (existing.status === "dropped" || existing.status === "rejected")) {
      enrollment = await prisma.enrollment.update({
        where: { id: existing.id },
        data: { status: "pending", enrolledAt: new Date() },
      });
    } else {
      enrollment = await prisma.enrollment.create({
        data: {
          studentId:  req.user.id,
          offeringId: parseInt(offeringId),
          status:     "pending",
        },
      });
    }

    res.json({ message: "Kayıt talebiniz iletildi", enrollment });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Sunucu hatası" });
  }
});

// ─── DELETE /api/student/enrollment-requests/:id ──────────────────────────────
// Student cancels their own pending request
router.delete("/enrollment-requests/:id", async (req, res) => {
  try {
    const enrollmentId = parseInt(req.params.id);
    const enrollment = await prisma.enrollment.findUnique({ where: { id: enrollmentId } });

    if (!enrollment)                          return res.status(404).json({ message: "Talep bulunamadı" });
    if (enrollment.studentId !== req.user.id) return res.status(403).json({ message: "Bu talep size ait değil" });
    if (enrollment.status !== "pending")      return res.status(400).json({ message: "Sadece beklemedeki talepler iptal edilebilir" });

    await prisma.enrollment.update({ where: { id: enrollmentId }, data: { status: "dropped" } });
    res.json({ message: "Talep iptal edildi" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Sunucu hatası" });
  }
});

// ─── GET /api/student/enrollments ────────────────────────────────────────────
router.get("/enrollments", async (req, res) => {
  try {
    const { status } = req.query;
    const where = { studentId: req.user.id };
    if (status) where.status = status;

    const enrollments = await prisma.enrollment.findMany({
      where,
      include: {
        offering: {
          include: {
            curriculum: true,
            instructor: { select: { id: true, fullName: true, title: true } },
          },
        },
      },
      orderBy: { enrolledAt: "desc" },
    });

    res.json(enrollments.map((e, i) => formatEnrollment(e, i)));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Sunucu hatası" });
  }
});

// ─── DELETE /api/student/enrollments/:id ─────────────────────────────────────
router.delete("/enrollments/:id", async (req, res) => {
  try {
    const enrollmentId = parseInt(req.params.id);
    const enrollment = await prisma.enrollment.findUnique({ where: { id: enrollmentId } });

    if (!enrollment)                           return res.status(404).json({ message: "Kayıt bulunamadı" });
    if (enrollment.studentId !== req.user.id)  return res.status(403).json({ message: "Bu kayıt size ait değil" });
    if (enrollment.grade)                      return res.status(400).json({ message: "Not girilmiş ders kaydından çıkamazsınız" });
    if (enrollment.status === "dropped")       return res.status(400).json({ message: "Bu dersten zaten çıkmışsınız" });

    await prisma.enrollment.update({ where: { id: enrollmentId }, data: { status: "dropped" } });
    res.json({ message: "Dersten başarıyla çıkıldı" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Sunucu hatası" });
  }
});

// ─── GET /api/student/my-courses ─────────────────────────────────────────────
// Aktif enrollment (yeni) + eski Course tablosu — birleşik döner
router.get("/my-courses", async (req, res) => {
  try {
    const [enrollments, oldCourses] = await Promise.all([
      prisma.enrollment.findMany({
        where: { studentId: req.user.id, status: { in: ["active", "graded", "completed"] } },
        include: {
          offering: {
            include: {
              curriculum: true,
              instructor: { select: { id: true, fullName: true, title: true } },
            },
          },
        },
        orderBy: { enrolledAt: "asc" },
      }),
      prisma.course.findMany({ where: { userId: req.user.id } }),
    ]);

    const newCourses    = enrollments.map((e, i) => formatEnrollment(e, i));
    const legacyCourses = oldCourses.map((c, i) => formatOldCourse(c, newCourses.length + i));

    res.json([...newCourses, ...legacyCourses]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Sunucu hatası" });
  }
});

// ─── GET /api/student/curriculum-progress ────────────────────────────────────
router.get("/curriculum-progress", async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });

    const [curriculum, enrollments] = await Promise.all([
      prisma.curriculum.findMany({
        where: { department: user.department },
        orderBy: [
          { year: "asc" }, { semester: "asc" }, { type: "asc" }, { courseCode: "asc" },
        ],
        include: {
          offerings: {
            include: {
              instructor: { select: { id: true, fullName: true, title: true } },
              _count: { select: { enrollments: { where: { status: "active" } } } },
            },
          },
        },
      }),
      prisma.enrollment.findMany({
        where: { studentId: req.user.id },
        include: { offering: { select: { curriculumId: true } } },
      }),
    ]);

    // Priority: active=5, graded=4, completed=3, pending=2, dropped=1, rejected=0
    const STATUS_PRIORITY = { active: 5, graded: 4, completed: 3, pending: 2, dropped: 1, rejected: 0 };
    const bestEnrollment = {};
    for (const e of enrollments) {
      const cId = e.offering.curriculumId;
      const prev = bestEnrollment[cId];
      if (!prev || (STATUS_PRIORITY[e.status] ?? 0) > (STATUS_PRIORITY[prev.status] ?? 0)) {
        bestEnrollment[cId] = e;
      }
    }

    const result = curriculum.map((c) => {
      const enr = bestEnrollment[c.id];
      let status;

      if (enr) {
        if (enr.status === "completed" || enr.status === "graded" || (enr.status === "active" && enr.grade)) {
          status = "completed";
        } else if (enr.status === "active") {
          status = "active";
        } else if (enr.status === "pending") {
          status = "pending";
        } else if (enr.status === "rejected") {
          status = "rejected";
        } else {
          // dropped — tekrar açık offering var mı?
          status = c.offerings.length > 0 ? "available" : "not-available";
        }
      } else {
        status = c.offerings.length > 0 ? "available" : "not-available";
      }

      return {
        id:           c.id,
        courseCode:   c.courseCode,
        courseName:   c.courseName,
        courseNameEn: c.courseNameEn || c.courseName,
        credits:      c.credits,
        ects:         c.ects,
        type:         c.type,
        year:         c.year,
        semester:     c.semester,
        status,
        enrollmentId: enr && (enr.status === "active" || enr.status === "pending") ? enr.id : null,
        grade:        enr?.grade || null,
        offerings:    c.offerings.map((o) => ({
          id:           o.id,
          day:          o.day,
          startTime:    o.startTime,
          endTime:      o.endTime,
          room:         o.room,
          academicTerm: o.academicTerm,
          enrolledCount: o._count.enrollments,
          instructor:   o.instructor,
        })),
      };
    });

    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Sunucu hatası" });
  }
});

module.exports = router;
