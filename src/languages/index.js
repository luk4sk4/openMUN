import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import es from './es.json' with { type: 'json' };
import en from './en.json' with { type: 'json' };

/**
 * Lista de idiomas soportados.
 * Para agregar un idioma en el futuro:
 * 1. Crea su archivo de traducción en /src/languages/{codigo}.json
 * 2. Impórtalo aquí y añádelo al array `AVAILABLE_LANGUAGES` y al objeto `resources`.
 */
export const AVAILABLE_LANGUAGES = [
  { code: 'es', label: 'Español', flag: '🇪🇸' },
  { code: 'en', label: 'English', flag: '🇬🇧' },
];

const resources = {
  es: { translation: es },
  en: { translation: en },
};

const savedLanguage = typeof window !== 'undefined' 
  ? localStorage.getItem('openmun_language') || 'es' 
  : 'es';

i18n
  .on('languageChanged', (language) => {
    if (typeof document !== 'undefined') document.documentElement.lang = language;
  })
  .use(initReactI18next)
  .init({
    resources,
    lng: savedLanguage,
    fallbackLng: 'es',
    interpolation: {
      escapeValue: false,
    },
  });

export const changeAppLanguage = (langCode) => {
  i18n.changeLanguage(langCode);
  if (typeof window !== 'undefined') {
    localStorage.setItem('openmun_language', langCode);
  }
};

export default i18n;
