import { createContext, useState, useContext } from "react";

const LanguageContext = createContext();

// eslint-disable-next-line react-refresh/only-export-components
export const translations = {
   en: {
      siteSubtitle: "Elbaph Arc",
      countdown: {
         days: "days",
         hours: "hours",
         min: "min",
         sec: "sec",
      },
   },
   jp: {
      siteSubtitle: "エルバフ編",
      countdown: {
         days: "日",
         hours: "時間",
         min: "分",
         sec: "秒",
      },
   },
};

export function LanguageProvider({ children }) {
   const [language, setLanguage] = useState("en");

   const toggleLanguage = () => {
      setLanguage((prev) => (prev === "en" ? "jp" : "en"));
   };

   const t = translations[language];

   return (
      <LanguageContext.Provider value={{ language, toggleLanguage, t }}>
         {children}
      </LanguageContext.Provider>
   );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useLanguage() {
   const context = useContext(LanguageContext);
   if (!context) {
      throw new Error("useLanguage must be used within LanguageProvider");
   }
   return context;
}
