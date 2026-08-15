import { useLanguage } from "../context/LanguageContext";

export default function LanguageToggle({ variant = "student" }) {
  const { language, toggleLanguage } = useLanguage();
  const isInstructor = variant === "instructor";

  return (
    <button
      onClick={toggleLanguage}
      title={language === "tr" ? "Switch to English" : "Türkçe'ye geç"}
      style={{
        padding: "0 10px",
        height: 36,
        borderRadius: 8,
        border: isInstructor ? "1.5px solid #eaecef" : "1.5px solid #eaecef",
        background: "transparent",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        fontSize: 12,
        fontWeight: 700,
        letterSpacing: "0.5px",
        color: isInstructor ? "#7c8591" : "#7c8591",
        transition: "background 0.15s, border-color 0.15s, color 0.15s",
        flexShrink: 0,
        fontFamily: "inherit",
        gap: 2,
      }}
      onMouseOver={(e) => {
        e.currentTarget.style.background = "#f5f6fa";
        e.currentTarget.style.borderColor = "#d0d5dd";
        e.currentTarget.style.color = "#1a1f2e";
      }}
      onMouseOut={(e) => {
        e.currentTarget.style.background = "transparent";
        e.currentTarget.style.borderColor = "#eaecef";
        e.currentTarget.style.color = "#7c8591";
      }}
    >
      <span style={{ color: language === "tr" ? "#4f7aff" : "#7c8591", fontWeight: language === "tr" ? 800 : 600 }}>TR</span>
      <span style={{ color: "#d0d5dd", margin: "0 2px" }}>/</span>
      <span style={{ color: language === "en" ? "#4f7aff" : "#7c8591", fontWeight: language === "en" ? 800 : 600 }}>EN</span>
    </button>
  );
}
