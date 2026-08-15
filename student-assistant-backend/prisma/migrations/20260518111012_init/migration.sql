-- CreateTable
CREATE TABLE "User" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "studentNumber" TEXT NOT NULL,
    "program" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "year" INTEGER NOT NULL DEFAULT 1,
    "totalYears" INTEGER NOT NULL DEFAULT 4,
    "advisor" TEXT,
    "gpa" REAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Course" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "courseCode" TEXT NOT NULL,
    "courseName" TEXT NOT NULL,
    "department" TEXT,
    "instructor" TEXT,
    "instructorInitials" TEXT,
    "schedule" TEXT,
    "room" TEXT,
    "credits" INTEGER NOT NULL,
    "grade" TEXT,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'active',
    "semester" TEXT NOT NULL,
    "color" TEXT,
    "days" TEXT,
    "startHour" INTEGER,
    "startMin" INTEGER,
    "endHour" INTEGER,
    "endMin" INTEGER,
    CONSTRAINT "Course_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Attendance" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "courseId" INTEGER NOT NULL,
    "courseCode" TEXT NOT NULL,
    "courseName" TEXT,
    "instructor" TEXT,
    "totalWeeks" INTEGER NOT NULL DEFAULT 0,
    "attended" INTEGER NOT NULL DEFAULT 0,
    "absent" INTEGER NOT NULL DEFAULT 0,
    "late" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "Attendance_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Attendance_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AttendanceRecord" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "attendanceId" INTEGER NOT NULL,
    "courseCode" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    CONSTRAINT "AttendanceRecord_attendanceId_fkey" FOREIGN KEY ("attendanceId") REFERENCES "Attendance" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Transcript" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "semester" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "gpa" REAL,
    "creditsEarned" INTEGER NOT NULL,
    "color" TEXT,
    CONSTRAINT "Transcript_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TranscriptCourse" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "transcriptId" INTEGER NOT NULL,
    "courseCode" TEXT NOT NULL,
    "courseName" TEXT NOT NULL,
    "credits" INTEGER NOT NULL,
    "grade" TEXT NOT NULL,
    CONSTRAINT "TranscriptCourse_transcriptId_fkey" FOREIGN KEY ("transcriptId") REFERENCES "Transcript" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Form" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "iconColor" TEXT,
    "status" TEXT NOT NULL DEFAULT 'open',
    "deadline" TEXT,
    "urgent" BOOLEAN NOT NULL DEFAULT false,
    "fields" TEXT,
    "info" TEXT
);

-- CreateTable
CREATE TABLE "Submission" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "formId" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "data" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Submission_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Submission_formId_fkey" FOREIGN KEY ("formId") REFERENCES "Form" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_studentNumber_key" ON "User"("studentNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Attendance_courseId_key" ON "Attendance"("courseId");
