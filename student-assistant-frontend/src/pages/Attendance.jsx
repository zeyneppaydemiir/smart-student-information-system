import { useState, useEffect } from "react";
import { logout, getUser } from "../auth";
import api from "../api";
import { useNavigate } from "react-router-dom";
import {
  LayoutDashboard, BookOpen, FileText,
  Calendar, GraduationCap,
  CheckCircle, XCircle, AlertCircle, Clock, AlertTriangle,
  Activity, PlusCircle, Library, Megaphone, Sparkles,
} from "lucide-react";
import "../styles/Attendance.css";
import ChatWidget from "../components/ChatWidget";
import TopbarPanels from "../components/TopbarPanels";
import { useLanguage } from "../context/LanguageContext";

const DOT_CLASS  = { absent:"dot-absent",  late:"dot-late",  excused:"dot-excused"  };
const TYPE_CLASS = { absent:"type-absent", late:"type-late", excused:"type-excused" };

function getStatus(pct) {
  if (pct >= 80) return "safe";
  if (pct >= 70) return "warning";
  return "danger";
}

function getChipClass(status) {
  return { safe:"chip-safe", warning:"chip-warning", danger:"chip-danger" }[status];
}

export default function Attendance() {
  const navigate  = useNavigate();
  const user      = getUser();
  const { t }     = useLanguage();

  const [COURSES, setCOURSES]               = useState([]);
  const [RECENT_ABSENCES, setRECENT]        = useState([]);
  const [loading, setLoading]               = useState(true);

  useEffect(() => {
    api.get("/attendance")
      .then((res) => {
        setCOURSES(res.data.courses ?? []);
        setRECENT(res.data.recentAbsences ?? []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const initials = user?.name
    ? user.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0,2)
    : "ST";

  const handleLogout = () => { logout(); navigate("/"); };

  const totalClasses  = COURSES.reduce((s,c) => s + c.totalWeeks, 0);
  const totalAttended = COURSES.reduce((s,c) => s + c.attended, 0);
  const totalAbsent   = COURSES.reduce((s,c) => s + c.absent, 0);
  const overallPct    = totalClasses > 0 ? Math.round((totalAttended / totalClasses) * 100) : 0;
  const atRiskCount   = COURSES.filter(c => {
    const pct = Math.round((c.attended / c.totalWeeks) * 100);
    return pct < 80;
  }).length;

  const TYPE_LABEL = {
    absent: t("attendance.col.absent"),
    late: t("attendance.col.late"),
    excused: t("attendance.excusedAbsences"),
  };

  const getChipLabel = (status) => ({
    safe: t("attendance.onTrack"),
    warning: t("attendance.atRisk"),
    danger: t("attendance.critical"),
  }[status]);

  return (
    <div className="layout">
      {/* ── SIDEBAR ── */}
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="sidebar-brand-icon">
            <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 3L1 9l11 6 9-4.91V17h2V9L12 3zM5 13.18v4L12 21l7-3.82v-4L12 17l-7-3.82z"/>
            </svg>
          </div>
          <span className="sidebar-brand-name">SIS</span>
        </div>
        <div className="sidebar-section">
          <p className="sidebar-section-label">{t("nav.mainMenu")}</p>
          <ul className="sidebar-nav">
            <li onClick={() => navigate("/dashboard")}><LayoutDashboard size={16}/> {t("nav.dashboard")}</li>
            <li onClick={() => navigate("/courses")}><BookOpen size={16}/> {t("nav.courses")}</li>
            <li onClick={() => navigate("/course-selection")}><PlusCircle size={16}/> {t("nav.courseSelection")}</li>
            <li onClick={() => navigate("/curriculum")}><Library size={16}/> {t("nav.curriculum")}</li>
            <li onClick={() => navigate("/forms")}><FileText size={16}/> {t("nav.forms")}</li>
            <li onClick={() => navigate("/schedule")}><Calendar size={16}/> {t("nav.schedule")}</li>
            <li onClick={() => navigate("/transcript")}><GraduationCap size={16}/> {t("nav.transcript")}</li>
            <li className="active"><Activity size={16}/> {t("nav.attendance")}</li>
            <li onClick={() => navigate("/announcements")}><Megaphone size={16}/> {t("nav.announcements")}</li>
            <li onClick={() => navigate("/course-recommendation")}><Sparkles size={16}/> {t("nav.courseRecommendation")}</li>
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
            <h1>{t("attendance.title")}</h1>
            <p>{t("semester.springFull")}</p>
          </div>
          <div className="topbar-right">
            <TopbarPanels />
          </div>
        </div>

        <div className="content">
          {/* Summary */}
          <div className="summary-strip">
            <div className="summary-card green">
              <div className="summary-card-icon"><CheckCircle size={16}/></div>
              <div>
                <p className="summary-card-value">{overallPct}%</p>
                <p className="summary-card-label">{t("attendance.overallAttendance")}</p>
              </div>
            </div>
            <div className="summary-card blue">
              <div className="summary-card-icon"><Clock size={16}/></div>
              <div>
                <p className="summary-card-value">{totalAttended}</p>
                <p className="summary-card-label">{t("attendance.classesAttended")}</p>
              </div>
            </div>
            <div className="summary-card red">
              <div className="summary-card-icon"><XCircle size={16}/></div>
              <div>
                <p className="summary-card-value">{totalAbsent}</p>
                <p className="summary-card-label">{t("attendance.totalAbsences")}</p>
              </div>
            </div>
            <div className="summary-card amber">
              <div className="summary-card-icon"><AlertCircle size={16}/></div>
              <div>
                <p className="summary-card-value">{atRiskCount}</p>
                <p className="summary-card-label">{t("attendance.coursesAtRisk")}</p>
              </div>
            </div>
          </div>

          {/* Policy note */}
          <div className="policy-note">
            <AlertTriangle size={15}/>
            <p dangerouslySetInnerHTML={{ __html: t("attendance.policy") }} />
          </div>

          {/* Two-column body */}
          <div className="attendance-body">

            {/* Course attendance table */}
            <div className="attendance-table-section">
              <div className="section-header">
                <div>
                  <p className="section-title">{t("attendance.summaryTitle")}</p>
                  <p className="section-sub">{COURSES.length} {t("attendance.coursesThisSemester")}</p>
                </div>
              </div>
              <table className="att-table">
                <thead>
                  <tr>
                    <th>{t("attendance.col.course")}</th>
                    <th>{t("attendance.col.attended")}</th>
                    <th>{t("attendance.col.absent")}</th>
                    <th>{t("attendance.col.late")}</th>
                    <th>{t("attendance.col.rate")}</th>
                    <th>{t("attendance.col.status")}</th>
                  </tr>
                </thead>
                <tbody>
                  {COURSES.map(c => {
                    const pct    = Math.round((c.attended / c.totalWeeks) * 100);
                    const status = getStatus(pct);
                    return (
                      <tr key={c.id}>
                        <td>
                          <p className="course-name-cell">{c.name}</p>
                          <p className="course-code-cell">{c.code}</p>
                        </td>
                        <td>{c.attended}/{c.totalWeeks}</td>
                        <td style={{color: c.absent > 2 ? "#e24b4a" : "#1a1f2e", fontWeight: c.absent > 2 ? 600 : 400}}>{c.absent}</td>
                        <td>{c.late}</td>
                        <td>
                          <div className="att-bar-wrap">
                            <div className="att-bar-track">
                              <div className={`att-bar-fill ${status}`} style={{width:`${pct}%`}}/>
                            </div>
                            <span className={`att-bar-pct ${status}`}>{pct}%</span>
                          </div>
                        </td>
                        <td>
                          <span className={`att-chip ${getChipClass(status)}`}>
                            {getChipLabel(status)}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Right panel */}
            <div className="right-panel">

              {/* Absence limit info */}
              <div className="limit-card">
                <p className="limit-card-title">{t("attendance.absenceLimits")}</p>
                <div className="limit-rows">
                  <div className="limit-row">
                    <span className="limit-row-label">{t("attendance.maxAllowed")}</span>
                    <span className="limit-row-value">{t("attendance.maxAbsences")}</span>
                  </div>
                  <div className="limit-divider"/>
                  <div className="limit-row">
                    <span className="limit-row-label">{t("attendance.minRate")}</span>
                    <span className="limit-row-value">70%</span>
                  </div>
                  <div className="limit-divider"/>
                  <div className="limit-row">
                    <span className="limit-row-label">{t("attendance.excusedAbsences")}</span>
                    <span className="limit-row-value">{t("attendance.requireDocs")}</span>
                  </div>
                  <div className="limit-divider"/>
                  <div className="limit-row">
                    <span className="limit-row-label">{t("attendance.lateArrivals")}</span>
                    <span className="limit-row-value">{t("attendance.equalAbsence")}</span>
                  </div>
                </div>
                {atRiskCount > 0 && (
                  <div className="limit-warning-box">
                    <p>{t("attendance.atRiskWarning").replace("{count}", atRiskCount)}</p>
                  </div>
                )}
              </div>

              {/* Recent absences */}
              <div className="recent-card">
                <div className="recent-card-header">
                  <p className="section-title">{t("attendance.recentAbsences")}</p>
                  <p className="section-sub" style={{marginTop:2}}>{t("attendance.lastRecords")}</p>
                </div>
                {RECENT_ABSENCES.map((a, i) => (
                  <div className="recent-item" key={i}>
                    <span className={`recent-item-dot ${DOT_CLASS[a.type]}`}/>
                    <div className="recent-item-body">
                      <p className="recent-item-course">{a.course}</p>
                      <p className="recent-item-date">{a.code} · {a.date}</p>
                    </div>
                    <span className={`recent-item-type ${TYPE_CLASS[a.type]}`}>
                      {TYPE_LABEL[a.type]}
                    </span>
                  </div>
                ))}
              </div>

            </div>
          </div>
        </div>
      </div>
      <ChatWidget />
    </div>
  );
}
