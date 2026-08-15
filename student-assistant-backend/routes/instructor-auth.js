const express = require("express");
const router = express.Router();
const prisma = require("../lib/prisma");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const instructorAuth = require("../middleware/instructorAuth");

const VALID_TITLES = ["Dr.", "Doç. Dr.", "Prof. Dr.", "Öğr. Gör.", "Arş. Gör."];
const VALID_DEPARTMENTS = [
  "Bilgisayar Mühendisliği",
  "Endüstri Mühendisliği",
  "Elektrik-Elektronik Mühendisliği",
  "Makine Mühendisliği",
  "Havacılık ve Uzay Mühendisliği",
];

function safeInstructor(inst) {
  const { passwordHash, ...rest } = inst;
  return rest;
}

function signToken(instructor) {
  return jwt.sign(
    { id: instructor.id, email: instructor.email, role: "instructor", department: instructor.department },
    process.env.JWT_SECRET,
    { expiresIn: "24h" }
  );
}

// POST /api/instructor/register
router.post("/register", async (req, res) => {
  try {
    const { email, password, fullName, title, department, phone } = req.body;

    if (!email || !password || !fullName || !title || !department) {
      return res.status(400).json({ message: "Tüm alanlar zorunludur" });
    }
    if (fullName.trim().length < 3) {
      return res.status(400).json({ message: "Ad en az 3 karakter olmalı" });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ message: "Geçersiz email formatı" });
    }
    if (password.length < 6) {
      return res.status(400).json({ message: "Şifre en az 6 karakter olmalı" });
    }
    if (!VALID_TITLES.includes(title)) {
      return res.status(400).json({ message: `Geçersiz ünvan. Geçerli: ${VALID_TITLES.join(", ")}` });
    }
    if (!VALID_DEPARTMENTS.includes(department)) {
      return res.status(400).json({ message: "Geçersiz bölüm" });
    }

    const existing = await prisma.instructor.findUnique({ where: { email } });
    if (existing) return res.status(409).json({ message: "Bu email zaten kayıtlı" });

    const passwordHash = await bcrypt.hash(password, 10);
    const instructor = await prisma.instructor.create({
      data: { email, passwordHash, fullName, title, department, phone: phone || null },
    });

    res.json({ token: signToken(instructor), instructor: safeInstructor(instructor) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Sunucu hatası" });
  }
});

// POST /api/instructor/login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: "Email ve şifre zorunludur" });
    }

    const instructor = await prisma.instructor.findUnique({ where: { email } });
    if (!instructor) return res.status(401).json({ message: "Email veya şifre hatalı" });

    const valid = await bcrypt.compare(password, instructor.passwordHash);
    if (!valid) return res.status(401).json({ message: "Email veya şifre hatalı" });

    res.json({ token: signToken(instructor), instructor: safeInstructor(instructor) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Sunucu hatası" });
  }
});

// GET /api/instructor/me
router.get("/me", instructorAuth, async (req, res) => {
  try {
    const instructor = await prisma.instructor.findUnique({ where: { id: req.instructor.id } });
    if (!instructor) return res.status(404).json({ message: "Hoca bulunamadı" });
    res.json(safeInstructor(instructor));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Sunucu hatası" });
  }
});

module.exports = router;
