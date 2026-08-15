import { useState, useRef, useEffect } from "react";
import { Send, Trash2, Sparkles, X, MessageSquare, Paperclip } from "lucide-react";
import { getInstructor, getInstructorToken } from "../instructorAuth";
import "./InstructorChatWidget.css";
import { useLanguage } from "../context/LanguageContext";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

const SYSTEM_PROMPT = `You are a helpful assistant for university instructors. Help with course management, grading policies, student performance analysis, and academic processes. You are knowledgeable about university systems, LMS platforms, academic integrity, grade disputes, attendance policies, curriculum design, and best teaching practices. Be professional, concise, and helpful. Always respond in the same language the instructor uses.`;

function formatTime(date) {
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function InstructorChatWidget() {
  const instructor = getInstructor();
  const { t } = useLanguage();

  const SUGGESTIONS = [
    t("instructorChat.suggestions.0"),
    t("instructorChat.suggestions.1"),
    t("instructorChat.suggestions.2"),
    t("instructorChat.suggestions.3"),
  ];

  const initials = instructor?.fullName
    ? instructor.fullName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : "HO";

  const [open, setOpen]                 = useState(false);
  const [input, setInput]               = useState("");
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState(null);
  const [messages, setMessages]         = useState([]);
  const [showSuggestions, setShowSugg]  = useState(true);
  const [attachedPdf, setAttachedPdf]   = useState(null); // File | null

  const messagesEndRef = useRef(null);
  const textareaRef    = useRef(null);
  const pdfInputRef    = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const handleInputChange = (e) => {
    setInput(e.target.value);
    const ta = textareaRef.current;
    if (ta) {
      ta.style.height = "auto";
      ta.style.height = Math.min(ta.scrollHeight, 120) + "px";
    }
  };

  const handlePdfSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) setAttachedPdf(file);
    e.target.value = "";
  };

  const removePdf = () => setAttachedPdf(null);

  const sendMessage = async (text) => {
    const trimmed = (text || input).trim();
    if ((!trimmed && !attachedPdf) || loading) return;

    setShowSugg(false);
    setError(null);
    setInput("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";

    // Compose the user-visible message label
    const displayContent = attachedPdf
      ? (trimmed ? `${trimmed} 📎 ${attachedPdf.name}` : `📎 ${attachedPdf.name}`)
      : trimmed;

    const userMsg = { role: "user", content: displayContent, time: new Date() };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    const pdfToSend = attachedPdf;
    setAttachedPdf(null);

    try {
      const token = getInstructorToken();
      let assistantText;

      if (pdfToSend) {
        // ── PDF path: multipart/form-data ──────────────────────────────────
        const fd = new FormData();
        fd.append("pdf", pdfToSend);
        if (trimmed) fd.append("message", trimmed);

        const res = await fetch(`${API_URL}/api/instructor/chat/upload-announce`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: fd,
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.message || `Server error: ${res.status}`);
        }

        const data = await res.json();
        assistantText = data.content?.[0]?.text || data.message || t("common.error");

      } else {
        // ── Text path: normal JSON chat ────────────────────────────────────
        const history = [...messages, userMsg].map(({ role, content }) => ({ role, content }));

        const res = await fetch(`${API_URL}/api/instructor/chat`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ messages: history, system: SYSTEM_PROMPT }),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.message || `Server error: ${res.status}`);
        }

        const data = await res.json();
        assistantText = data.content?.[0]?.text || data.message || data.reply || t("instructorChat.placeholder");
      }

      setMessages((prev) => [...prev, { role: "assistant", content: assistantText, time: new Date() }]);
    } catch (err) {
      setError(err.message || t("common.error"));
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const clearChat = () => {
    setMessages([]);
    setShowSugg(true);
    setError(null);
    setAttachedPdf(null);
  };

  const canSend = (input.trim() || attachedPdf) && !loading;

  return (
    <div className="icw-container">
      {open && (
        <div className="icw-panel">
          {/* Header */}
          <div className="icw-header">
            <div className="icw-header-left">
              <div className="icw-header-avatar">
                <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 3L1 9l11 6 9-4.91V17h2V9L12 3zM5 13.18v4L12 21l7-3.82v-4L12 17l-7-3.82z" />
                </svg>
              </div>
              <div>
                <p className="icw-title">{t("instructorChat.title")}</p>
                <p className="icw-status">{t("instructorChat.aiPowered")}</p>
              </div>
            </div>
            <div className="icw-header-right">
              {messages.length > 0 && (
                <button className="icw-btn" onClick={clearChat}><Trash2 size={14} /></button>
              )}
              <button className="icw-btn" onClick={() => setOpen(false)}><X size={14} /></button>
            </div>
          </div>

          {/* Messages */}
          <div className="icw-messages">
            <div className="icw-intro">
              <Sparkles size={15} />
              <div>
                <p className="icw-intro-title">{t("chat.introTitle")}</p>
                <p className="icw-intro-text">{t("chat.introText")}</p>
              </div>
            </div>

            {showSuggestions && messages.length === 0 && (
              <div className="icw-suggestions">
                <p className="icw-suggestions-label">{t("instructorChat.suggestionsLabel")}</p>
                {SUGGESTIONS.map((s) => (
                  <button key={s} className="icw-suggestion-btn" onClick={() => sendMessage(s)}>
                    {s}
                  </button>
                ))}
              </div>
            )}

            {messages.map((msg, i) => (
              <div key={i} className={`icw-msg ${msg.role}`}>
                <div className="icw-msg-avatar">
                  {msg.role === "assistant" ? (
                    <svg viewBox="0 0 24 24" width="12" height="12" style={{ fill: "white" }}>
                      <path d="M12 3L1 9l11 6 9-4.91V17h2V9L12 3z" />
                    </svg>
                  ) : initials}
                </div>
                <div className="icw-bubble-wrap">
                  <div className="icw-bubble">{msg.content}</div>
                  <div className="icw-time">{formatTime(msg.time)}</div>
                </div>
              </div>
            ))}

            {loading && (
              <div className="icw-typing">
                <div className="icw-msg-avatar" style={{ background: "#1a5c3a" }}>
                  <svg viewBox="0 0 24 24" width="12" height="12" style={{ fill: "white" }}>
                    <path d="M12 3L1 9l11 6 9-4.91V17h2V9L12 3z" />
                  </svg>
                </div>
                <div className="icw-dots"><span /><span /><span /></div>
              </div>
            )}

            {error && <div className="icw-error">⚠ {error}</div>}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="icw-input-area">
            {/* PDF attachment preview */}
            {attachedPdf && (
              <div className="icw-pdf-preview">
                <span className="icw-pdf-name">📎 {attachedPdf.name}</span>
                <button className="icw-pdf-remove" onClick={removePdf} title="Kaldır">
                  <X size={12} />
                </button>
              </div>
            )}

            <div className="icw-input-row">
              {/* Hidden file input */}
              <input
                ref={pdfInputRef}
                type="file"
                accept=".pdf"
                style={{ display: "none" }}
                onChange={handlePdfSelect}
              />

              {/* Paperclip button */}
              <button
                className="icw-attach-btn"
                onClick={() => pdfInputRef.current?.click()}
                title="PDF ekle"
                type="button"
                disabled={loading}
              >
                <Paperclip size={15} />
              </button>

              <textarea
                ref={textareaRef}
                className="icw-input"
                placeholder={attachedPdf ? "Mesaj ekleyin (opsiyonel)…" : t("instructorChat.placeholder")}
                value={input}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                rows={1}
              />
              <button
                className="icw-send-btn"
                onClick={() => sendMessage()}
                disabled={!canSend}
                title="Send (Enter)"
              >
                <Send size={16} />
              </button>
            </div>
            <p className="icw-hint">{t("instructorChat.hint")}</p>
          </div>
        </div>
      )}

      {/* FAB */}
      <button
        className={`icw-fab ${open ? "active" : ""}`}
        onClick={() => setOpen((o) => !o)}
        title="AI Assistant"
      >
        {open ? <X size={22} /> : <MessageSquare size={22} />}
        {!open && messages.length > 0 && (
          <span className="icw-fab-badge">{messages.filter((m) => m.role === "assistant").length}</span>
        )}
      </button>
    </div>
  );
}
