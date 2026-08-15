# 🎓 Smart Student Information System Assistant

A web-based **Student Information System (SIS)** designed to manage academic processes for students and instructors, with an integrated **AI Assistant** to provide intelligent support and simplify access to academic information.

## 🚀 Features

### 👨‍🎓 Student

* Authentication & Registration
* Personal Dashboard
* Course Management
* Course Registration
* Course Recommendations
* Weekly Schedule
* Attendance Tracking
* Transcript Management
* Academic Forms & Submissions
* Announcements
* AI Assistant

### 👨‍🏫 Instructor

* Instructor Authentication
* Instructor Dashboard
* Course Management
* Student Management
* Grade Management
* Attendance Management
* Course & Curriculum Management
* Announcements
* AI Assistant

## 🛠️ Tech Stack

### Frontend

* React
* Vite
* Tailwind CSS
* JavaScript
* CSS

### Backend

* Node.js
* Express.js
* Prisma ORM
* REST API
* JWT Authentication

### Database

* MySQL

### Development Tools

* Git & GitHub
* VS Code
* Docker

## 🏗️ Project Structure

```text
smart-student-information-system/
│
├── student-assistant-backend/
│   ├── middleware/
│   ├── routes/
│   ├── prisma/
│   ├── scripts/
│   ├── server.js
│   └── package.json
│
├── student-assistant-frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── context/
│   │   ├── pages/
│   │   └── styles/
│   ├── public/
│   └── package.json
│
└── README.md
```

## ⚙️ Installation

### 1. Clone the repository

```bash
git clone https://github.com/zeyneppaydemiir/smart-student-information-system.git
cd smart-student-information-system
```

### 2. Backend

```bash
cd student-assistant-backend
npm install
```

Configure your environment variables using `.env.example`.

Then run the backend:

```bash
npm start
```

### 3. Frontend

Open a new terminal:

```bash
cd student-assistant-frontend
npm install
npm run dev
```

The application will then be available through the local development server.

## 🔐 Authentication

The system uses **JWT-based authentication** to secure student and instructor accounts and protect authorized routes.

## 📊 System Architecture

The application follows a client-server architecture:

```text
React Frontend
      │
      ▼
REST API
      │
      ▼
Node.js + Express.js
      │
      ▼
Prisma ORM
      │
      ▼
MySQL Database
```
## 📄 Project Documentation

The complete graduation project report is available below:

[📘 Graduation Project Report](docs/Graduation_Project_Report.pdf)

## 🎯 Project Goals

The main goals of this project are to:

* Centralize student and instructor academic operations
* Simplify course, attendance and grade management
* Provide a user-friendly academic dashboard
* Improve accessibility to academic information
* Integrate an AI-powered assistant into the student information system
* Demonstrate modern full-stack software engineering practices

## 👩‍💻 Developer

**Zeynep Aydemir**
Software Engineering

Interested in **Software Engineering, Data Analytics, Artificial Intelligence and Full-Stack Development**.

---

⭐ If you find this project interesting, feel free to explore the repository.
