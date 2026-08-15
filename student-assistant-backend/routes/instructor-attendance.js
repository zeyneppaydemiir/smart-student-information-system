const express = require("express");
const router = express.Router();
const prisma = require("../lib/prisma");
const instructorAuth = require("../middleware/instructorAuth");

router.use(instructorAuth);

const VALID_STATUSES = ["present", "absent", "late"];

async function getOwnOffering(instructorId, offeringId) {
  const offering = await prisma.courseOffering.findUnique({ where: { id: offeringId } });
  if (!offering) return { error: 404, message: "Ders bulunamadı" };
  if (offering.instructorId !== instructorId) return { error: 403, message: "Bu ders size ait değil" };
  return { offering };
}

// POST /api/instructor/offerings/:offeringId/attendance
router.post("/offerings/:offeringId/attendance", async (req, res) => {
  try {
    const offeringId = parseInt(req.params.offeringId);
    const { date, records } = req.body;

    if (!date || !Array.isArray(records)) {
      return res.status(400).json({ message: "date ve records zorunludur" });
    }

    const dateObj = new Date(date);
    if (isNaN(dateObj.getTime())) {
      return res.status(400).json({ message: "Geçersiz tarih (YYYY-MM-DD bekleniyor)" });
    }

    const check = await getOwnOffering(req.instructor.id, offeringId);
    if (check.error) return res.status(check.error).json({ message: check.message });

    let saved = 0;
    for (const { studentId, status } of records) {
      if (!VALID_STATUSES.includes(status)) continue;

      await prisma.attendanceNew.upsert({
        where: {
          studentId_offeringId_date: {
            studentId: parseInt(studentId),
            offeringId,
            date: dateObj,
          },
        },
        update: { status, instructorId: req.instructor.id },
        create: {
          studentId: parseInt(studentId),
          offeringId,
          instructorId: req.instructor.id,
          date: dateObj,
          status,
        },
      });
      saved++;
    }

    res.json({ message: `${saved} devamsızlık kaydedildi`, saved });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Sunucu hatası" });
  }
});

// GET /api/instructor/offerings/:offeringId/attendance?date=YYYY-MM-DD
router.get("/offerings/:offeringId/attendance", async (req, res) => {
  try {
    const offeringId = parseInt(req.params.offeringId);
    const { date, studentId } = req.query;

    const check = await getOwnOffering(req.instructor.id, offeringId);
    if (check.error) return res.status(check.error).json({ message: check.message });

    const where = { offeringId };

    if (date) {
      const dateObj = new Date(date);
      if (!isNaN(dateObj.getTime())) {
        const next = new Date(dateObj);
        next.setDate(next.getDate() + 1);
        where.date = { gte: dateObj, lt: next };
      }
    }

    if (studentId) {
      where.studentId = parseInt(studentId);
    }

    const records = await prisma.attendanceNew.findMany({
      where,
      include: {
        student: { select: { id: true, fullName: true, studentNumber: true } },
      },
      orderBy: [{ date: "desc" }, { studentId: "asc" }],
    });

    res.json(records);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Sunucu hatası" });
  }
});

module.exports = router;
