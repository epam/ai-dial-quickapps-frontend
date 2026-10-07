import { FC, ReactNode, useId } from 'react';

import { mergeClasses } from '@epam/ai-dial-ui-kit';

import { SectionRowVariant } from '@/types/section-row';

export interface SectionRowProps {
  title: string;
  action?: ReactNode;
  description?: string;
  variant?: SectionRowVariant;
  children?: ReactNode;
}

interface SectionRowStyles {
  header: string;
  title: string;
  description: string;
  content: string;
}

const VARIANT_STYLES: Record<SectionRowVariant, SectionRowStyles> = {
  [SectionRowVariant.Row]: {
    header: 'gap-2',
    title: 'dial-small-semi-text text-primary',
    description: 'dial-small-text text-secondary',
    content: 'relative',
  },
  [SectionRowVariant.Caption]: {
    header: 'gap-4',
    title: 'dial-caption-lead-semi-text text-secondary',
    description: 'dial-tiny-text text-secondary',
    content: '',
  },
  [SectionRowVariant.Setting]: {
    header: 'gap-4',
    title: 'dial-tiny-semi-text text-primary',
    description: 'dial-tiny-text text-secondary',
    content: '',
  },
};

export const SectionRow: FC<SectionRowProps> = ({
  title,
  action,
  description,
  variant = SectionRowVariant.Row,
  children,
}) => {
  const headingId = useId();
  const styles = VARIANT_STYLES[variant];

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-3">
      <div className={mergeClasses('flex items-center justify-between', styles.header)}>
        <h3 id={headingId} className={styles.title}>
          {title}
        </h3>
        {action != null && <div className="shrink-0">{action}</div>}
      </div>
      {description != null && <p className={styles.description}>{description}</p>}
      {children != null && <div className={styles.content}>{children}</div>}
    </section>
  );
};
