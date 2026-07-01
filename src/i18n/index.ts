'use client';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import chat from './locales/chat.json';
import common from './locales/common.json';
import marketplace from './locales/marketplace.json';
import settings from './locales/settings.json';

if (!i18n.isInitialized) {
  i18n.use(initReactI18next).init({
    lng: 'en',
    fallbackLng: 'en',
    resources: {
      en: { marketplace, common, settings, chat },
    },
    interpolation: { escapeValue: false },
  });
}

export default i18n;
