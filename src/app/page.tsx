import { getServerSession } from "next-auth";

import EditorClient from "@/components/EditorClient/EditorClient";
import LoginPrompt from "@/components/LoginPrompt/LoginPrompt";
import { authOptions } from "@/utils/auth-options";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const provider =
    typeof params.provider === "string" ? params.provider : "keycloak";

  const session = await getServerSession(authOptions);
  if (session && !session.error) {
    return <EditorClient />;
  }

  return <LoginPrompt provider={provider} />;
}
