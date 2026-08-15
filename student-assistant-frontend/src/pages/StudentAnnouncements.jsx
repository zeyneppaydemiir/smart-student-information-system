import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  LayoutDashboard, BookOpen, FileText, Calendar,
  GraduationCap, Activity, PlusCircle, Library,
  Megaphone, MessageSquare, Download, CheckCheck, Bell, Sparkles,
} from "lucide-react";
import api from "../api";
import { getUser } from "../auth";
import { getToken } from "../auth";
import "../styles/CourseSelection.css";
import "../styles/Announcements.css";
import TopbarPanels from "../components/TopbarPanels";
import ChatWidget from "../components/ChatWidget";
import { useLanguage } from "../context/LanguageContext";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

export default function StudentAnnouncements() {
  const navigate = useNavigate();
  const user = getUser();
  const { t } = useLanguage();

  const initials = user?.name
    ? user.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : "ST";

  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchAnnouncements = useCallback(() => {
    api.get("/announcements/my")
      .then((res) => setAnnouncements(res.data.announcements ?? []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchAnnouncements(); }, [fetchAnnouncements]);

  const markRead = async (id) => {
    try {
      await api.post(`/announcements/${id}/read`);
      setAnnouncements((prev) => prev.map((a) => a.id === id ? { ...a, isRead: true } : a));
    } catch { /* ignore */ }
  };

  const handleDownload = async (ann) => {
    setDownloadingId(ann.id);
    try {
      const token = getToken();
      const res = await fetch(`${API_URL}/api/announcements/${ann.id}/download`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("İndirme başarısız");

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = ann.fileName || "document.pdf";
      a.click();
      window.URL.revokeObjectURL(url);

      // Mark as read after download
      setAnnouncements((prev) => prev.map((x) => x.id === ann.id ? { ...x, isRead: true } : x));
    } catch (err) {
      showToast(err.message || "İndirme hatası", "error");
    } finally {
      setDownloadingId(null);
    }
  };

  const markAllRead = async () => {
    const unread = announcements.filter((a) => !a.isRead);
    await Promise.allSettled(unread.map((a) => api.post(`/announcements/${a.id}/read`)));
    setAnnouncements((prev) => prev.map((a) => ({ ...a, isRead: true })));
    showToast(t("announcements.allMarkedRead"));
  };

  const unreadCount = announcements.filter((a) => !a.isRead).length;

  // Group by course
  const grouped = announcements.reduce((acc, ann) => {
    const key = `${ann.courseCode} — ${ann.courseName}`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(ann);
    return acc;
  }, {});

  const formatDate = (d) =>
    new Date(d).toLocaleDateString("tr-TR", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

  return (
    <div className="layout">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="sidebar-brand-icon">
            <svg viewBox="0 0 24 24">
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
            <li onClick={() => navigate("/curriculum")}><Library size={16} /> {t("nav.curriculum")}</li>
            <li onClick={() => navigate("/forms")}><FileText size={16} /> {t("nav.forms")}</li>
            <li onClick={() => navigate("/schedule")}><Calendar size={16} /> {t("nav.schedule")}</li>
            <li onClick={() => navigate("/transcript")}><GraduationCap size={16} /> {t("nav.transcript")}</li>
            <li onClick={() => navigate("/attendance")}><Activity size={16} /> {t("nav.attendance")}</li>
            <li className="active" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <Megaphone size={16} /> {t("nav.announcements")}
              </span>
              {unreadCount > 0 && (
                <span style={{ background: "#e24b4a", color: "#fff", borderRadius: 10, fontSize: 10, fontWeight: 700, padding: "1px 6px" }}>
                  {unreadCount}
                </span>
              )}
            </li>
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

      {/* Main */}
      <div className="main">
        <div className="topbar">
          <div className="topbar-left">
            <h1>{t("announcements.student.title")}</h1>
            <p>
              {unreadCount > 0
                ? `${unreadCount} ${t("announcements.student.unread")}`
                : t("announcements.student.allRead")}
            </p>
          </div>
          <div className="topbar-right">
            <TopbarPanels />
          </div>
        </div>

        <div className="san-content">
          {/* Header row */}
          <div className="san-header-row">
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Bell size={16} style={{ color: "#4f7aff" }} />
              <span style={{ fontSize: 14, fontWeight: 600, color: "#1a1f2e" }}>
                {announcements.length} {t("announcements.total")}
              </span>
            </div>
            {unreadCount > 0 && (
              <button className="san-mark-all-btn" onClick={markAllRead}>
                <CheckCheck size={13} /> {t("announcements.student.markAllRead")}
              </button>
            )}
          </div>

          {loading ? (
            <p style={{ color: "#94a3b8", fontSize: 13, textAlign: "center", padding: "40px 0" }}>
              {t("common.loading")}
            </p>
          ) : announcements.length === 0 ? (
            <div className="san-empty">
              <Megaphone size={44} />
              <p>{t("announcements.student.empty")}</p>
            </div>
          ) : (
            Object.entries(grouped).map(([course, items]) => (
              <div key={course}>
                <p className="san-group-label">{course}</p>
                {items.map((ann) => (
                  <div
                    key={ann.id}
                    className={`san-card ${!ann.isRead ? "unread" : ""}`}
                    onClick={() => {
                      if (ann.type === "message" && !ann.isRead) markRead(ann.id);
                    }}
                  >
                    <div className={`san-card-icon ${ann.type === "pdf" ? "pdf" : "msg"}`}>
                      {ann.type === "pdf" ? <FileText size={17} /> : <MessageSquare size={17} />}
                    </div>

                    <div className="san-card-body">
                      <div className="san-card-header">
                        <span className="san-card-title">{ann.title}</span>
                        {!ann.isRead && <span className="san-unread-dot" />}
                        <span className={`san-badge ${ann.type === "pdf" ? "pdf" : "msg"}`}>
                          {ann.type === "pdf" ? "PDF" : t("announcements.typeMessage")}
                        </span>
                      </div>

                      {ann.type === "message" && ann.content && (
                        <div className="san-content-text">{ann.content}</div>
                      )}

                      <p className="san-date">{formatDate(ann.createdAt)}</p>
                    </div>

                    {ann.type === "pdf" && (
                      <button
                        className="san-download-btn"
                        onClick={(e) => { e.stopPropagation(); handleDownload(ann); }}
                        disabled={downloadingId === ann.id}
                      >
                        <Download size={13} />
                        {downloadingId === ann.id ? t("announcements.student.downloading") : t("announcements.student.download")}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ))
          )}
        </div>
      </div>

      {toast && (
        <div className={`cs-toast ${toast.type === "error" ? "error" : "success"}`}>{toast.msg}</div>
      )}
      <ChatWidget />
    </div>
  );
}
