import { getServerSession } from 'next-auth';

import AuthError from '@/components/AuthError/AuthError';
import EditorClient from '@/components/EditorClient/EditorClient';
import LoginPrompt from '@/components/LoginPrompt/LoginPrompt';
import { authOptions } from '@/utils/auth-options';

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const provider = typeof params.authProvider === 'string' ? params.authProvider : undefined;

  const session = await getServerSession(authOptions);
  if (session && !session.error) {
    return <EditorClient />;
  }

  if (provider == null) {
    return <AuthError message="No auth provider specified for this app" />;
  }

  const isProviderConfigured = authOptions.providers.some((registered) => registered.id === provider);
  if (!isProviderConfigured) {
    return <AuthError message={`Auth provider ${provider} is not configured for this app`} />;
  }

  return <LoginPrompt provider={provider} />;
}
