import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.json';

// English only in P0; strings externalized from commit one (TDD §9.1)
// so Norwegian is a translation task later, not a refactor.
void i18next.use(initReactI18next).init({
  lng: 'en',
  fallbackLng: 'en',
  resources: { en: { translation: en } },
  keySeparator: false,
  nsSeparator: false,
  interpolation: { escapeValue: false },
});

export default i18next;
