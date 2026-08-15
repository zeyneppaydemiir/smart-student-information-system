const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const prisma = require("../lib/prisma");
const authMiddleware = require("../middleware/auth");
const instructorAuth = require("../middleware/instructorAuth");

const uploadDir = path.join(__dirname, "../uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const id = req.user?.id || req.instructor?.id || "unknown";
    const role = req.user ? "student" : "instructor";
    cb(null, `${role}-${id}-${Date.now()}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  const allowed = [".jpg", ".jpeg", ".png", ".gif", ".webp"];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowed.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error("Sadece resim dosyaları kabul edilir (jpg, png, gif, webp)"), false);
  }
};

const upload = multer({ storage, fileFilter, limits: { fileSize: 5 * 1024 * 1024 } });

// POST /api/upload/profile-picture  (student)
router.post("/profile-picture", authMiddleware, upload.single("photo"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "Dosya yüklenmedi veya geçersiz format" });
  }

  const filePath = `/uploads/${req.file.filename}`;

  const user = await prisma.user.update({
    where: { id: req.user.id },
    data: { profilePicture: filePath },
  });

  const { passwordHash, ...safeUser } = user;
  res.json({ profilePicture: filePath, user: safeUser });
});

// POST /api/upload/profile-picture-instructor  (instructor)
router.post("/profile-picture-instructor", instructorAuth, upload.single("photo"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "Dosya yüklenmedi veya geçersiz format" });
  }

  const filePath = `/uploads/${req.file.filename}`;

  const instructor = await prisma.instructor.update({
    where: { id: req.instructor.id },
    data: { profilePicture: filePath },
  });

  const { passwordHash, ...safeInstructor } = instructor;
  res.json({ profilePicture: filePath, instructor: safeInstructor });
});

module.exports = router;
