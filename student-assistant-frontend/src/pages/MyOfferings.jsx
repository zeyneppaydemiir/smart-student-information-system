import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { getInstructor, logoutInstructor, loginInstructor, getInstructorToken } from "../instructorAuth";
import instructorApi from "../instructorApi";
import {
  LayoutDashboard, BookOpen, LogOut, Plus, X,
  Clock, MapPin, Users, ChevronRight, Trash2, Camera, Megaphone,
} from "lucide-react";
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

export default function MyOfferings() {
  const navigate = useNavigate();
  const { t, language } = useLanguage();
  const [instructor, setInstructor] = useState(getInstructor());

  const DAYS = ["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi"];

  const [offerings, setOfferings] = useState([]);
  const [curriculum, setCurriculum] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ curriculumId: "", academicTerm: "2025-2026 Bahar", day: "", startTime: "", endTime: "", room: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

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

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 3000); };

  useEffect(() => {
    Promise.all([instructorApi.get("/offerings"), instructorApi.get("/curriculum")])
      .then(([ofr, cur]) => { setOfferings(ofr.data); setCurriculum(cur.data); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleCreate = async () => {
    setError("");
    if (!form.curriculumId || !form.academicTerm) {
      return setError(t("myOfferings.modal.requiredFields"));
    }
    setSaving(true);
    try {
      const res = await instructorApi.post("/offerings", {
        curriculumId: parseInt(form.curriculumId),
        academicTerm: form.academicTerm,
        day: form.day || null,
        startTime: form.startTime || null,
        endTime: form.endTime || null,
        room: form.room || null,
      });
      setOfferings((prev) => [res.data, ...prev]);
      setModal(false);
      setForm({ curriculumId: "", academicTerm: "2025-2026 Bahar", day: "", startTime: "", endTime: "", room: "" });
      showToast(t("myOfferings.toast.opened"));
    } catch (err) {
      setError(err.response?.data?.message || t("common.error"));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm(t("myOfferings.confirm.delete"))) return;
    try {
      await instructorApi.delete(`/offerings/${id}`);
      setOfferings((prev) => prev.filter((o) => o.id !== id));
      showToast(t("myOfferings.toast.deleted"));
    } catch (err) {
      showToast(err.response?.data?.message || t("common.error"));
    }
  };

  const groupedCurriculum = curriculum.reduce((acc, c) => {
    const key = `${c.year}. — ${c.semester}`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(c);
    return acc;
  }, {});

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
            <li onClick={() => navigate("/instructor/dashboard")}><LayoutDashboard size={15} /> {t("instructorDashboard.title")}</li>
            <li className="active"><BookOpen size={15} /> {t("myOfferings.title")}</li>
            <li onClick={() => navigate("/instructor/announcements")}><Megaphone size={15} /> {t("announcements.title")}</li>
          </ul>
        </div>
        <div className="inst-sidebar-footer">
          <div className="inst-sidebar-user">
            <div style={{ position: "relative", cursor: "pointer", flexShrink: 0 }} onClick={() => fileInputRef.current?.click()}>
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
            <h1>{t("myOfferings.title")}</h1>
            <p>{offerings.length} {t("myOfferings.openCourses")}</p>
          </div>
          <div className="inst-topbar-right">
            <ThemeToggle variant="instructor" />
            <LanguageToggle variant="instructor" />
            <button className="inst-btn-primary" onClick={() => setModal(true)}>
              <Plus size={14} /> {t("myOfferings.openNew")}
            </button>
            <button className="inst-logout-btn" onClick={handleLogout}>
              <LogOut size={14} /> {t("common.logout")}
            </button>
          </div>
        </div>

        <div className="inst-content">
          {loading ? (
            <p style={{ color: "#7c8591", fontSize: 14 }}>{t("common.loading")}</p>
          ) : offerings.length === 0 ? (
            <div className="inst-empty">
              <BookOpen size={40} />
              <p>{t("myOfferings.noOfferings")}</p>
              <button className="inst-btn-primary" style={{ margin: "12px auto 0" }} onClick={() => setModal(true)}>
                <Plus size={14} /> {t("myOfferings.openFirst")}
              </button>
            </div>
          ) : (
            <div className="inst-offering-grid">
              {offerings.map((o) => (
                <div className="inst-offering-card" key={o.id} onClick={() => navigate(`/instructor/offerings/${o.id}`)}>
                  <div className="inst-offering-card-header">
                    <span className="inst-offering-card-code">{o.curriculum?.courseCode}</span>
                    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                      <span className="inst-offering-card-count"><Users size={11} style={{ display: "inline", marginRight: 3 }} />{o.enrolledCount ?? 0} {t("myOfferings.students")}</span>
                      {(o.pendingCount ?? 0) > 0 && (
                        <span style={{ fontSize: 11, background: "#fef3c7", color: "#d97706", borderRadius: 10, padding: "2px 7px", fontWeight: 700 }}>
                          {o.pendingCount} {t("myOfferings.pendingRequests")}
                        </span>
                      )}
                    </div>
                  </div>
                  <p className="inst-offering-card-name">
                    {language === "en" ? (o.curriculum?.courseNameEn || o.curriculum?.courseName) : o.curriculum?.courseName}
                  </p>
                  <div className="inst-offering-card-meta">
                    {o.day && <span><Clock size={11} /> {translateDay(o.day, language)} {o.startTime && `${o.startTime}–${o.endTime}`}</span>}
                    {o.room && <span><MapPin size={11} /> {o.room}</span>}
                    <span style={{ color: "#94a3b8" }}>{o.curriculum?.credits} {t("common.credits")} · {o.curriculum?.year}. {translateTerm(o.curriculum?.semester, language)}</span>
                  </div>
                  <div className="inst-offering-card-footer">
                    <span className="inst-offering-card-term">{translateTerm(o.academicTerm, language)}</span>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button className="inst-btn-danger" onClick={(e) => handleDelete(o.id, e)}>
                        <Trash2 size={12} />
                      </button>
                      <button className="inst-detail-btn">
                        {t("common.view")} <ChevronRight size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* New Offering Modal */}
      {modal && (
        <div className="inst-modal-overlay" onClick={(e) => e.target === e.currentTarget && setModal(false)}>
          <div className="inst-modal">
            <div className="inst-modal-header">
              <p className="inst-modal-title">{t("myOfferings.modal.title")}</p>
              <button className="inst-modal-close" onClick={() => setModal(false)}><X size={14} /></button>
            </div>
            <div className="inst-modal-body">
              <div className="inst-modal-field">
                <label>{t("myOfferings.modal.selectCourse")}</label>
                <select value={form.curriculumId} onChange={set("curriculumId")}>
                  <option value="">{t("myOfferings.modal.selectPlaceholder")}</option>
                  {Object.entries(groupedCurriculum).map(([group, courses]) => (
                    <optgroup label={group} key={group}>
                      {courses.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.courseCode} — {c.courseName} ({c.credits} {t("common.credits")}, {c.type})
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>

              <div className="inst-modal-field">
                <label>{t("myOfferings.modal.term")}</label>
                <input type="text" value={form.academicTerm} onChange={set("academicTerm")} placeholder="2025-2026 Bahar" />
              </div>

              <div className="inst-modal-field-row">
                <div className="inst-modal-field">
                  <label>{t("myOfferings.modal.day")}</label>
                  <select value={form.day} onChange={set("day")}>
                    <option value="">{t("myOfferings.modal.selectDay")}</option>
                    {DAYS.map((d) => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div className="inst-modal-field">
                  <label>{t("myOfferings.modal.room")}</label>
                  <input type="text" value={form.room} onChange={set("room")} placeholder="B-201" />
                </div>
              </div>

              <div className="inst-modal-field-row">
                <div className="inst-modal-field">
                  <label>{t("myOfferings.modal.startTime")}</label>
                  <input type="time" value={form.startTime} onChange={set("startTime")} />
                </div>
                <div className="inst-modal-field">
                  <label>{t("myOfferings.modal.endTime")}</label>
                  <input type="time" value={form.endTime} onChange={set("endTime")} />
                </div>
              </div>

              {error && <p style={{ fontSize: 13, color: "#e24b4a", background: "#fef2f2", padding: "10px 14px", borderRadius: 8 }}>{error}</p>}
            </div>
            <div className="inst-modal-footer">
              <button className="inst-btn-secondary" onClick={() => setModal(false)}>{t("myOfferings.modal.cancel")}</button>
              <button className="inst-btn-primary" onClick={handleCreate} disabled={saving}>
                {saving ? t("myOfferings.modal.opening") : <><Plus size={13} /> {t("myOfferings.modal.open")}</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && <div className="inst-toast">{toast}</div>}
      <InstructorChatWidget />
    </div>
  );
}
