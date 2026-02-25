import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

import en from "./en.json";
import hi from "./hi.json";
import or from "./or.json";

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      hi: { translation: hi },
      or: { translation: or },
    },
    fallbackLng: "en",
    lng: localStorage.getItem("pollaris_lang") || "en",
    interpolation: { escapeValue: false },
    detection: { order: ["localStorage", "navigator"] },
  });

export default i18n;
