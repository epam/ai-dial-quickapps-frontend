import { FC, ReactNode } from 'react';

import { BasicI18nKeys } from '@/constants/translation-keys';
import { useTranslation } from 'react-i18next';

export interface SectionProps {
  title: string;
  isRequired?: boolean;
  children: ReactNode;
}

export const Section: FC<SectionProps> = ({ title, isRequired = false, children }) => {
  const { t } = useTranslation();

  return (
    <section
      aria-label={title}
      className="rounded-[20px] bg-layer-raised py-6 px-7 shadow-md gap-3 flex flex-col"
    >
      <h2 className="text-primary flex items-center gap-0.5">
        <span className="min-h-4 dial-h3-text">{title}</span>
        {isRequired && (
          <>
            <span aria-hidden="true" className="text-error dial-tiny-text">
              *
            </span>
            <span className="sr-only">{t(BasicI18nKeys.Required)}</span>
          </>
        )}
      </h2>

      {children}
    </section>
  );
};
