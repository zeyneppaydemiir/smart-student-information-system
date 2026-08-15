import { createContext, useContext, useState } from "react";
import tr from "../locales/tr";
import en from "../locales/en";

const LOCALES = { tr, en };

const LanguageContext = createContext();

export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState(() => {
    return localStorage.getItem("sis-language") || "tr";
  });

  const toggleLanguage = () => {
    const next = language === "tr" ? "en" : "tr";
    localStorage.setItem("sis-language", next);
    setLanguage(next);
  };

  const t = (key) => {
    const locale = LOCALES[language] || LOCALES.tr;
    return locale[key] ?? key;
  };

  return (
    <LanguageContext.Provider value={{ language, toggleLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export const useLanguage = () => useContext(LanguageContext);
