const express = require("express");
const router = express.Router();
const prisma = require("../lib/prisma");
const authMiddleware = require("../middleware/auth");

router.use(authMiddleware);

function formatForm(f) {
  return {
    ...f,
    fields: f.fields ? JSON.parse(f.fields) : [],
  };
}

// GET /api/forms/submissions/all — kullanicinin basvurulari
// /:id'den ÖNCE tanimlanmali, yoksa "submissions" id olarak yakalanir
router.get("/submissions/all", async (req, res) => {
  const submissions = await prisma.submission.findMany({
    where: { userId: req.user.id },
    include: { form: { select: { title: true } } },
    orderBy: { createdAt: "desc" },
  });

  const result = submissions.map((s) => ({
    id: s.id,
    formId: s.formId,
    formTitle: s.form.title,
    status: s.status,
    data: s.data ? JSON.parse(s.data) : null,
    submittedAt: s.createdAt,
  }));

  res.json(result);
});

// GET /api/forms
router.get("/", async (req, res) => {
  const { status, search } = req.query;

  const where = {};
  if (status && status !== "all") where.status = status;
  if (search) {
    const q = search.toLowerCase();
    where.OR = [
      { title: { contains: q } },
      { description: { contains: q } },
    ];
  }

  const forms = await prisma.form.findMany({ where, orderBy: { id: "asc" } });
  res.json(forms.map(formatForm));
});

// GET /api/forms/:id
router.get("/:id", async (req, res) => {
  const form = await prisma.form.findUnique({
    where: { id: parseInt(req.params.id) },
  });

  if (!form) {
    return res.status(404).json({ message: "Form bulunamadi" });
  }

  res.json(formatForm(form));
});

// POST /api/forms/:id/submit
router.post("/:id/submit", async (req, res) => {
  const formId = parseInt(req.params.id);
  const form = await prisma.form.findUnique({ where: { id: formId } });

  if (!form) {
    return res.status(404).json({ message: "Form bulunamadi" });
  }

  if (form.status !== "open") {
    return res.status(400).json({ message: "Bu form artik basvuruya kapali" });
  }

  const { values } = req.body;
  const fields = form.fields ? JSON.parse(form.fields) : [];

  for (const field of fields) {
    if (!values || !values[field.name]) {
      return res.status(400).json({ message: `'${field.label}' alani bos olamaz` });
    }
  }

  // Kullanici daha once basvurmus mu?
  const existing = await prisma.submission.findFirst({
    where: { userId: req.user.id, formId },
  });
  if (existing) {
    return res.status(409).json({ message: "Bu forma zaten basvurdunuz" });
  }

  const submission = await prisma.submission.create({
    data: {
      userId: req.user.id,
      formId,
      status: "pending",
      data: values ? JSON.stringify(values) : null,
    },
  });

  res.json({
    message: "Basvurun alindi!",
    submission: {
      id: submission.id,
      formId: submission.formId,
      status: submission.status,
      submittedAt: submission.createdAt,
    },
  });
});

module.exports = router;
