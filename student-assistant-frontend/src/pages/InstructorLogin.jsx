import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import instructorApi from "../instructorApi";
import { loginInstructor } from "../instructorAuth";
import { useLanguage } from "../context/LanguageContext";
import LanguageToggle from "../components/LanguageToggle";
import "../styles/InstructorLogin.css";

export default function InstructorLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { t } = useLanguage();

  const handleLogin = async () => {
    setError("");
    if (!email || !password) { setError(t("instructorLogin.fillAll")); return; }

    setLoading(true);
    try {
      const res = await instructorApi.post("/login", { email, password });
      loginInstructor(res.data.token, res.data.instructor);
      navigate("/instructor/dashboard");
    } catch (err) {
      setError(err.response?.data?.message || t("instructorLogin.wrongCredentials"));
      setLoading(false);
    }
  };

  return (
    <div className="login-wrapper">
      <div style={{ position: "fixed", top: 16, right: 16, zIndex: 100 }}>
        <LanguageToggle />
      </div>

      {/* Left */}
      <div className="login-left">
        <div className="brand">
          <div className="brand-icon">
            <svg viewBox="0 0 24 24"><path d="M12 3L1 9l11 6 9-4.91V17h2V9L12 3zM5 13.18v4L12 21l7-3.82v-4L12 17l-7-3.82z" /></svg>
          </div>
          <span className="brand-name">SIS</span>
        </div>

        <div className="left-content">
          <h2>{t("instructorLogin.panelTitle")}</h2>
          <p>{t("instructorLogin.panelSubtitle")}</p>
        </div>

        <div className="left-stats">
          <div className="stat-item"><span className="stat-number">48</span><span className="stat-label">{t("auth.courses")}</span></div>
          <div className="stat-item"><span className="stat-number">3</span><span className="stat-label">{t("common.instructor")}</span></div>
          <div className="stat-item"><span className="stat-number">1</span><span className="stat-label">{t("register.department")}</span></div>
        </div>
      </div>

      {/* Right */}
      <div className="login-right">
        <div className="login-card">
          <div className="login-header">
            <h1>{t("instructorLogin.title")}</h1>
            <p>{t("instructorLogin.subtitle")}</p>
          </div>

          <div className="login-form">
            <div className="form-group">
              <label>{t("instructorLogin.email")}</label>
              <div className="input-wrapper">
                <svg className="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="4" width="20" height="16" rx="2" /><path d="M22 7l-10 7L2 7" />
                </svg>
                <input className={`form-input ${error ? "has-error" : ""}`} type="email"
                  placeholder={t("instructorLogin.emailPlaceholder")} value={email}
                  onChange={(e) => { setEmail(e.target.value); setError(""); }}
                  onKeyDown={(e) => e.key === "Enter" && handleLogin()} />
              </div>
            </div>

            <div className="form-group">
              <label>{t("instructorLogin.password")}</label>
              <div className="input-wrapper">
                <svg className="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                <input className={`form-input ${error ? "has-error" : ""}`} type="password"
                  placeholder="••••••••" value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(""); }}
                  onKeyDown={(e) => e.key === "Enter" && handleLogin()} />
              </div>
            </div>

            {error && (
              <div className="error-message">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                {error}
              </div>
            )}

            <button className="login-btn" onClick={handleLogin} disabled={loading}>
              {loading ? t("instructorLogin.signingIn") : t("instructorLogin.signIn")}
            </button>
          </div>

          <div className="login-footer">
            {t("instructorLogin.noAccount")} <Link to="/instructor/register">{t("instructorLogin.registerLink")}</Link>
            <div className="login-footer-divider">·</div>
            {t("instructorLogin.areYouStudent")} <Link to="/">{t("instructorLogin.studentLogin")}</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
