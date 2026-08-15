import { useState, useRef, useEffect } from "react";
import { Send, Trash2, Sparkles } from "lucide-react";
import { getUser } from "../auth";
import "./ChatWidget.css";
import { useLanguage } from "../context/LanguageContext";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

const SYSTEM_PROMPT = `You are a friendly and knowledgeable academic assistant for a Student Information System (SIS).
You help students with:
- Course registration, add/drop, and freeze processes
- GPA calculation and academic standing
- Transcript requests and graduation requirements
- Forms and applications (leave of absence, exam excuses, dormitory, etc.)
- Academic calendar, schedules, and deadlines
- General university policies and procedures

Be concise, warm, and helpful. Use short paragraphs. If you don't know a specific university policy, give general guidance and suggest contacting their advisor or registrar's office.
Always respond in the same language the student uses.`;

function formatTime(date) {
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function ChatWidget() {
  const user = getUser();
  const { t } = useLanguage();

  const initials = user?.name
    ? user.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : "ST";

  const SUGGESTIONS = [
    t("chat.suggestions.0"),
    t("chat.suggestions.1"),
    t("chat.suggestions.2"),
    t("chat.suggestions.3"),
  ];

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [messages, setMessages] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(true);

  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

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

  const sendMessage = async (text) => {
    const trimmed = (text || input).trim();
    if (!trimmed || loading) return;

    setShowSuggestions(false);
    setError(null);
    setInput("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";

    const userMsg = { role: "user", content: trimmed, time: new Date() };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setLoading(true);

    try {
      const history = updatedMessages.map(({ role, content }) => ({ role, content }));

      const token = localStorage.getItem("token");
      const res = await fetch(`${API_URL}/api/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({ messages: history, system: SYSTEM_PROMPT }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || `Server error: ${res.status}`);
      }

      const data = await res.json();
      const assistantText =
        data.content?.[0]?.text ||
        data.message ||
        data.reply ||
        t("chat.errorMsg");

      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: assistantText, time: new Date() },
      ]);
    } catch (err) {
      setError(err.message || t("chat.errorMsg"));
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
    setShowSuggestions(true);
    setError(null);
  };

  return (
    <div className="chat-panel">
      {/* Header */}
      <div className="chat-panel-header">
        <div className="cph-left">
          <div className="cph-avatar">
            <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 3L1 9l11 6 9-4.91V17h2V9L12 3zM5 13.18v4L12 21l7-3.82v-4L12 17l-7-3.82z" />
            </svg>
          </div>
          <div>
            <p className="cph-title">{t("chat.title")}</p>
            <p className="cph-status">{t("chat.aiPowered")}</p>
          </div>
        </div>
        <div className="cph-right">
          {messages.length > 0 && (
            <button className="cph-btn" onClick={clearChat}>
              <Trash2 size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="chat-messages">
        {/* Intro */}
        <div className="chat-intro">
          <Sparkles size={16} />
          <div>
            <p className="chat-intro-title">{t("chat.introTitle")}</p>
            <p className="chat-intro-text">{t("chat.introText")}</p>
          </div>
        </div>

        {/* Suggestions */}
        {showSuggestions && messages.length === 0 && (
          <div className="chat-suggestions">
            <p className="chat-suggestions-label">{t("chat.suggestionsLabel")}</p>
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                className="chat-suggestion-btn"
                onClick={() => sendMessage(s)}
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {/* Messages */}
        {messages.map((msg, i) => (
          <div key={i} className={`chat-msg ${msg.role}`}>
            <div className="chat-msg-avatar">
              {msg.role === "assistant" ? (
                <svg viewBox="0 0 24 24" width="12" height="12" style={{ fill: "white" }}>
                  <path d="M12 3L1 9l11 6 9-4.91V17h2V9L12 3z" />
                </svg>
              ) : (
                initials
              )}
            </div>
            <div className="chat-bubble-wrap">
              <div className="chat-bubble">{msg.content}</div>
              <div className="chat-bubble-time">{formatTime(msg.time)}</div>
            </div>
          </div>
        ))}

        {/* Typing */}
        {loading && (
          <div className="chat-typing">
            <div className="chat-msg-avatar" style={{ background: "#1a1f2e" }}>
              <svg viewBox="0 0 24 24" width="12" height="12" style={{ fill: "white" }}>
                <path d="M12 3L1 9l11 6 9-4.91V17h2V9L12 3z" />
              </svg>
            </div>
            <div className="typing-dots">
              <span /><span /><span />
            </div>
          </div>
        )}

        {error && <div className="chat-error">⚠ {error}</div>}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="chat-input-area">
        <div className="chat-input-row">
          <textarea
            ref={textareaRef}
            className="chat-input"
            placeholder={t("chat.placeholder")}
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            rows={1}
          />
          <button
            className="chat-send-btn"
            onClick={() => sendMessage()}
            disabled={!input.trim() || loading}
            title="Send (Enter)"
          >
            <Send size={17} />
          </button>
        </div>
        <p className="chat-input-hint">{t("chat.hint")}</p>
      </div>
    </div>
  );
}
