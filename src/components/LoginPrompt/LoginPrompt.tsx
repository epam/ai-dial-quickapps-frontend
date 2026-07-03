"use client";

import { FC, memo } from "react";

import { useAuth } from "@/hooks/use-auth";

interface LoginPromptProps {
  provider: string;
}

const LoginPrompt: FC<LoginPromptProps> = ({ provider }) => {
  const { openLoginWindow, isWindowOpen } = useAuth(provider);

  return (
    <div className="flex h-screen flex-col items-center justify-center gap-4">
      <p className="text-secondary">Sign in to access the editor.</p>
      <button
        className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
        disabled={isWindowOpen}
        onClick={openLoginWindow}
      >
        {isWindowOpen ? "Sign-in window is open…" : "Sign in"}
      </button>
    </div>
  );
};

export default memo(LoginPrompt);
