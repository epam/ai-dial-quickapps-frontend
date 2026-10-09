import { type ReactNode, useEffect } from 'react';
import { I18nextProvider } from 'react-i18next';

import i18n from '@/i18n';

interface I18nProviderProps {
  children: ReactNode;
}

export const I18nProvider = ({ children }: I18nProviderProps) => {
  useEffect(() => {
    const updateDocumentLanguage = (language: string) => {
      document.documentElement.dir = i18n.dir(language);
      document.documentElement.lang = language;
    };

    updateDocumentLanguage(i18n.language);
    i18n.on('languageChanged', updateDocumentLanguage);

    return () => {
      i18n.off('languageChanged', updateDocumentLanguage);
    };
  }, []);

  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>;
};
