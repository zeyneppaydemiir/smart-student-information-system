import { useState, useEffect } from "react";
import api from "../api";
import { logout, getUser } from "../auth";
import { useNavigate } from "react-router-dom";
import {
  LayoutDashboard, BookOpen, FileText,
  Calendar, GraduationCap, User,
  Search, Clock, MapPin, Users, TrendingUp,
  CheckCircle, Activity, PlusCircle, Library, Megaphone, Sparkles,
} from "lucide-react";
import "../styles/Courses.css";
import ChatWidget from "../components/ChatWidget";
import TopbarPanels from "../components/TopbarPanels";
import { useLanguage } from "../context/LanguageContext";

const GRADE_CLASS = {
  AA: "grade-aa", BA: "grade-ba", BB: "grade-bb",
  CB: "grade-cb", CC: "grade-cb", DC: "grade-ip",
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

const STATUS_CHIP = {
  active: "chip-active", pending: "chip-pending",
  done: "chip-done", completed: "chip-done", graded: "chip-active",
};

export default function Courses() {
  const navigate = useNavigate();
  const user = getUser();
  const { t, language } = useLanguage();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [allCourses, setAllCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api.get("/student/my-courses")
      .then((res) => setAllCourses(res.data))
      .catch(() => setError(t("common.error")))
      .finally(() => setLoading(false));
  }, []);

  const initials = user?.name
    ? user.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : "ST";

  const handleLogout = () => { logout(); navigate("/"); };

  const filtered = allCourses.filter((c) => {
    const displayName = language === "en" ? (c.nameEn || c.name) : c.name;
    const matchSearch =
      displayName.toLowerCase().includes(search.toLowerCase()) ||
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.code.toLowerCase().includes(search.toLowerCase()) ||
      (c.instructor ?? "").toLowerCase().includes(search.toLowerCase());
    const normalizedStatus = c.status === "done" ? "completed" : c.status === "graded" ? "active" : c.status;
    const matchFilter = filter === "all" || normalizedStatus === filter;
    return matchSearch && matchFilter;
  });

  const totalCredits    = allCourses.reduce((s, c) => s + c.credits, 0);
  const activeCourses   = allCourses.filter((c) => c.status === "active" || c.status === "graded").length;
  const completedCourses = allCourses.filter((c) => c.status === "completed" || c.status === "done").length;
  const avgProgress     = allCourses.length
    ? Math.round(allCourses.reduce((s, c) => s + (c.progress ?? (c.status === "completed" ? 100 : 0)), 0) / allCourses.length)
    : 0;

  const STATUS_LABEL = {
    active: t("courses.active"),
    graded: t("courses.active"),
    pending: t("dashboard.status.inProgress"),
    done: t("courses.completed"),
    completed: t("courses.completed"),
  };

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
            <li onClick={() => navigate("/dashboard")}><LayoutDashboard size={16} /> {t("nav.dashboard")}</li>
            <li className="active"><BookOpen size={16} /> {t("nav.courses")}</li>
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
            <h1>{t("courses.title")}</h1>
            <p>{t("semester.springFull")}</p>
          </div>
          <div className="topbar-right">
            <TopbarPanels />
          </div>
        </div>

        <div className="content">
          {/* Summary strip */}
          <div className="summary-strip">
            <div className="summary-card blue">
              <div className="summary-card-icon"><BookOpen size={16} /></div>
              <div className="summary-card-body">
                <p className="summary-card-value">{allCourses.length}</p>
                <p className="summary-card-label">{t("courses.totalCourses")}</p>
              </div>
            </div>
            <div className="summary-card green">
              <div className="summary-card-icon"><CheckCircle size={16} /></div>
              <div className="summary-card-body">
                <p className="summary-card-value">{activeCourses}</p>
                <p className="summary-card-label">{t("courses.activeCourses")}</p>
              </div>
            </div>
            <div className="summary-card sky">
              <div className="summary-card-icon"><Clock size={16} /></div>
              <div className="summary-card-body">
                <p className="summary-card-value">{totalCredits}</p>
                <p className="summary-card-label">{t("courses.totalCredits")}</p>
              </div>
            </div>
            <div className="summary-card slate">
              <div className="summary-card-icon"><TrendingUp size={16} /></div>
              <div className="summary-card-body">
                <p className="summary-card-value">{avgProgress}%</p>
                <p className="summary-card-label">{t("courses.avgCompletion")}</p>
              </div>
            </div>
          </div>

          {/* Toolbar */}
          <div className="courses-toolbar">
            <div className="courses-toolbar-left">
              <div className="search-wrapper">
                <Search size={15} className="search-icon" />
                <input
                  className="search-input"
                  type="text"
                  placeholder={t("courses.searchPlaceholder")}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              <select
                className="filter-select"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
              >
                <option value="all">{t("courses.allStatuses")}</option>
                <option value="active">{t("courses.active")}</option>
                <option value="pending">{t("dashboard.status.inProgress")}</option>
                <option value="completed">{t("courses.completed")}</option>
              </select>
            </div>
          </div>

          {/* Course cards */}
          <div className="courses-grid">
            {loading ? (
              <p style={{ color: "#7c8591", fontSize: 14, padding: 8 }}>{t("common.loading")}</p>
            ) : error ? (
              <p style={{ color: "#e24b4a", fontSize: 14, padding: 8 }}>{error}</p>
            ) : filtered.length === 0 ? (
              <div className="empty-state">
                <Search size={40} />
                <p>{allCourses.length === 0 ? t("courses.noCourses") : t("courses.noMatch")}</p>
              </div>
            ) : (
              filtered.map((c) => (
                <div className="course-card" key={c.id}>
                  <div className={`course-card-top ${c.color}`} />
                  <div className="course-card-body">
                    <div className="course-card-header">
                      <span className="course-code-badge">{c.code}</span>
                      {c.grade && (
                        <span
                          className={`course-grade-badge ${GRADE_CLASS[c.grade] ?? ""}`}
                          style={GRADE_COLOR[c.grade] ? {
                            background: GRADE_COLOR[c.grade].bg,
                            color: GRADE_COLOR[c.grade].color,
                            fontWeight: 700,
                          } : {}}
                        >
                          {c.grade}
                        </span>
                      )}
                    </div>
                    <p className="course-card-name">{language === "en" ? (c.nameEn || c.name) : c.name}</p>
                    <p className="course-card-dept">{c.department}</p>
                    <div className="course-card-meta">
                      <div className="course-meta-row"><User size={13} />{c.instructor}</div>
                      <div className="course-meta-row"><Clock size={13} />{c.schedule}</div>
                      <div className="course-meta-row"><MapPin size={13} />{t("common.room")} {c.room}</div>
                      <div className="course-meta-row"><Users size={13} />{c.credits} {t("common.credits")}</div>
                    </div>
                  </div>
                  <div className="course-card-footer">
                    <div className="progress-wrap">
                      <div className="progress-label">
                        <span>{t("courses.progress")}</span>
                        <span>{c.progress}%</span>
                      </div>
                      <div className="progress-bar">
                        <div className={`progress-fill ${c.color}`} style={{ width: `${c.progress}%` }} />
                      </div>
                    </div>
                    <span className={`status-chip ${STATUS_CHIP[c.status] ?? "chip-done"}`}>
                      {STATUS_LABEL[c.status] ?? t("courses.completed")}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
      <ChatWidget />
    </div>
  );
}
