import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { getInstructor, logoutInstructor, loginInstructor, getInstructorToken } from "../instructorAuth";
import instructorApi from "../instructorApi";
import {
  LayoutDashboard, BookOpen, LogOut, Megaphone,
  FileText, MessageSquare, Trash2, Plus, Camera,
} from "lucide-react";
import "../styles/InstructorLayout.css";
import "../styles/Announcements.css";
import InstructorChatWidget from "../components/InstructorChatWidget";
import ThemeToggle from "../components/ThemeToggle";
import LanguageToggle from "../components/LanguageToggle";
import { useLanguage } from "../context/LanguageContext";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

export default function Announcements() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [instructor, setInstructor] = useState(getInstructor());
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);
  const picUrl = instructor?.profilePicture ? `${API_URL}${instructor.profilePicture}` : null;

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

  const initials = instructor?.fullName
    ? instructor.fullName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : "HO";

  const handleLogout = () => { logoutInstructor(); navigate("/instructor/login"); };

  // ── Data ────────────────────────────────────────────────────────────────────
  const [offerings, setOfferings] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [loadingList, setLoadingList] = useState(true);

  // ── Form state ──────────────────────────────────────────────────────────────
  const [form, setForm] = useState({ offeringId: "", title: "", type: "message", content: "" });
  const [pdfFile, setPdfFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    Promise.all([
      instructorApi.get("/offerings"),
      instructorApi.get("/announcements"),
    ]).then(([offRes, annRes]) => {
      setOfferings(offRes.data);
      setAnnouncements(annRes.data);
    }).catch(console.error)
      .finally(() => setLoadingList(false));
  }, []);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async () => {
    setFormError("");
    if (!form.offeringId) return setFormError("Lütfen bir ders seçin.");
    if (!form.title.trim()) return setFormError("Başlık zorunludur.");
    if (form.type === "message" && !form.content.trim()) return setFormError("Mesaj içeriği zorunludur.");
    if (form.type === "pdf" && !pdfFile) return setFormError("Lütfen bir PDF dosyası seçin.");

    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append("offeringId", form.offeringId);
      fd.append("title", form.title.trim());
      fd.append("type", form.type);
      if (form.type === "message") fd.append("content", form.content.trim());
      if (form.type === "pdf" && pdfFile) fd.append("file", pdfFile);

      const res = await instructorApi.post("/announcements", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      const newAnn = {
        ...res.data,
        courseCode: res.data.offering?.curriculum?.courseCode ?? "",
        courseName: res.data.offering?.curriculum?.courseName ?? "",
        readCount: 0,
      };
      setAnnouncements((prev) => [newAnn, ...prev]);
      setForm({ offeringId: "", title: "", type: "message", content: "" });
      setPdfFile(null);
      showToast("Duyuru yayınlandı!");
    } catch (err) {
      setFormError(err.response?.data?.message || "Bir hata oluştu");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Bu duyuruyu silmek istediğinize emin misiniz?")) return;
    try {
      await instructorApi.delete(`/announcements/${id}`);
      setAnnouncements((prev) => prev.filter((a) => a.id !== id));
      showToast("Duyuru silindi.");
    } catch (err) {
      showToast(err.response?.data?.message || "Silinemedi", "error");
    }
  };

  const formatDate = (d) =>
    new Date(d).toLocaleDateString("tr-TR", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

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
            <li onClick={() => navigate("/instructor/offerings")}><BookOpen size={15} /> {t("myOfferings.title")}</li>
            <li className="active"><Megaphone size={15} /> {t("announcements.title")}</li>
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
              <div style={{ position: "absolute", bottom: -2, right: -2, width: 16, height: 16, borderRadius: "50%", background: "#10b981", display: "flex", alignItems: "center", justifyContent: "center", border: "1.5px solid #0f2e1e" }}>
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
            <h1>{t("announcements.title")}</h1>
            <p>{announcements.length} {t("announcements.total")}</p>
          </div>
          <div className="inst-topbar-right">
            <ThemeToggle variant="instructor" />
            <LanguageToggle variant="instructor" />
            <button className="inst-logout-btn" onClick={handleLogout}><LogOut size={14} /> {t("common.logout")}</button>
          </div>
        </div>

        <div className="ann-layout">
          {/* ── Left: form ── */}
          <div className="ann-form-panel">
            <p className="ann-form-title"><Plus size={15} /> {t("announcements.newTitle")}</p>

            <div className="ann-field">
              <label>{t("announcements.selectCourse")}</label>
              <select value={form.offeringId} onChange={set("offeringId")}>
                <option value="">— {t("announcements.selectCoursePlaceholder")} —</option>
                {offerings.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.curriculum?.courseCode} — {o.curriculum?.courseName}
                  </option>
                ))}
              </select>
            </div>

            <div className="ann-field">
              <label>{t("announcements.titleLabel")}</label>
              <input
                type="text"
                placeholder={t("announcements.titlePlaceholder")}
                value={form.title}
                onChange={set("title")}
              />
            </div>

            <div className="ann-field">
              <label>{t("announcements.typeLabel")}</label>
              <div className="ann-type-toggle">
                <button
                  className={`ann-type-btn ${form.type === "message" ? "active" : ""}`}
                  onClick={() => setForm((f) => ({ ...f, type: "message" }))}
                >
                  <MessageSquare size={13} /> {t("announcements.typeMessage")}
                </button>
                <button
                  className={`ann-type-btn ${form.type === "pdf" ? "active" : ""}`}
                  onClick={() => setForm((f) => ({ ...f, type: "pdf" }))}
                >
                  <FileText size={13} /> PDF
                </button>
              </div>
            </div>

            {form.type === "message" && (
              <div className="ann-field">
                <label>{t("announcements.content")}</label>
                <textarea
                  placeholder={t("announcements.contentPlaceholder")}
                  value={form.content}
                  onChange={set("content")}
                />
              </div>
            )}

            {form.type === "pdf" && (
              <div className="ann-field">
                <label className="ann-file-input-label">
                  <FileText size={14} />
                  {pdfFile ? <span className="ann-file-selected">{pdfFile.name}</span> : t("announcements.choosePdf")}
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={(e) => setPdfFile(e.target.files?.[0] || null)}
                  />
                </label>
              </div>
            )}

            {formError && <div className="ann-error">{formError}</div>}

            <button className="ann-submit-btn" onClick={handleSubmit} disabled={submitting}>
              <Megaphone size={14} /> {submitting ? t("announcements.publishing") : t("announcements.publish")}
            </button>
          </div>

          {/* ── Right: list ── */}
          <div className="ann-list-panel">
            <p className="ann-list-header">{t("announcements.listTitle")}</p>
            <p className="ann-list-sub">{announcements.length} {t("announcements.total")}</p>

            {loadingList ? (
              <p style={{ color: "#94a3b8", fontSize: 13 }}>{t("common.loading")}</p>
            ) : announcements.length === 0 ? (
              <div className="ann-empty">
                <Megaphone size={40} />
                <p>{t("announcements.empty")}</p>
              </div>
            ) : (
              announcements.map((a) => (
                <div className="ann-card" key={a.id}>
                  <div className={`ann-card-icon ${a.type === "pdf" ? "pdf" : "msg"}`}>
                    {a.type === "pdf" ? <FileText size={17} /> : <MessageSquare size={17} />}
                  </div>
                  <div className="ann-card-body">
                    <p className="ann-card-title">{a.title}</p>
                    <p className="ann-card-course">{a.courseCode} — {a.courseName}</p>
                    <div className="ann-card-meta">
                      <span className={`ann-badge ${a.type === "pdf" ? "pdf" : "msg"}`}>
                        {a.type === "pdf" ? "PDF" : t("announcements.typeMessage")}
                      </span>
                      <span className="ann-read-count">{a.readCount} {t("announcements.reads")}</span>
                      <span className="ann-date">{formatDate(a.createdAt)}</span>
                    </div>
                  </div>
                  <button className="ann-delete-btn" onClick={() => handleDelete(a.id)}>
                    <Trash2 size={14} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {toast && <div className={`ann-toast ${toast.type === "error" ? "error" : ""}`}>{toast.msg}</div>}
      <InstructorChatWidget />
    </div>
  );
}
