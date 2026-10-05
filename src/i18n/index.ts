import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import chat from './locales/chat.json';
import common from './locales/common.json';
import quickAppEditor from './locales/quick-app-editor.json';
import settings from './locales/settings.json';

if (!i18n.isInitialized) {
  i18n.use(initReactI18next).init({
    lng: 'en',
    fallbackLng: 'en',
    resources: {
      en: { quickAppEditor, common, settings, chat },
    },
    interpolation: { escapeValue: false },
  });
}

export default i18n;
