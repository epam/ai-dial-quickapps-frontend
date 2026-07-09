"use client";

import { FC, memo, Suspense, useEffect } from "react";
import { signIn, useSession } from "next-auth/react";
import { useSearchParams } from "next/navigation";

import { AUTH_WINDOW_CLOSE_KEY } from "@/constants/auth";

const SignInContent: FC = () => {
  const searchParams = useSearchParams();
  const provider = searchParams.get("provider") ?? "keycloak";
  const { data: session, status } = useSession();

  useEffect(() => {
    if (status === "unauthenticated" || session?.error) {
      void signIn(provider, {
        callbackUrl: `/signin?provider=${encodeURIComponent(provider)}`,
      });
    } else if (status === "authenticated") {
      window.opener?.postMessage(
        { type: AUTH_WINDOW_CLOSE_KEY },
        window.location.origin,
      );
      window.close();
    }
  }, [status, session, provider]);

  return (
    <div className="flex h-screen items-center justify-center">
      <p className="text-secondary">Signing in…</p>
    </div>
  );
};

const SignInPage: FC = () => (
  <Suspense>
    <SignInContent />
  </Suspense>
);

export default memo(SignInPage);
