'use client';

import { FC, memo } from 'react';

import { useAuth } from '@/hooks/use-auth';
import { DialNeutralButton } from '@epam/ai-dial-ui-kit';

interface LoginPromptProps {
  provider: string;
}

const LoginPrompt: FC<LoginPromptProps> = ({ provider }) => {
  const { openLoginWindow, isWindowOpen } = useAuth(provider);

  return (
    <div className="flex h-screen flex-col items-center justify-center gap-4">
      <p className="text-secondary">Sign in to access the editor.</p>
      <DialNeutralButton
        disabled={isWindowOpen}
        onClick={openLoginWindow}
        label={isWindowOpen ? 'Sign-in window is open…' : 'Sign in'}
      />
    </div>
  );
};

export default memo(LoginPrompt);
