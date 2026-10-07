import { FC, ReactNode, useId } from 'react';

export interface ConfigurationSectionProps {
  title: string;
  action?: ReactNode;
  description?: string;
  className?: string;
  children?: ReactNode;
}

export const ConfigurationSection: FC<ConfigurationSectionProps> = ({
  title,
  action,
  description,
  className,
  children,
}) => {
  const headingId = useId();

  return (
    <section aria-labelledby={headingId} className={className}>
      <div className="flex items-center justify-between gap-4">
        <h3 id={headingId} className="dial-caption-lead-semi-text text-secondary">
          {title}
        </h3>
        {action != null && <div className="shrink-0">{action}</div>}
      </div>
      {description != null && <p className="dial-tiny-text text-secondary">{description}</p>}
      <div>{children}</div>
    </section>
  );
};
