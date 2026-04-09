import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from '../locales/en.json';
import ru from '../locales/ru.json';
import kk from '../locales/kk.json';

const resources = {
  en: { translation: en },
  ru: { translation: ru },
  kk: { translation: kk },
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    supportedLngs: ['en', 'ru', 'kk'],
    interpolation: {
      escapeValue: false, // React already safes from xss
    },
  });

export default i18n;
