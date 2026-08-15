import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  LayoutDashboard, BookOpen, FileText, Calendar,
  GraduationCap, Activity, PlusCircle, Library,
  Sparkles, Send, Lightbulb, Megaphone, RefreshCw,
} from "lucide-react";
import api from "../api";
import { getUser, getToken } from "../auth";
import "../styles/CourseSelection.css";      // layout + sidebar
import "../styles/CourseRecommendation.css"; // page-specific
import TopbarPanels from "../components/TopbarPanels";
import ChatWidget from "../components/ChatWidget";
import { useLanguage } from "../context/LanguageContext";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

const PRIORITY_LABEL = { high: "courseRec.priorityHigh", medium: "courseRec.priorityMedium", low: "courseRec.priorityLow" };

export default function CourseRecommendation() {
  const navigate  = useNavigate();
  const user      = getUser();
  const { t, language }    = useLanguage();

  const initials = user?.name
    ? user.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : "ST";

  // ── Recommendation state ─────────────────────────────────────────────────
  const [recs, setRecs]           = useState(null); // null = not yet fetched
  const [advice, setAdvice]       = useState("");
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState("");

  const fetchRecommendations = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.post("/chat/recommend-courses");
      setRecs(res.data.recommendations ?? []);
      setAdvice(res.data.generalAdvice ?? "");
    } catch (err) {
      setError(err.response?.data?.message || t("common.error"));
      setRecs([]);
    } finally {
      setLoading(false);
    }
  };

  // ── Mini-chat state ───────────────────────────────────────────────────────
  const [chatMsgs, setChatMsgs]   = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef                = useRef(null);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [chatMsgs, chatLoading]);

  const sendChat = async (text) => {
    const trimmed = (text || chatInput).trim();
    if (!trimmed || chatLoading) return;
    setChatInput("");

    const recsContext = recs && recs.length > 0
      ? `AI tarafından şu dersler önerildi: ${recs.map((r) => `${r.courseCode} ${r.courseName}`).join(", ")}. Genel tavsiye: ${advice}`
      : "";

    const systemForChat = `Sen bir akademik danışman yapay zekasısın. Öğrenci ${user?.name ?? ""} için ders tavsiyesi sohbeti yapıyorsun. ${recsContext} Türkçe veya İngilizce cevap ver.`;

    const history = [...chatMsgs, { role: "user", content: trimmed }].map(({ role, content }) => ({ role, content }));
    setChatMsgs((prev) => [...prev, { role: "user", content: trimmed }]);
    setChatLoading(true);

    try {
      const token = getToken();
      const res = await fetch(`${API_URL}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ messages: history, system: systemForChat }),
      });
      const data = await res.json();
      const reply = data.content?.[0]?.text || data.message || t("common.error");
      setChatMsgs((prev) => [...prev, { role: "assistant", content: reply }]);
    } catch {
      setChatMsgs((prev) => [...prev, { role: "assistant", content: t("common.error") }]);
    } finally {
      setChatLoading(false);
    }
  };

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
            <li onClick={() => navigate("/curriculum")}><Library size={16} /> {t("nav.curriculum")}</li>
            <li onClick={() => navigate("/forms")}><FileText size={16} /> {t("nav.forms")}</li>
            <li onClick={() => navigate("/schedule")}><Calendar size={16} /> {t("nav.schedule")}</li>
            <li onClick={() => navigate("/transcript")}><GraduationCap size={16} /> {t("nav.transcript")}</li>
            <li onClick={() => navigate("/attendance")}><Activity size={16} /> {t("nav.attendance")}</li>
            <li onClick={() => navigate("/announcements")}><Megaphone size={16} /> {t("nav.announcements")}</li>
            <li className="active"><Sparkles size={16} /> {t("nav.courseRecommendation")}</li>
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
            <h1>{t("courseRec.title")}</h1>
            <p>{t("courseRec.subtitle")}</p>
          </div>
          <div className="topbar-right">
            <TopbarPanels />
          </div>
        </div>

        <div className="content">
          {/* Hero banner */}
          <div className="cr-hero">
            <div className="cr-hero-left">
              <p className="cr-hero-title">
                <Sparkles size={20} color="#4f7aff" /> {t("courseRec.title")}
              </p>
              <p className="cr-hero-sub">{t("courseRec.heroDesc")}</p>
            </div>
            <button
              className="cr-get-btn"
              onClick={fetchRecommendations}
              disabled={loading}
            >
              {loading ? (
                <><RefreshCw size={15} style={{ animation: "crSpin 0.8s linear infinite" }} /> {t("courseRec.loading")}</>
              ) : recs !== null ? (
                <><RefreshCw size={15} /> {t("courseRec.refresh")}</>
              ) : (
                <><Sparkles size={15} /> {t("courseRec.getBtn")}</>
              )}
            </button>
          </div>

          {/* Content area */}
          {loading ? (
            <div className="cr-loading">
              <div className="cr-spinner" />
              <p className="cr-loading-text">{t("courseRec.loadingDetail")}</p>
            </div>
          ) : error ? (
            <div className="cr-empty">
              <Sparkles size={40} />
              <p style={{ color: "#e24b4a", marginTop: 8 }}>{error}</p>
            </div>
          ) : recs === null ? (
            <div className="cr-empty">
              <Sparkles size={44} />
              <p>{t("courseRec.emptyHint")}</p>
            </div>
          ) : recs.length === 0 ? (
            <div className="cr-empty">
              <Sparkles size={44} />
              <p>{t("courseRec.noRecs")}</p>
            </div>
          ) : (
            <>
              {/* Recommendation cards */}
              <p className="cr-section-label">{t("courseRec.recommendations")}</p>
              <div className="cr-cards">
                {recs.map((rec, i) => (
                  <div key={i} className={`cr-card priority-${rec.priority}`}>
                    <div className="cr-card-top">
                      <div>
                        <p className="cr-card-code">{rec.courseCode}</p>
                        <p className="cr-card-name">{language === "en" ? (rec.courseNameEn || rec.courseName) : rec.courseName}</p>
                      </div>
                      <span className={`cr-priority-badge ${rec.priority}`}>
                        {t(PRIORITY_LABEL[rec.priority] ?? "courseRec.priorityMedium")}
                      </span>
                    </div>
                    <p className="cr-card-credits">{rec.credits} {t("common.credits")}</p>
                    <p className="cr-card-reason">{rec.reason}</p>
                  </div>
                ))}
              </div>

              {/* General advice */}
              {advice && (
                <>
                  <p className="cr-section-label">{t("courseRec.generalAdvice")}</p>
                  <div className="cr-advice">
                    <p className="cr-advice-title"><Lightbulb size={14} /> {t("courseRec.generalAdvice")}</p>
                    <p className="cr-advice-text">{advice}</p>
                  </div>
                </>
              )}
            </>
          )}

          {/* Mini-chat (always visible) */}
          <div className="cr-chat-section">
            <div className="cr-chat-header">
              <Sparkles size={14} color="#4f7aff" />
              <p className="cr-chat-header-title">{t("courseRec.chatTitle")}</p>
            </div>

            <div className="cr-chat-messages">
              {chatMsgs.length === 0 && (
                <p style={{ fontSize: 12, color: "#94a3b8", textAlign: "center", padding: "12px 0" }}>
                  {t("courseRec.chatHint")}
                </p>
              )}
              {chatMsgs.map((m, i) => (
                <div key={i} className={`cr-chat-msg ${m.role}`}>
                  <div className="cr-chat-avatar">
                    {m.role === "assistant" ? (
                      <svg viewBox="0 0 24 24" width="12" height="12" style={{ fill: "white" }}>
                        <path d="M12 3L1 9l11 6 9-4.91V17h2V9L12 3z" />
                      </svg>
                    ) : initials}
                  </div>
                  <div className="cr-chat-bubble">{m.content}</div>
                </div>
              ))}
              {chatLoading && (
                <div className="cr-chat-msg assistant">
                  <div className="cr-chat-avatar">
                    <svg viewBox="0 0 24 24" width="12" height="12" style={{ fill: "white" }}>
                      <path d="M12 3L1 9l11 6 9-4.91V17h2V9L12 3z" />
                    </svg>
                  </div>
                  <div className="cr-chat-typing">
                    <div className="cr-dot" /><div className="cr-dot" /><div className="cr-dot" />
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            <div className="cr-chat-input-row">
              <input
                className="cr-chat-input"
                placeholder={t("courseRec.chatPlaceholder")}
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendChat()}
                disabled={chatLoading}
              />
              <button className="cr-chat-send" onClick={() => sendChat()} disabled={!chatInput.trim() || chatLoading}>
                <Send size={15} />
              </button>
            </div>
          </div>
        </div>
      </div>

      <ChatWidget />
    </div>
  );
}
