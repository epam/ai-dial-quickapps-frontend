import { getServerSession } from 'next-auth';
import { cookies } from 'next/headers';

import EditorClient from '@/components/EditorClient/EditorClient';
import LoginPrompt from '@/components/LoginPrompt/LoginPrompt';
import { authOptions } from '@/utils/auth-options';

const DIAL_SESSION_COOKIE = 'dial_session';

export default async function EditorPage() {
  const cookieStore = await cookies();
  const hasDialSession = cookieStore.has(DIAL_SESSION_COOKIE);

  if (hasDialSession) {
    return <EditorClient />;
  }

  const session = await getServerSession(authOptions);
  if (session && !session.error) {
    return <EditorClient />;
  }

  return <LoginPrompt />;
}
