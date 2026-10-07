import { FC, memo, ReactNode } from 'react';

interface AuthStateScreenProps {
  /** Decorative glyph shown in the round badge; hidden from assistive technology. */
  icon: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
}

/** Shared full-page layout for the login, forbidden and auth-configuration-error states. */
const AuthStateScreen: FC<AuthStateScreenProps> = ({ icon, title, description, action }) => (
  <div className="flex h-screen flex-col items-center justify-center px-4 text-center">
    <span
      aria-hidden
      className="flex size-14 items-center justify-center rounded-full border border-secondary text-secondary"
    >
      {icon}
    </span>
    <h1 className="dial-body-semi-text mt-4 text-primary">{title}</h1>
    <p className="dial-small-text mt-2 text-secondary">{description}</p>
    {action != null && <div className="mt-4">{action}</div>}
  </div>
);

export default memo(AuthStateScreen);
