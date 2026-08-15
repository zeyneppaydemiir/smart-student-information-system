import { useState, useEffect } from "react";
import api from "../api";
import { logout, getUser } from "../auth";
import { useNavigate } from "react-router-dom";
import {
  LayoutDashboard, BookOpen, FileText,
  Calendar, GraduationCap, User,
  ChevronLeft, ChevronRight,
  Clock, MapPin, BookMarked, TrendingUp,
  Activity, PlusCircle, Library, Megaphone, Sparkles,
} from "lucide-react";
import "../styles/Schedule.css";
import ChatWidget from "../components/ChatWidget";
import TopbarPanels from "../components/TopbarPanels";
import { useLanguage } from "../context/LanguageContext";

const DAYS_SHORT = ["MON", "TUE", "WED", "THU", "FRI"];
const DAYS_LONG  = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
const HOURS = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17];
const GRID_START = 8;
const SLOT_H     = 72;

const COLOR_BAR  = { blue:"bar-blue", green:"bar-green", sky:"bar-sky", slate:"bar-slate", purple:"bar-purple", orange:"bar-orange" };
const COLOR_BLOCK= { blue:"cb-blue",  green:"cb-green",  sky:"cb-sky",  slate:"cb-slate",  purple:"cb-purple",  orange:"cb-orange"  };
const BADGE_STYLE= {
  blue:  { background:"#eff4ff", color:"#4f7aff" },
  green: { background:"#f0fdf4", color:"#16a34a" },
  sky:   { background:"#f0f9ff", color:"#0ea5e9" },
  slate: { background:"#f1f5f9", color:"#475569" },
  purple:{ background:"#f5f3ff", color:"#7c3aed" },
  orange:{ background:"#fff7ed", color:"#ea580c" },
};

function fmt(h, m) { return `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}`; }

function getMonday(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0,0,0,0);
  return d;
}

function addDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

export default function Schedule() {
  const navigate  = useNavigate();
  const user      = getUser();
  const today     = new Date();
  const { t, language } = useLanguage();

  const [COURSES, setCOURSES] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/student/my-courses")
      .then((res) => setCOURSES(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const [weekStart, setWeekStart] = useState(getMonday(today));
  const [selectedDay, setSelectedDay] = useState(
    today.getDay() >= 1 && today.getDay() <= 5 ? today.getDay() - 1 : 0
  );

  const initials = user?.name
    ? user.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0,2)
    : "ST";

  const handleLogout = () => { logout(); navigate("/"); };

  const prevWeek = () => setWeekStart(d => addDays(d, -7));
  const nextWeek = () => setWeekStart(d => addDays(d,  7));
  const goToday  = () => {
    setWeekStart(getMonday(today));
    setSelectedDay(today.getDay() >= 1 && today.getDay() <= 5 ? today.getDay()-1 : 0);
  };

  const weekEnd    = addDays(weekStart, 4);
  const weekLabel  = `${MONTH_NAMES[weekStart.getMonth()]} ${weekStart.getDate()} – ${MONTH_NAMES[weekEnd.getMonth()]} ${weekEnd.getDate()}, ${weekEnd.getFullYear()}`;

  const isToday = (dayIndex) => {
    const d = addDays(weekStart, dayIndex);
    return d.toDateString() === today.toDateString();
  };

  const dayNum = selectedDay + 1;
  const todayCourses = COURSES
    .filter(c => Array.isArray(c.days) && c.days.includes(dayNum))
    .sort((a,b) => a.startHour*60+a.startMin - (b.startHour*60+b.startMin));

  const totalHours = COURSES.reduce((sum, c) => {
    const mins = (c.endHour*60+c.endMin) - (c.startHour*60+c.startMin);
    return sum + (mins/60) * (Array.isArray(c.days) ? c.days.length : 0);
  }, 0);

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
            <li className="active"><Calendar size={16}/> {t("nav.schedule")}</li>
            <li onClick={() => navigate("/transcript")}><GraduationCap size={16}/> {t("nav.transcript")}</li>
            <li onClick={() => navigate("/attendance")}><Activity size={16}/> {t("nav.attendance")}</li>
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
            <h1>{t("schedule.title")}</h1>
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
              <div className="summary-card-icon"><BookMarked size={16}/></div>
              <div>
                <p className="summary-card-value">{COURSES.length}</p>
                <p className="summary-card-label">{t("schedule.coursesThisTerm")}</p>
              </div>
            </div>
            <div className="summary-card green">
              <div className="summary-card-icon"><Calendar size={16}/></div>
              <div>
                <p className="summary-card-value">{todayCourses.length}</p>
                <p className="summary-card-label">{t("schedule.classesToday")}</p>
              </div>
            </div>
            <div className="summary-card sky">
              <div className="summary-card-icon"><Clock size={16}/></div>
              <div>
                <p className="summary-card-value">{totalHours.toFixed(0)}h</p>
                <p className="summary-card-label">{t("schedule.weeklyHours")}</p>
              </div>
            </div>
            <div className="summary-card slate">
              <div className="summary-card-icon"><TrendingUp size={16}/></div>
              <div>
                <p className="summary-card-value">{COURSES.reduce((s,c)=>s+c.credits,0)}</p>
                <p className="summary-card-label">{t("schedule.totalCredits")}</p>
              </div>
            </div>
          </div>

          {/* Two-column layout */}
          <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:20, alignItems:"start"}}>

            {/* ── LEFT: week nav + day tabs + daily list ── */}
            <div style={{display:"flex", flexDirection:"column", gap:14}}>

              {/* Week navigator */}
              <div className="week-nav">
                <button className="week-arrow" onClick={prevWeek}><ChevronLeft size={15}/></button>
                <div className="week-nav-center">
                  <div>
                    <p className="week-label">{weekLabel}</p>
                    <p className="week-sub">{t("schedule.weekSchedule")}</p>
                  </div>
                </div>
                <div style={{display:"flex", gap:8}}>
                  <button className="week-today-btn" onClick={goToday}>{t("common.today")}</button>
                  <button className="week-arrow" onClick={nextWeek}><ChevronRight size={15}/></button>
                </div>
              </div>

              {/* Day tab selector */}
              <div className="day-tabs">
                {DAYS_SHORT.map((d, i) => {
                  const date = addDays(weekStart, i);
                  const hasCourses = COURSES.some(c => c.days.includes(i+1));
                  return (
                    <button
                      key={i}
                      className={`day-tab ${i === selectedDay ? "active" : ""} ${isToday(i) && i !== selectedDay ? "today" : ""}`}
                      onClick={() => setSelectedDay(i)}
                    >
                      <span className="day-name">{d}</span>
                      <span className="day-number">{date.getDate()}</span>
                      {hasCourses && <span className="day-dot"/>}
                    </button>
                  );
                })}
              </div>

              {/* Day schedule list */}
              <div>
                <div style={{display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:12}}>
                  <p style={{fontSize:14, fontWeight:600, color:"#1a1f2e"}}>
                    {DAYS_LONG[selectedDay]}, {addDays(weekStart, selectedDay).getDate()} {MONTH_NAMES[addDays(weekStart, selectedDay).getMonth()]}
                    {isToday(selectedDay) && (
                      <span style={{marginLeft:8, fontSize:11, fontWeight:600, background:"#eff4ff", color:"#4f7aff", padding:"2px 8px", borderRadius:20}}>{t("common.today")}</span>
                    )}
                  </p>
                  <p style={{fontSize:12, color:"#7c8591"}}>{todayCourses.length} class{todayCourses.length !== 1 ? "es" : ""}</p>
                </div>

                {todayCourses.length === 0 ? (
                  <div className="no-class">
                    <Calendar size={28}/>
                    <p>{t("schedule.noClasses")}</p>
                  </div>
                ) : (
                  <div className="single-day-list">
                    {todayCourses.map(c => (
                      <div className="schedule-item" key={c.id}>
                        <div className="si-time-col">
                          <span className="si-time">{fmt(c.startHour, c.startMin)}</span>
                          <span className="si-sep">|</span>
                          <span className="si-time">{fmt(c.endHour, c.endMin)}</span>
                        </div>
                        <div className={`si-color-bar ${COLOR_BAR[c.color]}`}/>
                        <div className="si-body">
                          <p className="si-name">{language === "en" ? (c.nameEn || c.name) : c.name}</p>
                          <div className="si-meta">
                            <span className="si-tag"><User size={12}/>{c.instructor}</span>
                            <span className="si-tag"><MapPin size={12}/>{t("common.room")} {c.room}</span>
                            <span className="si-tag">
                              <Clock size={12}/>
                              {(() => {
                                const mins = (c.endHour*60+c.endMin)-(c.startHour*60+c.startMin);
                                return `${Math.floor(mins/60)}h${mins%60 ? ` ${mins%60}m` : ""}`;
                              })()}
                            </span>
                          </div>
                        </div>
                        <div style={{display:"flex", flexDirection:"column", alignItems:"flex-end", gap:6, flexShrink:0}}>
                          <span className="si-badge" style={BADGE_STYLE[c.color]}>{c.code}</span>
                          <span style={{fontSize:11, color:"#b0b8c1"}}>{c.credits} cr.</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* ── RIGHT: Weekly Overview table ── */}
            <div style={{background:"#fff", border:"1px solid #eaecef", borderRadius:12, overflow:"hidden"}}>
              <div style={{padding:"14px 20px", borderBottom:"1px solid #eaecef"}}>
                <p style={{fontSize:14, fontWeight:600, color:"#1a1f2e"}}>{t("schedule.weeklyOverview")}</p>
                <p style={{fontSize:12, color:"#7c8591", marginTop:2}}>{t("schedule.allCoursesGlance")}</p>
              </div>
              <div style={{overflowX:"auto"}}>
                <table style={{width:"100%", borderCollapse:"collapse", minWidth:320}}>
                  <thead>
                    <tr style={{background:"#fafafa"}}>
                      <th style={{padding:"10px 12px", textAlign:"left", fontSize:10, fontWeight:600, textTransform:"uppercase", letterSpacing:"0.7px", color:"#7c8591", borderBottom:"1px solid #eaecef", width:90}}>{t("schedule.time")}</th>
                      {DAYS_LONG.map((d, i) => (
                        <th key={d} style={{padding:"10px 8px", textAlign:"center", fontSize:10, fontWeight:600, textTransform:"uppercase", letterSpacing:"0.7px", color: isToday(i) ? "#4f7aff" : "#7c8591", borderBottom:"1px solid #eaecef", background: isToday(i) ? "#eff4ff" : "transparent"}}>
                          {d.slice(0,3)}
                          {isToday(i) && <span style={{display:"block", fontSize:9, color:"#4f7aff"}}>{t("common.today")}</span>}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {COURSES
                      .slice()
                      .sort((a,b) => a.startHour*60+a.startMin - (b.startHour*60+b.startMin))
                      .map((c, idx) => (
                      <tr key={c.id} style={{borderBottom: idx < COURSES.length-1 ? "1px solid #f0f2f5" : "none"}}>
                        <td style={{padding:"10px 12px", fontSize:11, color:"#7c8591", whiteSpace:"nowrap"}}>
                          {fmt(c.startHour,c.startMin)}<br/>{fmt(c.endHour,c.endMin)}
                        </td>
                        {[1,2,3,4,5].map(dayN => (
                          <td key={dayN} style={{padding:"6px 4px", textAlign:"center"}}>
                            {c.days.includes(dayN) ? (
                              <div style={{
                                background: BADGE_STYLE[c.color].background,
                                color: BADGE_STYLE[c.color].color,
                                borderRadius:6, padding:"5px 4px",
                                fontSize:10, fontWeight:600, lineHeight:1.3,
                              }}>
                                <div>{c.code}</div>
                                <div style={{fontSize:9, fontWeight:400, opacity:0.8}}>Rm {c.room}</div>
                              </div>
                            ) : (
                              <span style={{color:"#eaecef", fontSize:11}}>—</span>
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        </div>
      </div>
      <ChatWidget />
    </div>
  );
}
