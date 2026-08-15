import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { getInstructor, logoutInstructor, loginInstructor, getInstructorToken } from "../instructorAuth";
import instructorApi from "../instructorApi";
import { LayoutDashboard, BookOpen, LogOut, Users, Clock, MapPin, ChevronRight, Camera, Megaphone } from "lucide-react";
import "../styles/InstructorLayout.css";
import InstructorChatWidget from "../components/InstructorChatWidget";
import ThemeToggle from "../components/ThemeToggle";
import LanguageToggle from "../components/LanguageToggle";
import { useLanguage } from "../context/LanguageContext";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

const translateTerm = (term, language) => {
  if (!term || language !== "en") return term;
  return term
    .replace("Bahar Dönemi", "Spring Semester")
    .replace("Güz Dönemi",   "Fall Semester")
    .replace("Yaz Dönemi",   "Summer Semester")
    .replace("Bahar", "Spring")
    .replace("Güz",   "Fall")
    .replace("Yaz",   "Summer")
    .replace("Dönemi","Semester");
};

const translateDay = (day, language) => {
  if (!day || language !== "en") return day;
  const map = {
    "Pazartesi": "Monday", "Salı": "Tuesday", "Çarşamba": "Wednesday",
    "Perşembe": "Thursday", "Cuma": "Friday", "Cumartesi": "Saturday",
    "Pazar": "Sunday",
  };
  return map[day] || day;
};

const translateDepartment = (dept, language) => {
  if (!dept || language !== "en") return dept;
  const map = {
    "Bilgisayar Mühendisliği":          "Computer Engineering",
    "Elektrik-Elektronik Mühendisliği": "Electrical & Electronics Engineering",
    "Makine Mühendisliği":              "Mechanical Engineering",
    "İnşaat Mühendisliği":              "Civil Engineering",
    "Endüstri Mühendisliği":            "Industrial Engineering",
    "Yazılım Mühendisliği":             "Software Engineering",
    "Matematik":                        "Mathematics",
    "Fizik":                            "Physics",
    "İşletme":                          "Business Administration",
    "Ekonomi":                          "Economics",
  };
  return map[dept] || dept;
};

export default function InstructorDashboard() {
  const navigate = useNavigate();
  const { t, language } = useLanguage();
  const [instructor, setInstructor] = useState(getInstructor());
  const [offerings, setOfferings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    instructorApi.get("/offerings")
      .then((r) => setOfferings(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const totalStudents = offerings.reduce((s, o) => s + (o.enrolledCount ?? 0), 0);

  const initials = instructor?.fullName
    ? instructor.fullName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : "HO";

  const picUrl = instructor?.profilePicture ? `${API_URL}${instructor.profilePicture}` : null;

  const handleLogout = () => { logoutInstructor(); navigate("/instructor/login"); };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const formData = new FormData();
    formData.append("photo", file);
    try {
      const token = getInstructorToken();
      const res = await fetch(`${API_URL}/api/upload/profile-picture-instructor`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      if (!res.ok) throw new Error("Upload failed");
      const data = await res.json();
      const updated = { ...instructor, profilePicture: data.profilePicture };
      loginInstructor(token, updated);
      setInstructor(updated);
    } catch (err) {
      console.error(err);
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  return (
    <div className="inst-layout">
      {/* Sidebar */}
      <aside className="inst-sidebar">
        <div className="inst-sidebar-brand">
          <div className="inst-sidebar-brand-icon">
            <svg viewBox="0 0 24 24"><path d="M12 3L1 9l11 6 9-4.91V17h2V9L12 3zM5 13.18v4L12 21l7-3.82v-4L12 17l-7-3.82z" /></svg>
          </div>
          <span className="inst-sidebar-brand-name">SIS</span>
        </div>

        <div className="inst-sidebar-section">
          <p className="inst-sidebar-section-label">{t("sidebar.panel")}</p>
          <ul className="inst-sidebar-nav">
            <li className="active"><LayoutDashboard size={15} /> {t("instructorDashboard.title")}</li>
            <li onClick={() => navigate("/instructor/offerings")}><BookOpen size={15} /> {t("myOfferings.title")}</li>
            <li onClick={() => navigate("/instructor/announcements")}><Megaphone size={15} /> {t("announcements.title")}</li>
          </ul>
        </div>

        <div className="inst-sidebar-footer">
          <div className="inst-sidebar-user">
            <div
              style={{ position: "relative", cursor: "pointer", flexShrink: 0 }}
              onClick={() => fileInputRef.current?.click()}
            >
              {picUrl ? (
                <img src={picUrl} alt="avatar" style={{ width: 36, height: 36, borderRadius: "50%", objectFit: "cover", border: "2px solid rgba(255,255,255,0.2)" }} />
              ) : (
                <div className="inst-sidebar-avatar">{initials}</div>
              )}
              <div style={{ position: "absolute", bottom: -2, right: -2, width: 16, height: 16, borderRadius: "50%", background: "#4f7aff", display: "flex", alignItems: "center", justifyContent: "center", border: "1.5px solid #1a5c3a" }}>
                {uploading ? <div style={{ width: 8, height: 8, border: "1.5px solid #fff", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} /> : <Camera size={9} color="#fff" />}
              </div>
            </div>
            <input ref={fileInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleFileChange} />
            <div>
              <p className="inst-sidebar-user-name">{instructor?.fullName ?? "Instructor"}</p>
              <p className="inst-sidebar-user-role">{instructor?.title ?? "Faculty"}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="inst-main">
        <div className="inst-topbar">
          <div className="inst-topbar-left">
            <h1>{t("instructorDashboard.title")}</h1>
            <p>{translateDepartment(instructor?.department, language) ?? "—"}</p>
          </div>
          <div className="inst-topbar-right">
            <ThemeToggle variant="instructor" />
            <LanguageToggle variant="instructor" />
            {picUrl && (
              <img src={picUrl} alt="avatar" style={{ width: 34, height: 34, borderRadius: "50%", objectFit: "cover", border: "2px solid #eaecef", cursor: "pointer" }} onClick={() => fileInputRef.current?.click()} />
            )}
            <button className="inst-logout-btn" onClick={handleLogout}>
              <LogOut size={14} /> {t("common.logout")}
            </button>
          </div>
        </div>

        <div className="inst-content">
          {/* Welcome */}
          <div style={{ background: "linear-gradient(135deg, #0f2e1e 0%, #1a5c3a 100%)", borderRadius: 14, padding: "24px 28px", marginBottom: 22, color: "#fff" }}>
            <p style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", marginBottom: 6 }}>{t("instructorDashboard.welcome")}</p>
            <h2 style={{ fontSize: 22, fontWeight: 700 }}>{instructor?.title} {instructor?.fullName}</h2>
            <p style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", marginTop: 4 }}>{translateDepartment(instructor?.department, language)}</p>
          </div>

          {/* Summary */}
          <div className="inst-summary-strip" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
            <div className="inst-summary-card green">
              <div className="inst-summary-card-icon"><BookOpen size={18} /></div>
              <div>
                <p className="inst-summary-card-value">{offerings.length}</p>
                <p className="inst-summary-card-label">{t("instructorDashboard.activeOfferings")}</p>
              </div>
            </div>
            <div className="inst-summary-card blue">
              <div className="inst-summary-card-icon"><Users size={18} /></div>
              <div>
                <p className="inst-summary-card-value">{totalStudents}</p>
                <p className="inst-summary-card-label">{t("instructorDashboard.totalStudents")}</p>
              </div>
            </div>
            <div className="inst-summary-card slate">
              <div className="inst-summary-card-icon"><LayoutDashboard size={18} /></div>
              <div>
                <p className="inst-summary-card-value">{translateDepartment(instructor?.department, language)?.split(" ")[0] ?? "—"}</p>
                <p className="inst-summary-card-label">{t("instructorDashboard.department")}</p>
              </div>
            </div>
          </div>

          {/* Recent offerings */}
          <div className="inst-section-card">
            <div className="inst-section-header">
              <div>
                <p className="inst-section-title">{t("instructorDashboard.recentOfferings")}</p>
                <p className="inst-section-sub">{offerings.length} {t("instructorDashboard.openOfferings")}</p>
              </div>
              <button className="inst-btn-primary" onClick={() => navigate("/instructor/offerings")}>
                <BookOpen size={14} /> {t("instructorDashboard.viewAll")}
              </button>
            </div>

            {loading ? (
              <p style={{ padding: 20, color: "#7c8591", fontSize: 13 }}>{t("instructorDashboard.loading")}</p>
            ) : offerings.length === 0 ? (
              <div className="inst-empty">
                <BookOpen size={36} />
                <p>{t("instructorDashboard.noOfferings")}</p>
                <button className="inst-btn-primary" style={{ margin: "12px auto 0" }} onClick={() => navigate("/instructor/offerings")}>
                  {t("instructorDashboard.openFirst")}
                </button>
              </div>
            ) : (
              <table className="inst-table">
                <thead>
                  <tr>
                    <th>{t("instructorDashboard.col.course")}</th>
                    <th>{t("instructorDashboard.col.term")}</th>
                    <th>{t("instructorDashboard.col.timeRoom")}</th>
                    <th>{t("instructorDashboard.col.students")}</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {offerings.slice(0, 5).map((o) => (
                    <tr key={o.id} style={{ cursor: "pointer" }} onClick={() => navigate(`/instructor/offerings/${o.id}`)}>
                      <td>
                        <p style={{ fontWeight: 600 }}>{o.curriculum?.courseCode}</p>
                        <p style={{ fontSize: 12, color: "#7c8591" }}>
                          {language === "en" ? (o.curriculum?.courseNameEn || o.curriculum?.courseName) : o.curriculum?.courseName}
                        </p>
                      </td>
                      <td><span style={{ fontSize: 12, background: "#eff4ff", color: "#4f7aff", padding: "2px 8px", borderRadius: 12 }}>{translateTerm(o.academicTerm, language)}</span></td>
                      <td>
                        <div style={{ fontSize: 12, color: "#7c8591" }}>
                          {o.day && <span style={{ display: "flex", alignItems: "center", gap: 4 }}><Clock size={11} /> {translateDay(o.day, language)} {o.startTime}–{o.endTime}</span>}
                          {o.room && <span style={{ display: "flex", alignItems: "center", gap: 4 }}><MapPin size={11} /> {o.room}</span>}
                          {!o.day && !o.room && <span>—</span>}
                        </div>
                      </td>
                      <td><span style={{ fontWeight: 600 }}>{o.enrolledCount ?? 0}</span></td>
                      <td><ChevronRight size={14} color="#b0b8c1" /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
      <InstructorChatWidget />
    </div>
  );
}
