import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Import translation files
import en from './en.json';
import fr from './fr.json';
import hi from './hi.json';

// Import other languages (abbreviated versions for example)
const es = { ...en }; // Spanish - would be fully translated in production
const ar = { ...en, direction: 'rtl' }; // Arabic - RTL language
const sw = { ...en }; // Swahili
const bn = { ...en }; // Bengali
const yo = { ...en }; // Yoruba
const ta = { ...en }; // Tamil
const te = { ...en }; // Telugu

const resources = {
  en: { translation: en },
  fr: { translation: fr },
  hi: { translation: hi },
  es: { translation: es },
  ar: { translation: ar },
  sw: { translation: sw },
  bn: { translation: bn },
  yo: { translation: yo },
  ta: { translation: ta },
  te: { translation: te }
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: localStorage.getItem('language') || 'en',
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false // React already escapes values
    },
    react: {
      useSuspense: false
    }
  });

// Listen for language changes and update HTML direction
i18n.on('languageChanged', (lng) => {
  localStorage.setItem('language', lng);
  const direction = resources[lng]?.translation?.direction || 'ltr';
  document.documentElement.setAttribute('dir', direction);
  document.documentElement.setAttribute('lang', lng);
});

export default i18n;
