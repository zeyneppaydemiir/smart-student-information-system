import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Courses from "./pages/Courses";
import Forms from "./pages/Forms";
import Schedule from "./pages/Schedule";
import Transcript from "./pages/Transcript";
import Attendance from "./pages/Attendance";
import CourseSelection from "./pages/CourseSelection";
import Curriculum from "./pages/Curriculum";
import StudentAnnouncements from "./pages/StudentAnnouncements";
import CourseRecommendation from "./pages/CourseRecommendation";
import { getUser } from "./auth";

// Instructor pages
import InstructorLogin from "./pages/InstructorLogin";
import InstructorRegister from "./pages/InstructorRegister";
import InstructorDashboard from "./pages/InstructorDashboard";
import MyOfferings from "./pages/MyOfferings";
import OfferingDetail from "./pages/OfferingDetail";
import InstructorAnnouncements from "./pages/Announcements";
import { isInstructorLoggedIn } from "./instructorAuth";

function PrivateRoute({ children }) {
  return getUser() ? children : <Navigate to="/" replace />;
}

function InstructorRoute({ children }) {
  return isInstructorLoggedIn() ? children : <Navigate to="/instructor/login" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* ── Öğrenci (public) ── */}
        <Route path="/" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* ── Öğrenci (protected) ── */}
        <Route path="/dashboard"  element={<PrivateRoute><Dashboard /></PrivateRoute>} />
        <Route path="/courses"    element={<PrivateRoute><Courses /></PrivateRoute>} />
        <Route path="/forms"      element={<PrivateRoute><Forms /></PrivateRoute>} />
        <Route path="/schedule"   element={<PrivateRoute><Schedule /></PrivateRoute>} />
        <Route path="/transcript" element={<PrivateRoute><Transcript /></PrivateRoute>} />
        <Route path="/attendance"       element={<PrivateRoute><Attendance /></PrivateRoute>} />
        <Route path="/course-selection" element={<PrivateRoute><CourseSelection /></PrivateRoute>} />
        <Route path="/curriculum"       element={<PrivateRoute><Curriculum /></PrivateRoute>} />
        <Route path="/announcements"         element={<PrivateRoute><StudentAnnouncements /></PrivateRoute>} />
        <Route path="/course-recommendation" element={<PrivateRoute><CourseRecommendation /></PrivateRoute>} />

        {/* ── Öğretim Üyesi (public) ── */}
        <Route path="/instructor/login"    element={<InstructorLogin />} />
        <Route path="/instructor/register" element={<InstructorRegister />} />

        {/* ── Öğretim Üyesi (protected) ── */}
        <Route path="/instructor/dashboard" element={<InstructorRoute><InstructorDashboard /></InstructorRoute>} />
        <Route path="/instructor/offerings" element={<InstructorRoute><MyOfferings /></InstructorRoute>} />
        <Route path="/instructor/offerings/:id"    element={<InstructorRoute><OfferingDetail /></InstructorRoute>} />
        <Route path="/instructor/announcements"    element={<InstructorRoute><InstructorAnnouncements /></InstructorRoute>} />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
