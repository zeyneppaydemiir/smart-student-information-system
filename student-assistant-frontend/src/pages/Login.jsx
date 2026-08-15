import { useState } from "react";
import { login } from "../auth";
import { useNavigate, Link } from "react-router-dom";
import api from "../api";
import { useLanguage } from "../context/LanguageContext";
import LanguageToggle from "../components/LanguageToggle";
import "../styles/Login.css";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { t } = useLanguage();

  const handleLogin = async () => {
    setError("");

    if (!email || !password) {
      setError(t("auth.fillAll"));
      return;
    }

    setLoading(true);
    try {
      const res = await api.post("/auth/login", { email, password });
      login(res.data.token, res.data.user);

      // Check unread announcements — redirect if any exist
      try {
        const unreadRes = await api.get("/announcements/unread-count");
        if ((unreadRes.data.count ?? 0) > 0) {
          navigate("/announcements");
          return;
        }
      } catch { /* non-critical — fall through to dashboard */ }

      navigate("/dashboard");
    } catch (err) {
      const msg = err.response?.data?.message;
      setError(msg || t("auth.loginError"));
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") handleLogin();
  };

  return (
    <div className="login-wrapper">
      <div style={{ position: "fixed", top: 16, right: 16, zIndex: 100 }}>
        <LanguageToggle />
      </div>

      {/* Left info panel */}
      <div className="login-left">
        <div className="brand">
          <div className="brand-icon">
            <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 3L1 9l11 6 9-4.91V17h2V9L12 3zM5 13.18v4L12 21l7-3.82v-4L12 17l-7-3.82z" />
            </svg>
          </div>
          <span className="brand-name">SIS</span>
        </div>

        <div className="left-content">
          <h2>
            {t("auth.welcomeTitle").split("Student").length > 1 ? (
              <>
                Welcome to the <span>Student</span> Information System
              </>
            ) : (
              t("auth.welcomeTitle")
            )}
          </h2>
          <p>{t("auth.welcomeSubtitle")}</p>
        </div>

        <div className="left-stats">
          <div className="stat-item">
            <span className="stat-number">12K+</span>
            <span className="stat-label">{t("auth.students")}</span>
          </div>
          <div className="stat-item">
            <span className="stat-number">480+</span>
            <span className="stat-label">{t("auth.courses")}</span>
          </div>
          <div className="stat-item">
            <span className="stat-number">98%</span>
            <span className="stat-label">{t("auth.satisfaction")}</span>
          </div>
        </div>
      </div>

      {/* Right login form */}
      <div className="login-right">
        <div className="login-card">
          <div className="login-header">
            <h1>{t("auth.signIn")}</h1>
            <p>{t("auth.credentials")}</p>
          </div>

          <div className="login-form">
            {/* Email */}
            <div className="form-group">
              <label htmlFor="email">{t("auth.email")}</label>
              <div className="input-wrapper">
                <svg
                  className="input-icon"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="2" y="4" width="20" height="16" rx="2" />
                  <path d="M22 7l-10 7L2 7" />
                </svg>
                <input
                  id="email"
                  type="email"
                  className={`form-input ${error ? "has-error" : ""}`}
                  placeholder="you@university.edu"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (error) setError("");
                  }}
                  onKeyDown={handleKeyDown}
                  autoComplete="email"
                />
              </div>
            </div>

            {/* Password */}
            <div className="form-group">
              <label htmlFor="password">{t("auth.password")}</label>
              <div className="input-wrapper">
                <svg
                  className="input-icon"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                <input
                  id="password"
                  type="password"
                  className={`form-input ${error ? "has-error" : ""}`}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (error) setError("");
                  }}
                  onKeyDown={handleKeyDown}
                  autoComplete="current-password"
                />
              </div>
            </div>

            {/* Forgot password */}
            <div className="form-row">
              <a href="/forgot-password" className="forgot-link">
                {t("auth.forgotPassword")}
              </a>
            </div>

            {/* Error message */}
            {error && (
              <div className="error-message">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                {error}
              </div>
            )}

            {/* Submit button */}
            <button
              className="login-btn"
              onClick={handleLogin}
              disabled={loading}
            >
              {loading ? t("auth.signingIn") : t("auth.signIn")}
            </button>
          </div>

          <div className="login-footer">
            {t("auth.noAccount")}{" "}
            <Link to="/register">{t("auth.registerLink")}</Link>
          </div>

          <div style={{ borderTop: "1px solid #eaecef", marginTop: 16, paddingTop: 16, textAlign: "center", fontSize: 13, color: "#9ca3af" }}>
            {t("auth.areYouInstructor")}{" "}
            <Link to="/instructor/login" style={{ color: "#6b7280", fontWeight: 500, textDecoration: "none" }}
              onMouseOver={e => e.currentTarget.style.color = "#1a1f2e"}
              onMouseOut={e => e.currentTarget.style.color = "#6b7280"}
            >
              {t("auth.instructorLogin")}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
