const express = require("express");
const router = express.Router();
const prisma = require("../lib/prisma");
const instructorAuth = require("../middleware/instructorAuth");

router.use(instructorAuth);

const VALID_GRADES = ["AA", "BA", "BB", "CB", "CC", "DC", "DD", "FD", "FF"];

const GPA_SCALE = {
  AA: 4.00, BA: 3.50, BB: 3.00, CB: 2.50,
  CC: 2.00, DC: 1.50, DD: 1.00, FD: 0.50, FF: 0.00,
};

async function getOwnOffering(instructorId, offeringId) {
  const offering = await prisma.courseOffering.findUnique({ where: { id: offeringId } });
  if (!offering) return { error: 404, message: "Ders bulunamadı" };
  if (offering.instructorId !== instructorId) return { error: 403, message: "Bu ders size ait değil" };
  return { offering };
}

async function syncGradeToTranscript(studentId, offeringId, grade) {
  if (!grade) return;

  const offering = await prisma.courseOffering.findUnique({
    where: { id: offeringId },
    include: { curriculum: true },
  });
  if (!offering) return;

  const { curriculum, academicTerm } = offering;

  // Find or create Transcript record for this student + academic term
  const transcript = await prisma.transcript.upsert({
    where: { userId_semester: { userId: studentId, semester: academicTerm } },
    create: {
      userId: studentId,
      semester: academicTerm,
      label: academicTerm,
      status: "completed",
      gpa: 0,
      creditsEarned: 0,
      color: "blue",
    },
    update: {},
  });

  // Add or update the TranscriptCourse entry for this course
  const existingCourse = await prisma.transcriptCourse.findFirst({
    where: { transcriptId: transcript.id, courseCode: curriculum.courseCode },
  });

  if (existingCourse) {
    await prisma.transcriptCourse.update({
      where: { id: existingCourse.id },
      data: {
        grade,
        courseName: curriculum.courseName,
        credits: curriculum.credits,
      },
    });
  } else {
    await prisma.transcriptCourse.create({
      data: {
        transcriptId: transcript.id,
        courseCode: curriculum.courseCode,
        courseName: curriculum.courseName,
        credits: curriculum.credits,
        grade,
      },
    });
  }

  // Recalculate this semester's GPA and creditsEarned
  const semCourses = await prisma.transcriptCourse.findMany({
    where: { transcriptId: transcript.id },
  });
  let semPoints = 0, semCredits = 0;
  for (const tc of semCourses) {
    const pts = GPA_SCALE[tc.grade];
    if (pts !== undefined) {
      semCredits += tc.credits;
      semPoints += pts * tc.credits;
    }
  }
  const semGpa = semCredits > 0 ? Math.round((semPoints / semCredits) * 100) / 100 : 0;
  await prisma.transcript.update({
    where: { id: transcript.id },
    data: { gpa: semGpa, creditsEarned: semCredits },
  });

  // Recalculate cumulative GPA across all transcripts for this student and update User.gpa
  const allTranscripts = await prisma.transcript.findMany({
    where: { userId: studentId },
    include: { courses: true },
  });
  let totalPoints = 0, totalCredits = 0;
  for (const tr of allTranscripts) {
    for (const tc of tr.courses) {
      const pts = GPA_SCALE[tc.grade];
      if (pts !== undefined) {
        totalCredits += tc.credits;
        totalPoints += pts * tc.credits;
      }
    }
  }
  const cumulativeGpa = totalCredits > 0 ? Math.round((totalPoints / totalCredits) * 100) / 100 : 0;
  await prisma.user.update({
    where: { id: studentId },
    data: { gpa: cumulativeGpa },
  });
}

// PUT /api/instructor/offerings/:offeringId/students/:studentId/grade
router.put("/offerings/:offeringId/students/:studentId/grade", async (req, res) => {
  try {
    const offeringId = parseInt(req.params.offeringId);
    const studentId = parseInt(req.params.studentId);
    const { grade } = req.body;

    if (grade != null && !VALID_GRADES.includes(grade)) {
      return res.status(400).json({ message: `Geçersiz not. Geçerli: ${VALID_GRADES.join(", ")}` });
    }

    const check = await getOwnOffering(req.instructor.id, offeringId);
    if (check.error) return res.status(check.error).json({ message: check.message });

    const enrollment = await prisma.enrollment.findUnique({
      where: { studentId_offeringId: { studentId, offeringId } },
    });
    if (!enrollment) return res.status(404).json({ message: "Öğrenci bu derse kayıtlı değil" });

    const updated = await prisma.enrollment.update({
      where: { id: enrollment.id },
      data: {
        grade: grade || null,
        status: grade ? "graded" : "active",
      },
    });

    // Sync grade to Transcript table and recalculate GPA
    await syncGradeToTranscript(studentId, offeringId, grade || null);

    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Sunucu hatası" });
  }
});

// PUT /api/instructor/offerings/:offeringId/grades/bulk
router.put("/offerings/:offeringId/grades/bulk", async (req, res) => {
  try {
    const offeringId = parseInt(req.params.offeringId);
    const { grades } = req.body;

    if (!Array.isArray(grades)) {
      return res.status(400).json({ message: "grades bir dizi olmalı: [{ studentId, grade }]" });
    }

    const check = await getOwnOffering(req.instructor.id, offeringId);
    if (check.error) return res.status(check.error).json({ message: check.message });

    let updated = 0;
    for (const { studentId, grade } of grades) {
      if (grade && !VALID_GRADES.includes(grade)) continue;

      const enrollment = await prisma.enrollment.findUnique({
        where: { studentId_offeringId: { studentId: parseInt(studentId), offeringId } },
      });
      if (!enrollment) continue;

      await prisma.enrollment.update({
        where: { id: enrollment.id },
        data: {
          grade: grade || null,
          status: grade ? "graded" : "active",
        },
      });

      // Sync grade to Transcript table and recalculate GPA
      await syncGradeToTranscript(parseInt(studentId), offeringId, grade || null);

      updated++;
    }

    res.json({ message: `${updated} öğrencinin notu güncellendi`, updated });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Sunucu hatası" });
  }
});

// POST /api/instructor/offerings/:offeringId/finalize
router.post("/offerings/:offeringId/finalize", async (req, res) => {
  try {
    const offeringId = parseInt(req.params.offeringId);

    const check = await getOwnOffering(req.instructor.id, offeringId);
    if (check.error) return res.status(check.error).json({ message: check.message });

    const gradedEnrollments = await prisma.enrollment.findMany({
      where: { offeringId, status: "graded" },
    });

    if (gradedEnrollments.length === 0) {
      return res.status(400).json({ message: "Notlandırılmış öğrenci bulunamadı" });
    }

    for (const enr of gradedEnrollments) {
      await prisma.enrollment.update({
        where: { id: enr.id },
        data: { status: "completed" },
      });
    }

    res.json({ message: `${gradedEnrollments.length} öğrencinin kaydı tamamlandı`, finalized: gradedEnrollments.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Sunucu hatası" });
  }
});

module.exports = router;
