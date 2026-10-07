import { FC, ReactNode } from 'react';

import { CommonI18nKeys } from '@/constants/i18n';
import { useTranslation } from '@/hooks/use-translation';
import { Translation } from '@/types/translation';

export interface SectionProps {
  title: string;
  isRequired?: boolean;
  children: ReactNode;
}

export const Section: FC<SectionProps> = ({ title, isRequired = false, children }) => {
  const { t } = useTranslation(Translation.Common);

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
            <span className="sr-only">{t(CommonI18nKeys.Required)}</span>
          </>
        )}
      </h2>

      {children}
    </section>
  );
};
