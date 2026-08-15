import { useState, useEffect } from "react";
import api from "../api";
import { logout, getUser } from "../auth";
import { useNavigate } from "react-router-dom";
import {
  LayoutDashboard, BookOpen, FileText,
  Calendar, GraduationCap,
  ChevronDown, TrendingUp, Star, List, Activity, PlusCircle,
  Download, Library, Megaphone, Sparkles,
} from "lucide-react";
import jsPDF from "jspdf";
import "../styles/Transcript.css";
import ChatWidget from "../components/ChatWidget";
import TopbarPanels from "../components/TopbarPanels";
import { useLanguage } from "../context/LanguageContext";

const GRADE_CLASS = { AA:"g-aa", BA:"g-ba", BB:"g-bb", CB:"g-cb", CC:"g-cc", DC:"g-dc", FF:"g-ff", IP:"g-ip" };

const GPA_SCALE = [
  { grade:"AA", points:4.00 }, { grade:"BA", points:3.50 },
  { grade:"BB", points:3.00 }, { grade:"CB", points:2.50 },
  { grade:"CC", points:2.00 }, { grade:"DC", points:1.50 },
  { grade:"DD", points:1.00 }, { grade:"FF", points:0.00 },
];

export default function Transcript() {
  const navigate = useNavigate();
  const user     = getUser();
  const { t, language } = useLanguage();

  const [SEMESTERS, setSEMESTERS]   = useState([]);
  const [trSummary, setTrSummary]   = useState(null);
  const [loading, setLoading]       = useState(true);
  const [openSems, setOpenSems]     = useState(new Set());

  useEffect(() => {
    Promise.all([api.get("/transcript"), api.get("/transcript/summary")])
      .then(([trRes, sumRes]) => {
        setSEMESTERS(trRes.data);
        setTrSummary(sumRes.data);
        const current = trRes.data.find(s => s.status === "current");
        if (current) setOpenSems(new Set([current.id]));
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const initials = user?.name
    ? user.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0,2)
    : "ST";

  const handleLogout = () => { logout(); navigate("/"); };

  const toggleSem = (id) => {
    setOpenSems(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const translateSemLabel = (label) => {
    if (language !== "en") return label;
    return label
      .replace(/Bahar Dönemi/g, "Spring Semester")
      .replace(/Güz Dönemi/g,   "Fall Semester")
      .replace(/Yaz Dönemi/g,   "Summer Semester")
      .replace(/Dönemi/g,       "Semester")
      .replace(/Bahar/g,        "Spring")
      .replace(/Güz/g,          "Fall")
      .replace(/Yaz/g,          "Summer");
  };

  const completedSems = SEMESTERS.filter(s => s.status === "completed");
  const cumulativeGPA = trSummary ? trSummary.cumulativeGpa.toFixed(2) : "—";
  const totalCredits  = SEMESTERS.reduce((s, sem) => s + sem.credits, 0);
  const totalCourses  = SEMESTERS.reduce((s, sem) => s + sem.courses.length, 0);
  const gpaData       = completedSems
    .filter(s => s.gpa != null)
    .map(s => ({ label: s.label.split(" ")[0] + " '" + s.label.slice(-2), gpa: s.gpa }));

  const gradeScaleLabels = {
    AA: t("transcript.gradeScale.excellent"),
    BA: t("transcript.gradeScale.veryGood"),
    BB: t("transcript.gradeScale.good"),
    CB: t("transcript.gradeScale.aboveAvg"),
    CC: t("transcript.gradeScale.average"),
    DC: t("transcript.gradeScale.belowAvg"),
    DD: t("transcript.gradeScale.passing"),
    FF: t("transcript.gradeScale.failing"),
  };

  const downloadPDF = () => {
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const pageW = 210;
    const margin = 18;
    let y = 0;

    doc.setFillColor(26, 31, 46);
    doc.rect(0, 0, pageW, 42, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text("OFFICIAL ACADEMIC TRANSCRIPT", pageW / 2, 16, { align: "center" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text("Student Information System — University", pageW / 2, 26, { align: "center" });
    doc.setFontSize(8);
    doc.setTextColor(180, 190, 210);
    doc.text(`Generated: ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}`, pageW / 2, 35, { align: "center" });

    y = 52;

    doc.setTextColor(26, 31, 46);
    doc.setFillColor(239, 244, 255);
    doc.roundedRect(margin, y, pageW - margin * 2, 40, 3, 3, "F");
    doc.setFillColor(79, 122, 255);
    doc.roundedRect(margin, y, 4, 40, 2, 2, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(79, 122, 255);
    doc.text("STUDENT INFORMATION", margin + 9, y + 8);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(26, 31, 46);
    const col1x = margin + 9;
    const col2x = margin + 95;
    doc.text(`Full Name:`, col1x, y + 17);
    doc.setFont("helvetica", "bold");
    doc.text(user?.name ?? "—", col1x + 28, y + 17);
    doc.setFont("helvetica", "normal");
    doc.text(`Student ID:`, col1x, y + 24);
    doc.setFont("helvetica", "bold");
    doc.text(user?.studentNumber ?? "—", col1x + 28, y + 24);
    doc.setFont("helvetica", "normal");
    doc.text(`Year:`, col1x, y + 31);
    doc.setFont("helvetica", "bold");
    doc.text(user?.year ? `Year ${user.year}` : "—", col1x + 28, y + 31);

    doc.setFont("helvetica", "normal");
    doc.text(`Program:`, col2x, y + 17);
    doc.setFont("helvetica", "bold");
    doc.text(user?.program ?? "—", col2x + 24, y + 17);
    doc.setFont("helvetica", "normal");
    doc.text(`Department:`, col2x, y + 24);
    doc.setFont("helvetica", "bold");
    const dept = (user?.department ?? "—");
    doc.text(dept.length > 22 ? dept.substring(0, 22) + "…" : dept, col2x + 30, y + 24);
    doc.setFont("helvetica", "normal");
    doc.text(`Advisor:`, col2x, y + 31);
    doc.setFont("helvetica", "bold");
    doc.text(user?.advisor ?? "—", col2x + 24, y + 31);

    y += 50;

    const statItems = [
      { label: "Cumulative GPA", value: cumulativeGPA },
      { label: "Credits Earned", value: String(totalCredits) },
      { label: "Courses Taken", value: String(totalCourses) },
      { label: "Semesters", value: String(SEMESTERS.length) },
    ];
    const cardW = (pageW - margin * 2 - 9) / 4;
    statItems.forEach((item, i) => {
      const x = margin + i * (cardW + 3);
      doc.setFillColor(79, 122, 255);
      doc.roundedRect(x, y, cardW, 20, 2, 2, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.text(item.value, x + cardW / 2, y + 9, { align: "center" });
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.text(item.label, x + cardW / 2, y + 16, { align: "center" });
    });

    y += 28;

    const semList = [...SEMESTERS].reverse();
    for (const sem of semList) {
      if (y > 255) { doc.addPage(); y = 20; }

      doc.setFillColor(26, 31, 46);
      doc.rect(margin, y, pageW - margin * 2, 9, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.text(translateSemLabel(sem.label), margin + 4, y + 6.3);
      const rightLabel = sem.status === "current" ? "In Progress" : `GPA: ${sem.gpa?.toFixed(2) ?? "—"} · ${sem.credits} Credits`;
      doc.text(rightLabel, pageW - margin - 4, y + 6.3, { align: "right" });
      y += 9;

      doc.setFillColor(230, 238, 255);
      doc.rect(margin, y, pageW - margin * 2, 6, "F");
      doc.setTextColor(79, 122, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.5);
      doc.text("Course Name", margin + 4, y + 4.3);
      doc.text("Code", margin + 108, y + 4.3);
      doc.text("Cr.", margin + 136, y + 4.3);
      doc.text("Grade", margin + 153, y + 4.3);
      y += 6;

      sem.courses.forEach((c, ci) => {
        if (y > 272) { doc.addPage(); y = 20; }
        if (ci % 2 === 0) {
          doc.setFillColor(249, 250, 251);
          doc.rect(margin, y, pageW - margin * 2, 6.5, "F");
        }
        doc.setTextColor(30, 40, 60);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        const name = c.name.length > 46 ? c.name.substring(0, 46) + "…" : c.name;
        doc.text(name, margin + 4, y + 4.5);
        doc.text(c.code, margin + 108, y + 4.5);
        doc.text(String(c.credits), margin + 138, y + 4.5);

        const gradeColors = {
          AA: [22, 163, 74], BA: [22, 163, 74], BB: [59, 130, 246],
          CB: [59, 130, 246], CC: [202, 138, 4], DC: [234, 88, 12],
          DD: [234, 88, 12], FF: [220, 38, 38],
        };
        const gc = gradeColors[c.grade] ?? [100, 116, 139];
        doc.setTextColor(...gc);
        doc.setFont("helvetica", "bold");
        doc.text(c.grade ?? "—", margin + 155, y + 4.5);
        doc.setTextColor(30, 40, 60);
        y += 6.5;
      });

      doc.setTextColor(120, 130, 150);
      doc.setFont("helvetica", "italic");
      doc.setFontSize(7.5);
      doc.text(`${sem.courses.length} course(s) · ${sem.credits} credits`, margin + 4, y + 4);
      y += 10;
    }

    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFillColor(26, 31, 46);
      doc.rect(0, 285, pageW, 12, "F");
      doc.setTextColor(140, 155, 180);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.text("This is an unofficial transcript generated from the Student Information System.", margin, 292);
      doc.text(`Page ${i} of ${pageCount}`, pageW - margin, 292, { align: "right" });
    }

    doc.save(`transcript-${user?.studentNumber ?? "student"}.pdf`);
  };

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
            <li className="active"><GraduationCap size={16}/> {t("nav.transcript")}</li>
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
            <h1>{t("transcript.title")}</h1>
            <p>{t("transcript.academicRecord")} — {SEMESTERS.length} {t("transcript.semesters")}</p>
          </div>
          <div className="topbar-right">
            <TopbarPanels />
          </div>
        </div>

        <div className="content">
          {/* Summary strip */}
          <div className="summary-strip">
            <div className="summary-card blue">
              <div className="summary-card-icon"><TrendingUp size={16}/></div>
              <div>
                <p className="summary-card-value">{cumulativeGPA}</p>
                <p className="summary-card-label">{t("transcript.cumulativeGpa")}</p>
              </div>
            </div>
            <div className="summary-card green">
              <div className="summary-card-icon"><List size={16}/></div>
              <div>
                <p className="summary-card-value">{totalCredits}</p>
                <p className="summary-card-label">{t("transcript.creditsEarned")}</p>
              </div>
            </div>
            <div className="summary-card amber">
              <div className="summary-card-icon"><BookOpen size={16}/></div>
              <div>
                <p className="summary-card-value">{totalCourses}</p>
                <p className="summary-card-label">{t("transcript.coursesTaken")}</p>
              </div>
            </div>
            <div className="summary-card slate">
              <div className="summary-card-icon"><Star size={16}/></div>
              <div>
                <p className="summary-card-value">{SEMESTERS.length}</p>
                <p className="summary-card-label">{t("transcript.semesters")}</p>
              </div>
            </div>
          </div>

          {/* Two-column body */}
          <div className="transcript-body">

            {/* ── LEFT: semester accordion ── */}
            <div className="semesters">
              {SEMESTERS.slice().reverse().map(sem => {
                const isOpen = openSems.has(sem.id);
                const isCurrent = sem.status === "current";
                return (
                  <div className="semester-block" key={sem.id}>
                    <div className="semester-header" onClick={() => toggleSem(sem.id)}>
                      <div className="semester-header-left">
                        <span className="semester-dot" style={{background: sem.color}}/>
                        <div>
                          <p className="semester-title">{translateSemLabel(sem.label)}</p>
                          <p className="semester-sub">{sem.courses.length} {t("transcript.courses")} · {sem.credits} {t("common.credits")}</p>
                        </div>
                      </div>
                      <div className="semester-header-right">
                        {isCurrent ? (
                          <span style={{fontSize:11, fontWeight:600, background:"#fff7ed", color:"#ea580c", padding:"3px 10px", borderRadius:20}}>{t("transcript.inProgress")}</span>
                        ) : (
                          <span className={`semester-gpa-pill ${GRADE_CLASS[sem.gpa >= 3.5 ? "AA" : sem.gpa >= 3.0 ? "BA" : "BB"]}`}>
                            GPA {sem.gpa.toFixed(2)}
                          </span>
                        )}
                        <ChevronDown size={18} className={`semester-chevron ${isOpen ? "open" : ""}`} />
                      </div>
                    </div>

                    {isOpen && (
                      <>
                        <div className="semester-table">
                          <table className="transcript-table">
                            <thead>
                              <tr>
                                <th>{t("transcript.col.course")}</th>
                                <th>{t("transcript.col.credits")}</th>
                                <th>{t("transcript.col.grade")}</th>
                              </tr>
                            </thead>
                            <tbody>
                              {sem.courses.map(c => (
                                <tr key={c.code}>
                                  <td>
                                    <p className="tc-name">{language === "en" ? (c.nameEn || c.name) : c.name}</p>
                                    <p className="tc-code">{c.code}</p>
                                  </td>
                                  <td>{c.credits}</td>
                                  <td>
                                    <span className={`grade-pill ${GRADE_CLASS[c.grade] ?? ""}`}>
                                      {c.grade}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                        {!isCurrent && (
                          <div className="semester-footer">
                            <div className="sem-footer-item">{t("transcript.totalCredits")} <span>{sem.credits}</span></div>
                            <div className="sem-footer-item">{t("transcript.semesterGpa")} <span>{sem.gpa.toFixed(2)}</span></div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                );
              })}
            </div>

            {/* ── RIGHT: student info + GPA chart + download ── */}
            <div className="right-panel">

              {/* Student info */}
              <div className="student-info-card">
                <div className="sic-avatar">{initials}</div>
                <p className="sic-name">{user?.name ?? "Student"}</p>
                <p className="sic-id">{t("transcript.studentId")} {user?.studentNumber ?? "—"}</p>
                <div className="sic-rows">
                  <div className="sic-row">
                    <span className="sic-row-label">{t("transcript.program")}</span>
                    <span className="sic-row-value">{user?.program ?? "—"}</span>
                  </div>
                  <div className="sic-divider"/>
                  <div className="sic-row">
                    <span className="sic-row-label">{t("transcript.department")}</span>
                    <span className="sic-row-value">{user?.department ?? "—"}</span>
                  </div>
                  <div className="sic-divider"/>
                  <div className="sic-row">
                    <span className="sic-row-label">{t("common.year")}</span>
                    <span className="sic-row-value">{user?.year ? `${user.year}${["th","st","nd","rd"][user.year] ?? "th"} Year` : "—"}</span>
                  </div>
                  <div className="sic-divider"/>
                  <div className="sic-row">
                    <span className="sic-row-label">{t("common.status")}</span>
                    <span className="sic-row-value" style={{color:"#4ade80"}}>{t("transcript.statusActive")}</span>
                  </div>
                  <div className="sic-divider"/>
                  <div className="sic-row">
                    <span className="sic-row-label">{t("transcript.advisor")}</span>
                    <span className="sic-row-value">{user?.advisor || "—"}</span>
                  </div>
                </div>
              </div>

              {/* Cumulative GPA display */}
              <div className="cumulative-gpa">
                <p className="cgpa-label">{t("transcript.cumulativeGpa")}</p>
                <p className="cgpa-value">{cumulativeGPA}</p>
                <p className="cgpa-sub">{t("transcript.outOf")} · {completedSems.length} {t("transcript.completedSemesters")}</p>
                <div className="cgpa-bar-track">
                  <div className="cgpa-bar-fill" style={{width: `${(parseFloat(cumulativeGPA)/4)*100}%`}}/>
                </div>
                <div className="cgpa-range"><span>0.00</span><span>4.00</span></div>
              </div>

              {/* GPA per semester bars */}
              <div className="gpa-card">
                <p className="gpa-card-title">{t("transcript.gpaBysemester")}</p>
                <div className="gpa-bars">
                  {gpaData.map(d => (
                    <div className="gpa-bar-row" key={d.label}>
                      <span className="gpa-bar-label">{d.label}</span>
                      <div className="gpa-bar-track">
                        <div className="gpa-bar-fill" style={{width:`${(d.gpa/4)*100}%`}}/>
                      </div>
                      <span className="gpa-bar-value">{d.gpa.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Download PDF */}
              <button
                onClick={downloadPDF}
                style={{
                  width: "100%", display: "flex", alignItems: "center",
                  justifyContent: "center", gap: 8, padding: "13px 20px",
                  background: "#1a1f2e", color: "#fff", border: "none",
                  borderRadius: 12, fontSize: 13, fontWeight: 600,
                  cursor: "pointer", transition: "background 0.15s",
                }}
                onMouseOver={e => e.currentTarget.style.background = "#2b3250"}
                onMouseOut={e => e.currentTarget.style.background = "#1a1f2e"}
              >
                <Download size={16} />
                {t("transcript.downloadPdf")}
              </button>

              {/* Grade scale */}
              <div style={{background:"#fff", border:"1px solid #eaecef", borderRadius:12, padding:"16px 18px"}}>
                <p style={{fontSize:13, fontWeight:600, color:"#1a1f2e", marginBottom:12}}>{t("transcript.gradeScale")}</p>
                <div style={{display:"flex", flexDirection:"column", gap:6}}>
                  {GPA_SCALE.map(g => (
                    <div key={g.grade} style={{display:"flex", alignItems:"center", justifyContent:"space-between"}}>
                      <span className={`grade-pill ${GRADE_CLASS[g.grade] ?? "g-cb"}`} style={{width:38}}>{g.grade}</span>
                      <span style={{fontSize:12, color:"#7c8591", flex:1, marginLeft:10}}>
                        {gradeScaleLabels[g.grade]}
                      </span>
                      <span style={{fontSize:12, fontWeight:600, color:"#1a1f2e"}}>{g.points.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>
      <ChatWidget />
    </div>
  );
}
