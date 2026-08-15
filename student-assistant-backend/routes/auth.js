const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const prisma = require("../lib/prisma");
const authMiddleware = require("../middleware/auth");

function makeToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: "24h" }
  );
}

function safeUser(user) {
  const { passwordHash, ...rest } = user;
  return rest;
}

// POST /api/auth/login
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "Email ve sifre gerekli" });
  }

  const normalizedEmail = email.toLowerCase().trim();
  const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (!user) {
    return res.status(401).json({ message: "Email veya sifre hatali" });
  }

  const match = await bcrypt.compare(password, user.passwordHash);
  if (!match) {
    return res.status(401).json({ message: "Email veya sifre hatali" });
  }

  res.json({ token: makeToken(user), user: safeUser(user) });
});

// POST /api/auth/logout
// JWT stateless — sunucu tarafında silinecek bir sey yok.
// Frontend localStorage'i temizler.
router.post("/logout", (req, res) => {
  res.json({ message: "Cikis yapildi" });
});

// GET /api/auth/me
router.get("/me", authMiddleware, async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.user.id } });
  if (!user) {
    return res.status(404).json({ message: "Kullanici bulunamadi" });
  }
  res.json(safeUser(user));
});

// POST /api/auth/register
router.post("/register", async (req, res) => {
  const { email, password, fullName, studentNumber, department, program, year, totalYears, advisor } = req.body;

  if (!email || !password || !fullName || !studentNumber || !department || !program) {
    return res.status(400).json({ message: "email, password, fullName, studentNumber, department ve program zorunlu" });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ message: "Gecersiz email formati" });
  }

  if (password.length < 6) {
    return res.status(400).json({ message: "Sifre en az 6 karakter olmali" });
  }

  const normalizedEmail = email.toLowerCase().trim();

  const existing = await prisma.user.findFirst({
    where: { OR: [{ email: normalizedEmail }, { studentNumber }] },
  });
  if (existing) {
    return res.status(409).json({ message: "Bu email veya ogrenci numarasi zaten kayitli" });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: {
      email: normalizedEmail,
      passwordHash,
      fullName,
      studentNumber,
      department,
      program: program ?? "",
      year: year ? parseInt(year) : 1,
      totalYears: totalYears ? parseInt(totalYears) : 4,
      advisor: advisor ?? null,
    },
  });

  res.status(201).json({ token: makeToken(user), user: safeUser(user) });
});

module.exports = router;
