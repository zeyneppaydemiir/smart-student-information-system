import { useState, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  LayoutDashboard, BookOpen, FileText, Calendar,
  GraduationCap, Activity, BookMarked,
  Clock, MapPin, User, CheckCircle, PlusCircle, Library, Megaphone, Sparkles,
} from "lucide-react";
import api from "../api";
import { getUser, logout } from "../auth";
import "../styles/CourseSelection.css";
import TopbarPanels from "../components/TopbarPanels";
import ChatWidget from "../components/ChatWidget";
import { useLanguage } from "../context/LanguageContext";

export default function CourseSelection() {
  const navigate = useNavigate();
  const location = useLocation();
  const user     = getUser();
  const { t, language } = useLanguage();

  const [curriculum, setCurriculum] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [busyId, setBusyId]         = useState(null);
  const [toast, setToast]           = useState(null);

  const [yearFilter, setYearFilter]     = useState("all");
  const [semFilter, setSemFilter]       = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const fromRegister = location.state?.fromRegister;

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchProgress = useCallback(() => {
    setLoading(true);
    api.get("/student/curriculum-progress")
      .then((res) => setCurriculum(res.data))
      .catch(() => showToast(t("common.error"), "error"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchProgress(); }, [fetchProgress]);

  const handleEnroll = async (offeringId) => {
    setBusyId(offeringId);
    try {
      await api.post("/student/enrollments", { offeringId });
      showToast(t("courseSelection.requested"));
      fetchProgress();
    } catch (err) {
      const msg = err.response?.data?.message || t("common.error");
      showToast(msg, "error");
    } finally {
      setBusyId(null);
    }
  };

  const handleCancelRequest = async (enrollmentId) => {
    if (!window.confirm(t("courseSelection.cancelConfirm"))) return;
    setBusyId(enrollmentId);
    try {
      await api.delete(`/student/enrollment-requests/${enrollmentId}`);
      showToast(t("courseSelection.requestCancelled"));
      fetchProgress();
    } catch (err) {
      const msg = err.response?.data?.message || t("common.error");
      showToast(msg, "error");
    } finally {
      setBusyId(null);
    }
  };

  const handleDrop = async (enrollmentId) => {
    if (!window.confirm(t("courseSelection.confirmDrop"))) return;
    setBusyId(enrollmentId);
    try {
      await api.delete(`/student/enrollments/${enrollmentId}`);
      showToast(t("courseSelection.drop"));
      fetchProgress();
    } catch (err) {
      const msg = err.response?.data?.message || t("common.error");
      showToast(msg, "error");
    } finally {
      setBusyId(null);
    }
  };

  const initials = user?.name
    ? user.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : "ST";

  const filtered = curriculum.filter((c) => {
    if (yearFilter !== "all"   && String(c.year) !== yearFilter) return false;
    if (semFilter  !== "all"   && c.semester      !== semFilter)  return false;
    if (statusFilter !== "all" && c.status        !== statusFilter) return false;
    return true;
  });

  const activeCount    = curriculum.filter((c) => c.status === "active").length;
  const completedCount = curriculum.filter((c) => c.status === "completed").length;
  const totalCredits   = curriculum
    .filter((c) => c.status === "active")
    .reduce((s, c) => s + c.credits, 0);

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
            <li className="active"><PlusCircle size={16} /> {t("nav.courseSelection")}</li>
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
            <h1>{t("courseSelection.title")}</h1>
            <p>{user?.department ?? t("courseSelection.allCourses")} — {t("courseSelection.allCourses")}</p>
          </div>
          <div className="topbar-right">
            <TopbarPanels />
          </div>
        </div>

        <div className="content">
          {/* Banner */}
          <div className="cs-banner">
            <div className="cs-banner-icon">
              <BookMarked size={18} color="white" />
            </div>
            <div>
              <p className="cs-banner-title">
                {fromRegister
                  ? t("courseSelection.bannerRegistered")
                  : t("courseSelection.bannerInfo")}
              </p>
              <p className="cs-banner-sub">
                {activeCount} {t("courseSelection.activeCourses")} · {totalCredits} {t("courseSelection.credits")} · {completedCount} {t("courseSelection.completedCount")}
              </p>
            </div>
          </div>

          {/* Toolbar */}
          <div className="cs-toolbar">
            {["all", "1", "2", "3", "4"].map((y) => (
              <button
                key={y}
                className={`cs-filter-btn ${yearFilter === y ? "active" : ""}`}
                onClick={() => setYearFilter(y)}
              >
                {y === "all" ? t("courseSelection.allYears") : t("courseSelection.yearN").replace("{n}", y)}
              </button>
            ))}

            <div className="cs-toolbar-sep" />

            {[
              { v: "all",   l: t("courseSelection.allSemesters") },
              { v: "Güz",   l: t("courseSelection.fall") },
              { v: "Bahar", l: t("courseSelection.spring") },
            ].map(({ v, l }) => (
              <button
                key={v}
                className={`cs-filter-btn ${semFilter === v ? "active" : ""}`}
                onClick={() => setSemFilter(v)}
              >
                {l}
              </button>
            ))}

            <div className="cs-toolbar-sep" />

            {[
              { v: "all",       l: t("courseSelection.all") },
              { v: "active",    l: t("courseSelection.enrolled") },
              { v: "pending",   l: t("courseSelection.pending") },
              { v: "available", l: t("courseSelection.available") },
              { v: "completed", l: t("common.completed") },
            ].map(({ v, l }) => (
              <button
                key={v}
                className={`cs-filter-btn ${statusFilter === v ? "active" : ""}`}
                onClick={() => setStatusFilter(v)}
              >
                {l}
              </button>
            ))}

            <div className="cs-stats">
              <span className="cs-stat"><strong>{filtered.length}</strong> {t("courseSelection.courses")}</span>
            </div>
          </div>

          {/* Cards */}
          <div className="cs-grid">
            {loading ? (
              <p className="cs-loading">{t("courseSelection.loading")}</p>
            ) : filtered.length === 0 ? (
              <div className="cs-empty">
                <BookOpen size={40} />
                <p>{t("courseSelection.noMatch")}</p>
              </div>
            ) : (
              filtered.map((course) => (
                <CourseCard
                  key={course.id}
                  course={course}
                  busyId={busyId}
                  onEnroll={handleEnroll}
                  onDrop={handleDrop}
                  onCancelRequest={handleCancelRequest}
                />
              ))
            )}
          </div>
        </div>
      </div>

      {toast && (
        <div className={`cs-toast ${toast.type}`}>{toast.msg}</div>
      )}

      <ChatWidget />
    </div>
  );
}

function CourseCard({ course, busyId, onEnroll, onDrop, onCancelRequest }) {
  const { t, language } = useLanguage();
  const { courseCode, courseName, courseNameEn, credits, ects, type, status, enrollmentId, grade, offerings } = course;

  const STATUS_LABEL = {
    active:          t("courseSelection.status.active"),
    pending:         t("courseSelection.status.pending"),
    rejected:        t("courseSelection.status.rejected"),
    completed:       t("courseSelection.status.completed"),
    available:       t("courseSelection.status.available"),
    "not-available": t("courseSelection.status.notAvailable"),
  };

  return (
    <div className={`cs-card status-${status}`}>
      {/* Header */}
      <div className="cs-card-header">
        <div className="cs-card-left">
          <p className="cs-code">{courseCode}</p>
          <p className="cs-name">{language === "en" ? (courseNameEn || courseName) : courseName}</p>
        </div>
        <div className="cs-badges">
          <span className={type === "Z" ? "badge-type-z" : "badge-type-s"}>
            {type === "Z" ? t("courseSelection.mandatory") : t("courseSelection.elective")}
          </span>
          <span className={`badge-status ${status}`}>
            {STATUS_LABEL[status]}
          </span>
        </div>
      </div>

      {/* Meta */}
      <div className="cs-card-meta">
        <span className="cs-meta-item"><BookOpen size={11} />{credits} {t("common.credits")}</span>
        {ects && <span className="cs-meta-item"><CheckCircle size={11} />{ects} {t("courseSelection.ects")}</span>}
      </div>

      {/* Completed: show grade */}
      {status === "completed" && (
        <div className="cs-grade-row">
          <span className="cs-grade-label">{t("courseSelection.grade")}</span>
          <span className="cs-grade-value">{grade ?? "—"}</span>
        </div>
      )}

      {/* Active: show current offering + Drop button */}
      {status === "active" && offerings.length > 0 && (
        <div className="cs-offerings">
          {offerings.map((o) => (
            <div className="cs-offering-row" key={o.id}>
              <div className="cs-offering-info">
                <p className="cs-offering-instr">
                  {o.instructor ? `${o.instructor.title} ${o.instructor.fullName}` : "—"}
                </p>
                <div className="cs-offering-time">
                  {o.day && <span><Calendar size={10} />{o.day}</span>}
                  {o.startTime && <span><Clock size={10} />{o.startTime}–{o.endTime}</span>}
                  {o.room && <span><MapPin size={10} />{o.room}</span>}
                </div>
              </div>
              <button
                className="btn-drop"
                onClick={() => onDrop(enrollmentId)}
                disabled={busyId === enrollmentId}
              >
                {busyId === enrollmentId ? t("courseSelection.dropping") : t("courseSelection.drop")}
              </button>
            </div>
          ))}
          {offerings.length === 0 && (
            <div className="cs-offering-row">
              <div className="cs-offering-info">
                <p className="cs-offering-instr">{t("courseSelection.enrolledCourse")}</p>
              </div>
              <button
                className="btn-drop"
                onClick={() => onDrop(enrollmentId)}
                disabled={busyId === enrollmentId}
              >
                {busyId === enrollmentId ? t("courseSelection.dropping") : t("courseSelection.drop")}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Pending: show waiting message + cancel button */}
      {status === "pending" && (
        <div className="cs-offerings">
          <div className="cs-offering-row">
            <div className="cs-offering-info">
              <p className="cs-offering-instr" style={{ color: "#d97706" }}>{t("courseSelection.pendingWaiting")}</p>
              {offerings.length > 0 && offerings[0].instructor && (
                <div className="cs-offering-time">
                  <span><User size={10} />{offerings[0].instructor.title} {offerings[0].instructor.fullName}</span>
                  {offerings[0].day && <span><Calendar size={10} />{offerings[0].day}</span>}
                  {offerings[0].startTime && <span><Clock size={10} />{offerings[0].startTime}–{offerings[0].endTime}</span>}
                </div>
              )}
            </div>
            <button
              className="btn-drop"
              style={{ background: "#fef3c7", color: "#d97706", borderColor: "#fde68a" }}
              onClick={() => onCancelRequest(enrollmentId)}
              disabled={busyId === enrollmentId}
            >
              {busyId === enrollmentId ? t("courseSelection.cancelling") : t("courseSelection.cancelRequest")}
            </button>
          </div>
        </div>
      )}

      {/* Rejected: show rejection message + re-request options */}
      {status === "rejected" && (
        <div className="cs-offerings">
          {offerings.length === 0 ? (
            <div className="cs-offering-row">
              <span style={{ fontSize: 12, color: "#94a3b8" }}>{t("courseSelection.noOffering")}</span>
            </div>
          ) : (
            offerings.map((o) => (
              <div className="cs-offering-row" key={o.id}>
                <div className="cs-offering-info">
                  <p className="cs-offering-instr" style={{ color: "#e24b4a" }}>{t("courseSelection.rejectedBadge")}</p>
                  <div className="cs-offering-time">
                    {o.instructor && <span><User size={10} />{o.instructor.title} {o.instructor.fullName}</span>}
                    {o.day && <span><Calendar size={10} />{o.day}</span>}
                    {o.startTime && <span><Clock size={10} />{o.startTime}–{o.endTime}</span>}
                    {o.room && <span><MapPin size={10} />{o.room}</span>}
                  </div>
                </div>
                <button
                  className="btn-enroll"
                  onClick={() => onEnroll(o.id)}
                  disabled={busyId === o.id}
                >
                  {busyId === o.id ? t("courseSelection.enrolling") : t("courseSelection.reRequest")}
                </button>
              </div>
            ))
          )}
        </div>
      )}

      {/* Available: show offerings with Enroll buttons */}
      {status === "available" && (
        <div className="cs-offerings">
          {offerings.length === 0 ? (
            <div className="cs-offering-row">
              <span style={{ fontSize: 12, color: "#94a3b8" }}>{t("courseSelection.noOffering")}</span>
            </div>
          ) : (
            offerings.map((o) => (
              <div className="cs-offering-row" key={o.id}>
                <div className="cs-offering-info">
                  <p className="cs-offering-instr">
                    {o.instructor ? `${o.instructor.title} ${o.instructor.fullName}` : "—"}
                  </p>
                  <div className="cs-offering-time">
                    {o.day      && <span><Calendar size={10} />{o.day}</span>}
                    {o.startTime && <span><Clock size={10} />{o.startTime}–{o.endTime}</span>}
                    {o.room     && <span><MapPin size={10} />{o.room}</span>}
                    <span><User size={10} />{o.enrolledCount} {t("courseSelection.students")}</span>
                  </div>
                </div>
                <button
                  className="btn-enroll"
                  onClick={() => onEnroll(o.id)}
                  disabled={busyId === o.id}
                >
                  {busyId === o.id ? t("courseSelection.enrolling") : t("courseSelection.enroll")}
                </button>
              </div>
            ))
          )}
        </div>
      )}

      {/* Not available */}
      {status === "not-available" && (
        <div className="cs-offerings">
          <div className="cs-offering-row">
            <span style={{ fontSize: 12, color: "#94a3b8" }}>{t("courseSelection.notAvailableThisTerm")}</span>
          </div>
        </div>
      )}
    </div>
  );
}
