import { useState } from "react";
import { login } from "../auth";
import { useNavigate, Link } from "react-router-dom";
import api from "../api";
import { useLanguage } from "../context/LanguageContext";
import LanguageToggle from "../components/LanguageToggle";
import "../styles/Login.css";

const DEPARTMENTS = [
  "Bilgisayar Mühendisliği",
  "Endüstri Mühendisliği",
  "Elektrik-Elektronik Mühendisliği",
  "Makine Mühendisliği",
  "Havacılık ve Uzay Mühendisliği",
];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function Register() {
  const navigate = useNavigate();
  const { t } = useLanguage();

  const [form, setForm] = useState({
    fullName: "",
    email: "",
    studentNumber: "",
    department: "",
    password: "",
    passwordConfirm: "",
  });
  const [error, setError]     = useState("");
  const [loading, setLoading] = useState(false);

  const set = (field) => (e) => {
    setForm((f) => ({ ...f, [field]: e.target.value }));
    if (error) setError("");
  };

  const validate = () => {
    const { fullName, email, studentNumber, department, password, passwordConfirm } = form;
    if (!fullName || !email || !studentNumber || !department || !password || !passwordConfirm)
      return t("register.validation.fillAll");
    if (!EMAIL_RE.test(email))
      return t("register.validation.email");
    if (password.length < 6)
      return t("register.validation.passwordLength");
    if (password !== passwordConfirm)
      return t("register.validation.passwordMatch");
    return null;
  };

  const handleRegister = async () => {
    const validationError = validate();
    if (validationError) { setError(validationError); return; }

    setLoading(true);
    try {
      const { fullName, email, studentNumber, department, password } = form;
      const res = await api.post("/auth/register", {
        email,
        password,
        fullName,
        studentNumber,
        department,
        program: `B.Sc. ${department}`,
        year: 1,
        totalYears: 4,
        advisor: "",
      });
      login(res.data.token, res.data.user);
      navigate("/course-selection", { state: { fromRegister: true } });
    } catch (err) {
      const msg = err.response?.data?.message;
      if (err.response?.status === 409) {
        setError(t("register.validation.duplicate"));
      } else {
        setError(msg || t("register.validation.error"));
      }
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => { if (e.key === "Enter") handleRegister(); };

  return (
    <div className="login-wrapper">
      <div style={{ position: "fixed", top: 16, right: 16, zIndex: 100 }}>
        <LanguageToggle />
      </div>

      {/* Left panel */}
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
          <h2>{t("register.joinTitle")}</h2>
          <p>{t("register.joinSubtitle")}</p>
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

      {/* Right form */}
      <div className="login-right">
        <div className="login-card">
          <div className="login-header">
            <h1>{t("register.title")}</h1>
            <p>{t("register.subtitle")}</p>
          </div>

          <div className="login-form">
            {/* Full Name */}
            <div className="form-group">
              <label htmlFor="fullName">{t("register.fullName")}</label>
              <div className="input-wrapper">
                <svg className="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
                </svg>
                <input id="fullName" type="text" className={`form-input ${error ? "has-error" : ""}`}
                  placeholder={t("register.fullNamePlaceholder")} value={form.fullName}
                  onChange={set("fullName")} onKeyDown={handleKeyDown} />
              </div>
            </div>

            {/* Email */}
            <div className="form-group">
              <label htmlFor="email">{t("auth.email")}</label>
              <div className="input-wrapper">
                <svg className="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="4" width="20" height="16" rx="2"/><path d="M22 7l-10 7L2 7"/>
                </svg>
                <input id="email" type="email" className={`form-input ${error ? "has-error" : ""}`}
                  placeholder={t("register.emailPlaceholder")} value={form.email}
                  onChange={set("email")} onKeyDown={handleKeyDown} autoComplete="email" />
              </div>
            </div>

            {/* Student Number */}
            <div className="form-group">
              <label htmlFor="studentNumber">{t("register.studentNumber")}</label>
              <div className="input-wrapper">
                <svg className="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/>
                </svg>
                <input id="studentNumber" type="text" className={`form-input ${error ? "has-error" : ""}`}
                  placeholder={t("register.studentNumberPlaceholder")} value={form.studentNumber}
                  onChange={set("studentNumber")} onKeyDown={handleKeyDown} />
              </div>
            </div>

            {/* Department */}
            <div className="form-group">
              <label htmlFor="department">{t("register.department")}</label>
              <div className="input-wrapper">
                <svg className="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 3L1 9l11 6 9-4.91V17h2V9L12 3zM5 13.18v4L12 21l7-3.82v-4L12 17l-7-3.82z"/>
                </svg>
                <select id="department" className={`form-input ${error ? "has-error" : ""}`}
                  value={form.department} onChange={set("department")}
                  style={{ paddingLeft: "2.5rem", appearance: "auto" }}>
                  <option value="">{t("register.selectDepartment")}</option>
                  {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
            </div>

            {/* Password */}
            <div className="form-group">
              <label htmlFor="password">{t("register.password")}</label>
              <div className="input-wrapper">
                <svg className="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
                <input id="password" type="password" className={`form-input ${error ? "has-error" : ""}`}
                  placeholder={t("register.passwordPlaceholder")} value={form.password}
                  onChange={set("password")} onKeyDown={handleKeyDown} />
              </div>
            </div>

            {/* Confirm Password */}
            <div className="form-group">
              <label htmlFor="passwordConfirm">{t("register.confirmPassword")}</label>
              <div className="input-wrapper">
                <svg className="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
                <input id="passwordConfirm" type="password" className={`form-input ${error ? "has-error" : ""}`}
                  placeholder={t("register.confirmPasswordPlaceholder")} value={form.passwordConfirm}
                  onChange={set("passwordConfirm")} onKeyDown={handleKeyDown} />
              </div>
            </div>

            {/* Error message */}
            {error && (
              <div className="error-message">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                {error}
              </div>
            )}

            {/* Register button */}
            <button className="login-btn" onClick={handleRegister} disabled={loading}>
              {loading ? t("auth.registering") : t("auth.signUp")}
            </button>
          </div>

          <div className="login-footer">
            {t("auth.haveAccount")}{" "}
            <Link to="/">{t("auth.loginLink")}</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
