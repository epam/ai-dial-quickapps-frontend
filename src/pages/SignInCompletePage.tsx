import { FC, memo, useEffect } from 'react';

// The popup's landing page once chat-api's login/callback redirect completes.
// The opener polls its own session (`useAuth`) rather than relying on a
// postMessage handshake — see docs/TRANSITION_PLAN.md §2.3 for why. This
// page's only job is to close itself.
const SignInCompletePage: FC = () => {
  useEffect(() => {
    window.close();
  }, []);

  return (
    <div className="flex h-screen items-center justify-center">
      <p className="text-secondary">Signing in…</p>
    </div>
  );
};

export default memo(SignInCompletePage);
