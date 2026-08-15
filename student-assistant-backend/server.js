// Ana sunucu dosyasi
// Student Information System - backend
// Odev projesi

require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");

// Route'lari import et
const authRoutes = require("./routes/auth");
const coursesRoutes = require("./routes/courses");
const formsRoutes = require("./routes/forms");
const scheduleRoutes = require("./routes/schedule");
const transcriptRoutes = require("./routes/transcript");
const attendanceRoutes = require("./routes/attendance");
const chatRoutes = require("./routes/chat");
const curriculumRoutes = require("./routes/curriculum");

// Yeni öğrenci + offering route'ları
const offeringsRoutes = require("./routes/offerings");
const studentRoutes   = require("./routes/student");

// Instructor routes
const instructorAuthRoutes     = require("./routes/instructor-auth");
const instructorCoursesRoutes  = require("./routes/instructor-courses");
const instructorStudentsRoutes = require("./routes/instructor-students");
const instructorGradesRoutes   = require("./routes/instructor-grades");
const instructorAttendanceRoutes = require("./routes/instructor-attendance");
const instructorChatRoutes     = require("./routes/instructor-chat");

// Announcement routes
const { instructorRouter: instructorAnnouncementRoutes, studentRouter: studentAnnouncementRoutes } = require("./routes/announcements");

// Upload route
const uploadRoutes = require("./routes/upload");

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware'ler
app.use(cors({ origin: "http://localhost:5173", credentials: true }));
app.use(express.json());

// Serve uploaded profile pictures as static files
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Logger - hangi endpoint'e istek geldigini gormek icin
app.use((req, res, next) => {
  console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.url}`);
  next();
});

// Ana sayfa - sunucu calisiyor mu kontrolu
app.get("/", (req, res) => {
  res.json({
    message: "SIS Backend calisiyor!",
    endpoints: [
      "POST /api/auth/login",
      "POST /api/auth/logout",
      "GET  /api/auth/me",
      "POST /api/auth/register",
      "GET  /api/courses",
      "GET  /api/courses/summary",
      "GET  /api/courses/:id",
      "GET  /api/forms",
      "GET  /api/forms/submissions/all",
      "POST /api/forms/:id/submit",
      "GET  /api/schedule",
      "GET  /api/schedule/today",
      "GET  /api/transcript",
      "GET  /api/transcript/summary",
      "GET  /api/transcript/:id",
      "GET  /api/attendance",
      "GET  /api/attendance/summary",
      "POST /api/chat",
      "GET  /api/curriculum",
      "GET  /api/curriculum/departments",
      "GET  /api/curriculum/:department",
      "GET  /api/curriculum/:department/year/:year/semester/:semester",
    ],
  });
});

// API route'larini bagla
app.use("/api/auth", authRoutes);
app.use("/api/courses", coursesRoutes);
app.use("/api/forms", formsRoutes);
app.use("/api/schedule", scheduleRoutes);
app.use("/api/transcript", transcriptRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/curriculum", curriculumRoutes);

// Öğrenci ders seçim sistemi
app.use("/api/offerings", offeringsRoutes);
app.use("/api/student",   studentRoutes);

// Instructor — tümü /api/instructor altında
app.use("/api/instructor", instructorAuthRoutes);
app.use("/api/instructor", instructorCoursesRoutes);
app.use("/api/instructor", instructorStudentsRoutes);
app.use("/api/instructor", instructorGradesRoutes);
app.use("/api/instructor", instructorAttendanceRoutes);
app.use("/api/instructor", instructorChatRoutes);

// Announcement routes
app.use("/api/instructor", instructorAnnouncementRoutes);
app.use("/api/announcements", studentAnnouncementRoutes);

// Upload routes
app.use("/api/upload", uploadRoutes);

// Bulunamayan endpoint'ler
app.use((req, res) => {
  res.status(404).json({ message: "Endpoint bulunamadi: " + req.url });
});

// Hata yakalayici
app.use((err, req, res, next) => {
  console.log("HATA:", err.message);
  res.status(500).json({ message: "Sunucu hatasi olustu" });
});

// Sunucuyu baslat
app.listen(PORT, () => {
  console.log("====================================");
  console.log("  SIS Backend basladi!");
  console.log("  http://localhost:" + PORT);
  console.log("====================================");
  console.log("Test kullanicisi:");
  console.log("  Email: test@test.com");
  console.log("  Sifre: 123456");
  console.log("====================================");
});
