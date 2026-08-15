import { useState, useEffect } from "react";
import { logout, getUser } from "../auth";
import { useNavigate } from "react-router-dom";
import {
  LayoutDashboard, BookOpen, FileText,
  Calendar, GraduationCap, TrendingUp, Clock, Activity, PlusCircle, Library,
  Sparkles, Megaphone,
} from "lucide-react";
import "../styles/Dashboard.css";
import ChatWidget from "../components/ChatWidget";
import TopbarPanels from "../components/TopbarPanels";
import { useLanguage } from "../context/LanguageContext";
import api from "../api";

const GRADE_CLASS = {
  AA: "grade-aa", BA: "grade-ba", BB: "grade-bb",
  CB: "grade-cb", CC: "grade-cc", DC: "grade-ip",
  DD: "grade-ip", FD: "grade-ip", FF: "grade-ip", IP: "grade-ip",
};

const GRADE_COLOR = {
  AA: { bg: "#f0fdf4", color: "#16a34a" },
  BA: { bg: "#f0fdf4", color: "#16a34a" },
  BB: { bg: "#fefce8", color: "#ca8a04" },
  CB: { bg: "#fefce8", color: "#ca8a04" },
  CC: { bg: "#fefce8", color: "#ca8a04" },
  DC: { bg: "#fff7ed", color: "#ea580c" },
  DD: { bg: "#fef2f2", color: "#dc2626" },
  FD: { bg: "#fef2f2", color: "#dc2626" },
  FF: { bg: "#fef2f2", color: "#dc2626" },
};

export default function Dashboard() {
  const navigate = useNavigate();
  const user = getUser();
  const { t, language } = useLanguage();

  const [courses, setCourses]         = useState([]);
  const [summary, setSummary]         = useState(null);
  const [trSummary, setTrSummary]     = useState(null);
  const [enrollStats, setEnrollStats] = useState({ count: 0, credits: 0 });
  const [loading, setLoading]         = useState(true);

  useEffect(() => {
    Promise.all([
      api.get("/student/my-courses"),
      api.get("/courses/summary"),
      api.get("/transcript/summary"),
      api.get("/student/enrollments?status=active"),
    ])
      .then(([cRes, sRes, tRes, enrRes]) => {
        setCourses(cRes.data);
        setSummary(sRes.data);
        setTrSummary(tRes.data);
        const activeEnrollments = enrRes.data;
        setEnrollStats({
          count:   activeEnrollments.length,
          credits: activeEnrollments.reduce((s, e) => s + (e.credits || 0), 0),
        });
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const initials = user?.name
    ? user.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : "ST";

  const handleLogout = () => { logout(); navigate("/"); };

  return (
    <div className="layout">
      {/* ── SIDEBAR ── */}
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="sidebar-brand-icon">
            <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 3L1 9l11 6 9-4.91V17h2V9L12 3zM5 13.18v4L12 21l7-3.82v-4L12 17l-7-3.82z" />
            </svg>
          </div>
          <span className="sidebar-brand-name">SIS</span>
        </div>

        <div className="sidebar-section">
          <p className="sidebar-section-label">{t("nav.mainMenu")}</p>
          <ul className="sidebar-nav">
            <li className="active"><LayoutDashboard size={16} /> {t("nav.dashboard")}</li>
            <li onClick={() => navigate("/courses")}><BookOpen size={16} /> {t("nav.courses")}</li>
            <li onClick={() => navigate("/course-selection")}><PlusCircle size={16} /> {t("nav.courseSelection")}</li>
            <li onClick={() => navigate("/curriculum")}><Library size={16} /> {t("nav.curriculum")}</li>
            <li onClick={() => navigate("/forms")}><FileText size={16} /> {t("nav.forms")}</li>
            <li onClick={() => navigate("/schedule")}><Calendar size={16} /> {t("nav.schedule")}</li>
            <li onClick={() => navigate("/transcript")}><GraduationCap size={16} /> {t("nav.transcript")}</li>
            <li onClick={() => navigate("/attendance")}><Activity size={16} /> {t("nav.attendance")}</li>
            <li onClick={() => navigate("/announcements")}><Megaphone size={16} /> {t("nav.announcements")}</li>
            <li onClick={() => navigate("/course-recommendation")}><Sparkles size={16} /> {t("nav.courseRecommendation")}</li>
          </ul>
        </div>

        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="sidebar-avatar">{initials}</div>
            <div className="sidebar-user-info">
              <p className="sidebar-user-name">{user?.name ?? "Student"}</p>
              <p className="sidebar-user-role">{t("sidebar.undergraduate")}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* ── MAIN ── */}
      <div className="main">
        <div className="topbar">
          <div className="topbar-left">
            <h1>{t("dashboard.title")}</h1>
            <p>{t("semester.springFull")}</p>
          </div>
          <div className="topbar-right">
            <TopbarPanels />
          </div>
        </div>

        <div className="content">
          {/* Stat cards */}
          <div className="cards">
            <div className="stat-card blue">
              <div className="stat-card-icon"><Calendar size={18} /></div>
              <p className="stat-card-label">{t("dashboard.academicTerm")}</p>
              <p className="stat-card-value">{t("dashboard.springTerm")}</p>
              <p className="stat-card-sub">{t("dashboard.endsJune")}</p>
            </div>

            <div className="stat-card green">
              <div className="stat-card-icon"><BookOpen size={18} /></div>
              <p className="stat-card-label">{t("dashboard.enrolledCourses")}</p>
              <p className="stat-card-value">{enrollStats.count}</p>
              <p className="stat-card-sub">{enrollStats.credits} {t("dashboard.credits")}</p>
            </div>

            <div className="stat-card sky">
              <div className="stat-card-icon"><GraduationCap size={18} /></div>
              <p className="stat-card-label">{t("dashboard.program")}</p>
              <p className="stat-card-value">{language === "en" ? "B.Sc. Computer Engineering" : (user?.program ?? "—")}</p>
              <p className="stat-card-sub">
                {t("dashboard.yearOf").replace("{year}", user?.year ?? "—").replace("{total}", user?.totalYears ?? "—")}
              </p>
            </div>

            <div className="stat-card slate">
              <div className="stat-card-icon"><TrendingUp size={18} /></div>
              <p className="stat-card-label">{t("dashboard.cumulativeGpa")}</p>
              <p className="stat-card-value">{trSummary ? trSummary.cumulativeGpa.toFixed(2) : "—"}</p>
              <p className="stat-card-sub">{t("dashboard.outOf")}</p>
            </div>
          </div>

          {/* Course Selection quick-access card */}
          <div
            onClick={() => navigate("/course-selection")}
            style={{
              background: "linear-gradient(135deg, #4f7aff 0%, #3b63e0 100%)",
              borderRadius: 12, padding: "16px 20px", marginBottom: 4,
              display: "flex", alignItems: "center", justifyContent: "space-between",
              cursor: "pointer", transition: "opacity 0.15s",
            }}
            onMouseEnter={(e) => e.currentTarget.style.opacity = "0.92"}
            onMouseLeave={(e) => e.currentTarget.style.opacity = "1"}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{
                width: 40, height: 40, background: "rgba(255,255,255,0.2)",
                borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <PlusCircle size={20} color="white" />
              </div>
              <div>
                <p style={{ fontSize: 15, fontWeight: 600, color: "white" }}>{t("dashboard.courseSelectionTitle")}</p>
                <p style={{ fontSize: 12, color: "rgba(255,255,255,0.75)", marginTop: 2 }}>
                  {t("dashboard.courseSelectionDesc")}
                </p>
              </div>
            </div>
            <div style={{ color: "rgba(255,255,255,0.6)", fontSize: 20 }}>›</div>
          </div>

          {/* Course Recommendation quick-access card */}
          <div
            onClick={() => navigate("/course-recommendation")}
            style={{
              background: "linear-gradient(135deg, #1a1f2e 0%, #2d3450 100%)",
              borderRadius: 12, padding: "16px 20px", marginBottom: 20,
              display: "flex", alignItems: "center", justifyContent: "space-between",
              cursor: "pointer", transition: "opacity 0.15s",
            }}
            onMouseEnter={(e) => e.currentTarget.style.opacity = "0.88"}
            onMouseLeave={(e) => e.currentTarget.style.opacity = "1"}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{
                width: 40, height: 40, background: "rgba(79,122,255,0.25)",
                borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <Sparkles size={20} color="#4f7aff" />
              </div>
              <div>
                <p style={{ fontSize: 15, fontWeight: 600, color: "white" }}>{t("courseRec.dashboardTitle")}</p>
                <p style={{ fontSize: 12, color: "rgba(255,255,255,0.6)", marginTop: 2 }}>
                  {t("courseRec.dashboardDesc")}
                </p>
              </div>
            </div>
            <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 20 }}>›</div>
          </div>

          {/* Courses table */}
          <div className="table-section">
            <div className="table-header">
              <div>
                <h3>{t("dashboard.enrolledCoursesTable")}</h3>
                <p>{t("dashboard.currentSemester")} — {loading ? "…" : `${courses.length} courses`}</p>
              </div>
              <span className="table-badge">
                <Clock size={11} style={{ display: "inline", marginRight: 4, verticalAlign: "middle" }} />
                {summary ? `${summary.totalCredits} ${t("dashboard.totalCredits")}` : "—"}
              </span>
            </div>

            {loading ? (
              <p style={{ padding: "24px", color: "#7c8591", fontSize: 14 }}>{t("common.loading")}</p>
            ) : courses.length === 0 ? (
              <p style={{ padding: "24px", color: "#7c8591", fontSize: 14 }}>{t("dashboard.noCourses")}</p>
            ) : (
              <table className="courses-table">
                <thead>
                  <tr>
                    <th>{t("dashboard.col.course")}</th>
                    <th>{t("dashboard.col.instructor")}</th>
                    <th>{t("dashboard.col.credits")}</th>
                    <th>{t("dashboard.col.grade")}</th>
                    <th>{t("dashboard.col.status")}</th>
                  </tr>
                </thead>
                <tbody>
                  {courses.map((c) => (
                    <tr key={c.code}>
                      <td>
                        <p className="course-name">{language === "en" ? (c.nameEn || c.name) : c.name}</p>
                        <p className="course-code">{c.code}</p>
                      </td>
                      <td>
                        <div className="instructor-cell">
                          <div className="instructor-avatar">
                            {c.instructorInitials ?? (c.instructor?.split(" ").map((n) => n[0]).join("").slice(0, 2) ?? "?")}
                          </div>
                          {c.instructor}
                        </div>
                      </td>
                      <td>{c.credits}</td>
                      <td>
                        {c.grade ? (
                          <span
                            className={`grade-badge ${GRADE_CLASS[c.grade] ?? ""}`}
                            style={GRADE_COLOR[c.grade] ? {
                              background: GRADE_COLOR[c.grade].bg,
                              color: GRADE_COLOR[c.grade].color,
                              fontWeight: 700,
                            } : {}}
                          >
                            {c.grade}
                          </span>
                        ) : <span style={{ color: "#b0b8c1", fontSize: 12 }}>—</span>}
                      </td>
                      <td>
                        <span className={`status-badge ${
                          c.status === "active" || c.status === "graded" ? "status-active"
                          : c.status === "completed" || c.status === "done" ? "status-done"
                          : "status-pending"
                        }`}>
                          {c.status === "active" || c.status === "graded" ? t("dashboard.status.active")
                           : c.status === "completed" || c.status === "done" ? t("courses.completed")
                           : t("dashboard.status.inProgress")}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
      <ChatWidget />
    </div>
  );
}
