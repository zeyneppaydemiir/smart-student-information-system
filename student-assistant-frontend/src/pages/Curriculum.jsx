import { useState, useEffect } from "react";
import api from "../api";
import { getUser } from "../auth";
import { useNavigate } from "react-router-dom";
import {
  LayoutDashboard, BookOpen, FileText, Calendar, GraduationCap,
  Activity, PlusCircle, Library, ChevronDown, ChevronRight,
  CheckCircle2, Circle, BookMarked, Megaphone, Sparkles,
} from "lucide-react";
import ChatWidget from "../components/ChatWidget";
import TopbarPanels from "../components/TopbarPanels";
import { useLanguage } from "../context/LanguageContext";

const SEM_ORDER = { Güz: 1, Bahar: 2 };

export default function Curriculum() {
  const navigate = useNavigate();
  const user = getUser();
  const { t, language } = useLanguage();

  const YEAR_LABELS = {
    1: t("curriculum.year1"),
    2: t("curriculum.year2"),
    3: t("curriculum.year3"),
    4: t("curriculum.year4"),
  };

  const [courses, setCourses] = useState([]);
  const [enrollments, setEnrollments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openGroups, setOpenGroups] = useState(new Set());
  const [filterYear, setFilterYear] = useState("all");
  const [filterSem, setFilterSem] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");

  const initials = user?.name
    ? user.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : "ST";

  useEffect(() => {
    const dept = user?.department;
    Promise.all([
      dept ? api.get(`/curriculum/${encodeURIComponent(dept)}`) : api.get("/curriculum"),
      api.get("/student/enrollments"),
    ])
      .then(([currRes, enrRes]) => {
        setCourses(currRes.data);
        setEnrollments(enrRes.data);
        const groups = new Set();
        currRes.data.forEach((c) => groups.add(`${c.year}-${c.semester}`));
        setOpenGroups(groups);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const enrolledCodes = new Set(
    enrollments.map((e) => e.code).filter(Boolean)
  );
  const completedCodes = new Set(
    enrollments
      .filter((e) => e.status === "completed" || (e.grade && e.grade !== "IP"))
      .map((e) => e.code)
      .filter(Boolean)
  );

  const grouped = {};
  courses.forEach((c) => {
    const key = `${c.year}-${c.semester}`;
    if (!grouped[key]) grouped[key] = { year: c.year, semester: c.semester, courses: [] };
    grouped[key].courses.push(c);
  });

  const sortedGroups = Object.values(grouped).sort((a, b) => {
    if (a.year !== b.year) return a.year - b.year;
    return (SEM_ORDER[a.semester] ?? 9) - (SEM_ORDER[b.semester] ?? 9);
  });

  const filteredGroups = sortedGroups
    .filter((g) => filterYear === "all" || g.year === parseInt(filterYear))
    .filter((g) => filterSem === "all" || g.semester === filterSem)
    .map((g) => ({
      ...g,
      courses: g.courses.filter((c) => {
        if (filterStatus === "enrolled") return enrolledCodes.has(c.courseCode);
        if (filterStatus === "completed") return completedCodes.has(c.courseCode);
        if (filterStatus === "not-enrolled") return !enrolledCodes.has(c.courseCode);
        return true;
      }),
    }))
    .filter((g) => g.courses.length > 0);

  const toggleGroup = (key) => {
    setOpenGroups((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const totalEnrolled = courses.filter((c) => enrolledCodes.has(c.courseCode)).length;
  const totalCompleted = courses.filter((c) => completedCodes.has(c.courseCode)).length;

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
            <li onClick={() => navigate("/courses")}><BookOpen size={16} /> {t("nav.courses")}</li>
            <li onClick={() => navigate("/course-selection")}><PlusCircle size={16} /> {t("nav.courseSelection")}</li>
            <li className="active"><Library size={16} /> {t("nav.curriculum")}</li>
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
            <h1>{t("curriculum.title")}</h1>
            <p>{user?.department ?? t("curriculum.courseCatalog")} — {courses.length} {t("curriculum.courses")}</p>
          </div>
          <div className="topbar-right">
            <TopbarPanels />
          </div>
        </div>

        <div className="content">
          {/* Summary strip */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 22 }}>
            {[
              { label: t("curriculum.totalCourses"), value: courses.length, color: "#4f7aff", bg: "#eff4ff" },
              { label: t("curriculum.enrolled"), value: totalEnrolled, color: "#16a34a", bg: "#f0fdf4" },
              { label: t("curriculum.completed"), value: totalCompleted, color: "#7c3aed", bg: "#f5f3ff" },
              { label: t("curriculum.remaining"), value: courses.length - totalEnrolled, color: "#d97706", bg: "#fffbeb" },
            ].map((s) => (
              <div key={s.label} style={{ background: s.bg, borderRadius: 12, padding: "16px 18px", display: "flex", alignItems: "center", gap: 14 }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: s.color, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <BookMarked size={18} color="#fff" />
                </div>
                <div>
                  <p style={{ fontSize: 20, fontWeight: 700, color: s.color }}>{s.value}</p>
                  <p style={{ fontSize: 12, color: "#7c8591" }}>{s.label}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Filters */}
          <div style={{ background: "#fff", border: "1px solid #eaecef", borderRadius: 12, padding: "14px 18px", marginBottom: 18, display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: "#7c8591" }}>{t("curriculum.filter")}</span>
            <select
              value={filterYear}
              onChange={(e) => setFilterYear(e.target.value)}
              style={{ fontSize: 12, padding: "6px 10px", borderRadius: 8, border: "1.5px solid #eaecef", background: "#f9fafb", color: "#1a1f2e", cursor: "pointer" }}
            >
              <option value="all">{t("curriculum.allYears")}</option>
              {[1, 2, 3, 4].map((y) => <option key={y} value={y}>{YEAR_LABELS[y]}</option>)}
            </select>
            <select
              value={filterSem}
              onChange={(e) => setFilterSem(e.target.value)}
              style={{ fontSize: 12, padding: "6px 10px", borderRadius: 8, border: "1.5px solid #eaecef", background: "#f9fafb", color: "#1a1f2e", cursor: "pointer" }}
            >
              <option value="all">{t("curriculum.bothSemesters")}</option>
              <option value="Güz">{t("curriculum.fall")}</option>
              <option value="Bahar">{t("curriculum.spring")}</option>
            </select>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              style={{ fontSize: 12, padding: "6px 10px", borderRadius: 8, border: "1.5px solid #eaecef", background: "#f9fafb", color: "#1a1f2e", cursor: "pointer" }}
            >
              <option value="all">{t("curriculum.allStatuses")}</option>
              <option value="enrolled">{t("curriculum.enrolled")}</option>
              <option value="completed">{t("curriculum.completed")}</option>
              <option value="not-enrolled">{t("curriculum.notEnrolled")}</option>
            </select>
          </div>

          {/* Course groups */}
          {loading ? (
            <div style={{ textAlign: "center", padding: 60, color: "#7c8591", fontSize: 14 }}>{t("curriculum.loading")}</div>
          ) : filteredGroups.length === 0 ? (
            <div style={{ textAlign: "center", padding: 60, color: "#7c8591", fontSize: 14 }}>{t("curriculum.noMatch")}</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {filteredGroups.map((g) => {
                const key = `${g.year}-${g.semester}`;
                const isOpen = openGroups.has(key);
                const semLabel = g.semester === "Güz" ? t("semester.fall") : t("semester.spring");
                const semHeaderLabel = g.semester === "Güz" ? t("curriculum.fallSemester") : t("curriculum.springSemester");
                const groupEnrolled = g.courses.filter((c) => enrolledCodes.has(c.courseCode)).length;
                return (
                  <div key={key} style={{ background: "#fff", border: "1px solid #eaecef", borderRadius: 14, overflow: "hidden" }}>
                    <div
                      onClick={() => toggleGroup(key)}
                      style={{
                        padding: "14px 18px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        cursor: "pointer",
                        background: isOpen ? "#f8faff" : "#fff",
                        borderBottom: isOpen ? "1px solid #eaecef" : "none",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <div style={{
                          width: 36, height: 36, borderRadius: 10,
                          background: g.semester === "Güz" ? "#eff4ff" : "#fff7ed",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          color: g.semester === "Güz" ? "#4f7aff" : "#ea580c",
                        }}>
                          <BookOpen size={16} />
                        </div>
                        <div>
                          <p style={{ fontSize: 14, fontWeight: 700, color: "#1a1f2e" }}>
                            {YEAR_LABELS[g.year]} — {semHeaderLabel}
                          </p>
                          <p style={{ fontSize: 12, color: "#7c8591" }}>
                            {g.courses.length} {t("curriculum.courses")} · {groupEnrolled} {t("curriculum.coursesEnrolled")}
                          </p>
                        </div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span style={{
                          fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 20,
                          background: g.semester === "Güz" ? "#eff4ff" : "#fff7ed",
                          color: g.semester === "Güz" ? "#4f7aff" : "#ea580c",
                        }}>
                          {semLabel}
                        </span>
                        {isOpen ? <ChevronDown size={16} color="#7c8591" /> : <ChevronRight size={16} color="#7c8591" />}
                      </div>
                    </div>

                    {isOpen && (
                      <div style={{ padding: "14px 16px", display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12 }}>
                        {g.courses.map((c) => {
                          const isEnrolled = enrolledCodes.has(c.courseCode);
                          const isCompleted = completedCodes.has(c.courseCode);
                          return (
                            <div
                              key={c.id}
                              style={{
                                border: isCompleted ? "1.5px solid #bbf7d0" : isEnrolled ? "1.5px solid #c7d9ff" : "1.5px solid #eaecef",
                                borderRadius: 10,
                                padding: "14px 15px",
                                background: isCompleted ? "#f0fdf4" : isEnrolled ? "#f5f8ff" : "#fafafa",
                                position: "relative",
                              }}
                            >
                              {(isEnrolled || isCompleted) && (
                                <div style={{
                                  position: "absolute", top: 10, right: 10,
                                  display: "flex", alignItems: "center", gap: 4,
                                  fontSize: 10, fontWeight: 700,
                                  color: isCompleted ? "#16a34a" : "#4f7aff",
                                  background: isCompleted ? "#dcfce7" : "#dbeafe",
                                  padding: "2px 8px", borderRadius: 20,
                                }}>
                                  {isCompleted ? <CheckCircle2 size={11} /> : <Circle size={11} />}
                                  {isCompleted ? t("curriculum.completed") : t("curriculum.enrolled")}
                                </div>
                              )}

                              <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 8 }}>
                                <div style={{
                                  width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                                  background: c.type === "Z" ? "#1a1f2e" : "#4f7aff",
                                  display: "flex", alignItems: "center", justifyContent: "center",
                                  color: "#fff", fontSize: 11, fontWeight: 700,
                                }}>
                                  {c.type}
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <p style={{ fontSize: 11, fontWeight: 700, color: "#4f7aff", marginBottom: 2 }}>
                                    {c.courseCode}
                                  </p>
                                  <p style={{ fontSize: 13, fontWeight: 600, color: "#1a1f2e", lineHeight: 1.35 }}>
                                    {language === "en" ? (c.courseNameEn || c.courseName) : c.courseName}
                                  </p>
                                </div>
                              </div>

                              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                                <span style={{ fontSize: 11, background: "#f1f5f9", color: "#475569", padding: "2px 8px", borderRadius: 12 }}>
                                  {c.credits} {t("curriculum.credits")}
                                </span>
                                <span style={{ fontSize: 11, background: "#f1f5f9", color: "#475569", padding: "2px 8px", borderRadius: 12 }}>
                                  {c.ects} {t("curriculum.ects")}
                                </span>
                                <span style={{
                                  fontSize: 11, padding: "2px 8px", borderRadius: 12,
                                  background: c.type === "Z" ? "#fef2f2" : "#f5f3ff",
                                  color: c.type === "Z" ? "#dc2626" : "#7c3aed",
                                }}>
                                  {c.type === "Z" ? t("curriculum.required") : t("curriculum.elective")}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
      <ChatWidget />
    </div>
  );
}
