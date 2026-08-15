import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { logout, getUser, login } from "../auth";
import {
  Bell, User, X, CheckCheck,
  Megaphone, AlertCircle, Info, Calendar, BookOpen,
  LogOut, Mail, MapPin, Award, Clock, Camera,
} from "lucide-react";
import ThemeToggle from "./ThemeToggle";
import LanguageToggle from "./LanguageToggle";
import { useLanguage } from "../context/LanguageContext";
import "./TopbarPanels.css";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

/* ── Notification data ── */
const NOTIFICATIONS = [
  {
    id: 1,
    type: "announcement",
    icon: Megaphone,
    color: "blue",
    title: "Spring 2026 Exam Schedule Published",
    body: "The final exam schedule for Spring 2026 has been published. Please check the academic calendar for your exam dates and rooms.",
    time: "2 hours ago",
    read: false,
  },
  {
    id: 2,
    type: "deadline",
    icon: AlertCircle,
    color: "red",
    title: "Add/Drop Deadline Approaching",
    body: "The course add/drop period ends on May 15, 2026. Make sure to finalize your course selections before the deadline.",
    time: "5 hours ago",
    read: false,
  },
  {
    id: 3,
    type: "info",
    icon: Info,
    color: "amber",
    title: "Advisor Appointment Reminder",
    body: "Your scheduled meeting with Dr. R. Wilson is tomorrow at 14:00 in room B-201. Please be on time.",
    time: "1 day ago",
    read: false,
  },
  {
    id: 4,
    type: "event",
    icon: Calendar,
    color: "green",
    title: "Career Fair — May 20, 2026",
    body: "The annual university career fair will be held in the main campus sports hall. Over 80 companies will be attending. Don't miss it!",
    time: "2 days ago",
    read: true,
  },
  {
    id: 5,
    type: "academic",
    icon: BookOpen,
    color: "purple",
    title: "Midterm Grades Released",
    body: "Midterm grades for CS-301 Database Systems have been entered by your instructor. You can view them in your transcript.",
    time: "3 days ago",
    read: true,
  },
  {
    id: 6,
    type: "info",
    icon: Info,
    color: "sky",
    title: "Library Hours Extended",
    body: "During the exam period (May 20 – June 10), the university library will be open until 24:00 on weekdays.",
    time: "4 days ago",
    read: true,
  },
];

const COLOR_MAP = {
  blue:   { bg: "#eff4ff", color: "#4f7aff" },
  red:    { bg: "#fef2f2", color: "#e24b4a" },
  amber:  { bg: "#fffbeb", color: "#d97706" },
  green:  { bg: "#f0fdf4", color: "#16a34a" },
  purple: { bg: "#f5f3ff", color: "#7c3aed" },
  sky:    { bg: "#f0f9ff", color: "#0ea5e9" },
};

/* ── Close on outside click hook ── */
function useOutsideClick(ref, handler) {
  useEffect(() => {
    const listener = (e) => {
      if (!ref.current || ref.current.contains(e.target)) return;
      handler();
    };
    document.addEventListener("mousedown", listener);
    return () => document.removeEventListener("mousedown", listener);
  }, [ref, handler]);
}

/* ══════════════════════════════════════
   NOTIFICATION PANEL
══════════════════════════════════════ */
function NotificationPanel({ onClose }) {
  const { t } = useLanguage();
  const [notifs, setNotifs] = useState(NOTIFICATIONS);
  const unreadCount = notifs.filter((n) => !n.read).length;

  const markAllRead = () => setNotifs((n) => n.map((x) => ({ ...x, read: true })));
  const markRead = (id) => setNotifs((n) => n.map((x) => x.id === id ? { ...x, read: true } : x));

  return (
    <div className="tp-panel">
      <div className="tp-panel-header">
        <div>
          <p className="tp-panel-title">{t("topbar.notifications")}</p>
          <p className="tp-panel-sub">
            {unreadCount > 0 ? `${unreadCount} ${t("topbar.unread")}` : t("topbar.allRead")}
          </p>
        </div>
        <div className="tp-panel-header-right">
          {unreadCount > 0 && (
            <button className="tp-text-btn" onClick={markAllRead} title={t("topbar.markAllRead")}>
              <CheckCheck size={14} /> {t("topbar.markAllRead")}
            </button>
          )}
          <button className="tp-icon-btn" onClick={onClose}><X size={15} /></button>
        </div>
      </div>

      <div className="tp-panel-body">
        {notifs.map((n) => {
          const style = COLOR_MAP[n.color];
          return (
            <div
              key={n.id}
              className={`notif-item ${n.read ? "read" : "unread"}`}
              onClick={() => markRead(n.id)}
            >
              <div className="notif-icon" style={{ background: style.bg, color: style.color }}>
                <n.icon size={16} />
              </div>
              <div className="notif-body">
                <div className="notif-title-row">
                  <p className="notif-title">{n.title}</p>
                  {!n.read && <span className="notif-dot" />}
                </div>
                <p className="notif-text">{n.body}</p>
                <p className="notif-time">{n.time}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════
   PROFILE PANEL
══════════════════════════════════════ */
function ProfilePanel({ onClose }) {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [user, setUser] = useState(getUser());
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const fileInputRef = useRef(null);

  const initials = user?.name
    ? user.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : "ST";

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const handleAvatarClick = () => fileInputRef.current?.click();

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadError(null);
    const formData = new FormData();
    formData.append("photo", file);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_URL}/api/upload/profile-picture`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Upload failed");
      }
      const data = await res.json();
      const updated = { ...user, profilePicture: data.profilePicture };
      login(token, updated);
      setUser(updated);
    } catch (err) {
      setUploadError(err.message);
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const picUrl = user?.profilePicture ? `${API_URL}${user.profilePicture}` : null;

  return (
    <div className="tp-panel profile-panel">
      {/* Header */}
      <div className="tp-panel-header">
        <p className="tp-panel-title">{t("topbar.myProfile")}</p>
        <button className="tp-icon-btn" onClick={onClose}><X size={15} /></button>
      </div>

      {/* Avatar section */}
      <div className="profile-hero">
        <div className="profile-hero-bg" />
        <div className="profile-avatar-wrap" style={{ position: "relative", cursor: "pointer" }} onClick={handleAvatarClick} title={t("topbar.changePhoto")}>
          {picUrl ? (
            <img
              src={picUrl}
              alt="Profile"
              style={{ width: 68, height: 68, borderRadius: "50%", objectFit: "cover", border: "3px solid #fff", boxShadow: "0 2px 8px rgba(0,0,0,0.15)" }}
            />
          ) : (
            <div className="profile-avatar">{initials}</div>
          )}
          <div style={{
            position: "absolute", bottom: 0, right: 0,
            width: 22, height: 22, borderRadius: "50%",
            background: "#4f7aff", display: "flex", alignItems: "center",
            justifyContent: "center", border: "2px solid #fff",
          }}>
            {uploading ? (
              <div style={{ width: 10, height: 10, border: "2px solid #fff", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
            ) : (
              <Camera size={11} color="#fff" />
            )}
          </div>
          <div className="profile-online-dot" />
        </div>
        <input ref={fileInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleFileChange} />
        <p className="profile-name">{user?.name ?? "Student"}</p>
        <p className="profile-id">Student ID: {user?.studentNumber ?? "—"}</p>
        {uploadError && <p style={{ fontSize: 11, color: "#e24b4a", marginTop: 4 }}>{uploadError}</p>}
        <span className="profile-status-chip">{t("topbar.active")}</span>
      </div>

      {/* Info rows */}
      <div className="tp-panel-body" style={{ padding: "0" }}>
        <div className="profile-section">
          <p className="profile-section-label">{t("topbar.academicInfo")}</p>
          <div className="profile-info-rows">
            <div className="profile-info-row">
              <div className="profile-info-icon" style={{ background: "#eff4ff", color: "#4f7aff" }}>
                <BookOpen size={13} />
              </div>
              <div>
                <p className="profile-info-label">{t("topbar.program")}</p>
                <p className="profile-info-value">{user?.program ?? "—"}</p>
              </div>
            </div>
            <div className="profile-info-row">
              <div className="profile-info-icon" style={{ background: "#f0fdf4", color: "#16a34a" }}>
                <Award size={13} />
              </div>
              <div>
                <p className="profile-info-label">{t("topbar.department")}</p>
                <p className="profile-info-value">{user?.department ?? "—"}</p>
              </div>
            </div>
            <div className="profile-info-row">
              <div className="profile-info-icon" style={{ background: "#fffbeb", color: "#d97706" }}>
                <User size={13} />
              </div>
              <div>
                <p className="profile-info-label">{t("topbar.advisor")}</p>
                <p className="profile-info-value">{user?.advisor ?? "—"}</p>
              </div>
            </div>
            <div className="profile-info-row">
              <div className="profile-info-icon" style={{ background: "#f0f9ff", color: "#0ea5e9" }}>
                <Clock size={13} />
              </div>
              <div>
                <p className="profile-info-label">{t("common.year")}</p>
                <p className="profile-info-value">
                  {t("topbar.yearOf").replace("{year}", user?.year ?? "—").replace("{total}", user?.totalYears ?? 4)}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="profile-section">
          <p className="profile-section-label">{t("topbar.contact")}</p>
          <div className="profile-info-rows">
            <div className="profile-info-row">
              <div className="profile-info-icon" style={{ background: "#f5f3ff", color: "#7c3aed" }}>
                <Mail size={13} />
              </div>
              <div>
                <p className="profile-info-label">{t("common.email")}</p>
                <p className="profile-info-value">{user?.email ?? "—"}</p>
              </div>
            </div>
            <div className="profile-info-row">
              <div className="profile-info-icon" style={{ background: "#fef2f2", color: "#e24b4a" }}>
                <MapPin size={13} />
              </div>
              <div>
                <p className="profile-info-label">{t("topbar.campus")}</p>
                <p className="profile-info-value">{t("topbar.mainCampus")}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="tp-panel-footer profile-actions">
        <button className="profile-action-btn" onClick={handleAvatarClick} disabled={uploading} style={{ background: "#eff4ff", color: "#4f7aff", border: "none" }}>
          <Camera size={14} /> {uploading ? t("topbar.uploading") : t("topbar.changePhoto")}
        </button>
        <button className="profile-action-btn danger" onClick={handleLogout}>
          <LogOut size={14} /> {t("topbar.signOut")}
        </button>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════
   TOPBAR BUTTONS (exported)
══════════════════════════════════════ */
export default function TopbarPanels() {
  const navigate = useNavigate();
  const [activePanel, setActivePanel] = useState(null); // "profile" | null
  const [currentUser, setCurrentUser] = useState(getUser());
  const [announcementCount, setAnnouncementCount] = useState(0);
  const wrapRef = useRef(null);

  // Refresh user when panel closes to pick up profile picture changes
  useEffect(() => {
    if (!activePanel) setCurrentUser(getUser());
  }, [activePanel]);

  // Poll real unread announcement count every 30 seconds
  const fetchUnreadCount = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) return;
    try {
      const res = await fetch(`${API_URL}/api/announcements/unread-count`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setAnnouncementCount(data.count ?? 0);
      }
    } catch { /* non-critical */ }
  }, []);

  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, [fetchUnreadCount]);

  useOutsideClick(wrapRef, () => setActivePanel(null));

  const toggle = (panel) => setActivePanel((p) => (p === panel ? null : panel));

  const picUrl = currentUser?.profilePicture ? `${API_URL}${currentUser.profilePicture}` : null;

  return (
    <div className="tp-wrap" ref={wrapRef}>
      {/* Theme toggle */}
      <ThemeToggle variant="student" />

      {/* Language toggle */}
      <LanguageToggle variant="student" />

      {/* Announcement bell — navigates to /announcements */}
      <div className="tp-btn-wrap">
        <button
          className="topbar-btn"
          onClick={() => navigate("/announcements")}
          title="Duyurular"
        >
          <Bell size={16} />
        </button>
        {announcementCount > 0 && (
          <span className="tp-badge">{announcementCount}</span>
        )}
      </div>

      {/* Profile button */}
      <button
        className={`topbar-btn ${activePanel === "profile" ? "active" : ""}`}
        onClick={() => toggle("profile")}
        title="My Profile"
        style={{ padding: picUrl ? 0 : undefined, overflow: picUrl ? "hidden" : undefined, borderRadius: picUrl ? "50%" : undefined }}
      >
        {picUrl ? (
          <img src={picUrl} alt="avatar" style={{ width: 32, height: 32, borderRadius: "50%", objectFit: "cover" }} />
        ) : (
          <User size={16} />
        )}
      </button>

      {/* Profile panel only */}
      {activePanel === "profile" && (
        <ProfilePanel onClose={() => setActivePanel(null)} />
      )}
    </div>
  );
}
