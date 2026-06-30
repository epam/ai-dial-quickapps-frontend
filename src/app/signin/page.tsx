"use client";

import { FC, memo, useEffect } from "react";
import { signIn, useSession } from "next-auth/react";

import { AUTH_WINDOW_CLOSE_KEY } from "@/constants/auth";

const SignInPage: FC = () => {
  const { status } = useSession();

  useEffect(() => {
    if (status === "unauthenticated") {
      void signIn("keycloak", { callbackUrl: "/signin" });
    } else if (status === "authenticated") {
      window.opener?.postMessage(
        { type: AUTH_WINDOW_CLOSE_KEY },
        window.location.origin,
      );
      window.close();
    }
  }, [status]);

  return (
    <div className="flex h-screen items-center justify-center">
      <p className="text-secondary">Signing in…</p>
    </div>
  );
};

export default memo(SignInPage);
