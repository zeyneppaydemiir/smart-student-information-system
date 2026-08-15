import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import instructorApi from "../instructorApi";
import { loginInstructor } from "../instructorAuth";
import { useLanguage } from "../context/LanguageContext";
import LanguageToggle from "../components/LanguageToggle";
import "../styles/InstructorLogin.css";

const TITLES = ["Dr.", "Prof. Dr.", "Doç. Dr.", "Arş. Gör.", "Öğr. Gör."];

const DEPARTMENTS = [
  "Bilgisayar Mühendisliği",
  "Endüstri Mühendisliği",
  "Elektrik-Elektronik Mühendisliği",
  "Makine Mühendisliği",
  "Havacılık ve Uzay Mühendisliği",
];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function InstructorRegister() {
  const navigate = useNavigate();
  const { t } = useLanguage();

  const [form, setForm] = useState({
    fullName: "",
    email: "",
    password: "",
    title: "",
    department: "",
    phone: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const set = (field) => (e) => {
    setForm((f) => ({ ...f, [field]: e.target.value }));
    if (error) setError("");
  };

  const validate = () => {
    const { fullName, email, password, title, department } = form;
    if (!fullName || !email || !password || !title || !department)
      return t("instructorRegister.validation.fillAll");
    if (fullName.trim().length < 3)
      return t("instructorRegister.validation.nameLength");
    if (!EMAIL_RE.test(email))
      return t("instructorRegister.validation.email");
    if (password.length < 6)
      return t("instructorRegister.validation.passwordLength");
    return null;
  };

  const handleRegister = async () => {
    const err = validate();
    if (err) { setError(err); return; }

    setLoading(true);
    try {
      const res = await instructorApi.post("/register", {
        fullName: form.fullName.trim(),
        email: form.email.trim(),
        password: form.password,
        title: form.title,
        department: form.department,
        phone: form.phone.trim() || undefined,
      });
      loginInstructor(res.data.token, res.data.instructor);
      navigate("/instructor/dashboard");
    } catch (e) {
      setError(e.response?.data?.message || t("common.error"));
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
          <h2>{t("instructorRegister.panelTitle")}</h2>
          <p>{t("instructorRegister.panelSubtitle")}</p>
        </div>

        <div className="left-stats">
          <div className="stat-item"><span className="stat-number">48</span><span className="stat-label">{t("auth.courses")}</span></div>
          <div className="stat-item"><span className="stat-number">5</span><span className="stat-label">{t("register.department")}</span></div>
          <div className="stat-item"><span className="stat-number">1200+</span><span className="stat-label">{t("auth.students")}</span></div>
        </div>
      </div>

      {/* Right */}
      <div className="login-right">
        <div className="login-card">
          <div className="login-header">
            <h1>{t("instructorRegister.title")}</h1>
            <p>{t("instructorRegister.subtitle")}</p>
          </div>

          <div className="login-form">
            {/* Full Name */}
            <div className="form-group">
              <label>{t("instructorRegister.fullName")}</label>
              <div className="input-wrapper">
                <svg className="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
                </svg>
                <input
                  className="form-input"
                  type="text"
                  placeholder={t("instructorRegister.fullNamePlaceholder")}
                  value={form.fullName}
                  onChange={set("fullName")}
                />
              </div>
            </div>

            {/* Email */}
            <div className="form-group">
              <label>{t("instructorRegister.email")}</label>
              <div className="input-wrapper">
                <svg className="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="4" width="20" height="16" rx="2" /><path d="M22 7l-10 7L2 7" />
                </svg>
                <input
                  className="form-input"
                  type="email"
                  placeholder={t("instructorRegister.emailPlaceholder")}
                  value={form.email}
                  onChange={set("email")}
                />
              </div>
            </div>

            {/* Password */}
            <div className="form-group">
              <label>{t("instructorRegister.password")}</label>
              <div className="input-wrapper">
                <svg className="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                <input
                  className="form-input"
                  type={showPassword ? "text" : "password"}
                  placeholder={t("instructorRegister.passwordPlaceholder")}
                  value={form.password}
                  onChange={set("password")}
                  style={{ paddingRight: 44 }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  tabIndex={-1}
                  style={{ position: "absolute", right: 12, background: "none", border: "none", cursor: "pointer", color: "#b0b8c1", padding: 4, display: "flex", alignItems: "center" }}
                >
                  {showPassword ? (
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" /><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" /><line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  ) : (
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Title */}
            <div className="form-group">
              <label>{t("instructorRegister.titleField")}</label>
              <select
                className="form-input no-icon"
                value={form.title}
                onChange={set("title")}
              >
                <option value="">{t("instructorRegister.selectTitle")}</option>
                {TITLES.map((ti) => <option key={ti} value={ti}>{ti}</option>)}
              </select>
            </div>

            {/* Department */}
            <div className="form-group">
              <label>{t("instructorRegister.department")}</label>
              <select
                className="form-input no-icon"
                value={form.department}
                onChange={set("department")}
              >
                <option value="">{t("instructorRegister.selectDepartment")}</option>
                {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>

            {/* Phone (optional) */}
            <div className="form-group">
              <label>{t("instructorRegister.phone")}</label>
              <div className="input-wrapper">
                <svg className="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 9.91a16 16 0 0 0 6.09 6.09l1.27-.91a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
                </svg>
                <input
                  className="form-input"
                  type="text"
                  placeholder={t("instructorRegister.phonePlaceholder")}
                  value={form.phone}
                  onChange={set("phone")}
                />
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

            <button className="login-btn" onClick={handleRegister} disabled={loading}>
              {loading ? t("instructorRegister.registering") : t("instructorRegister.register")}
            </button>
          </div>

          <div className="login-footer">
            {t("instructorRegister.haveAccount")} <Link to="/instructor/login">{t("instructorRegister.signIn")}</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
