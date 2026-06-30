import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';

import DevHarness from '@/components/DevHarness/DevHarness';
import { authOptions } from '@/utils/auth-options';

export default async function Page() {
  if (process.env.NODE_ENV === 'production') {
    redirect('/editor');
  }

  const session = await getServerSession(authOptions);

  return (
    <DevHarness
      defaultDialApiHost={process.env.DIAL_CORE_URL ?? 'http://localhost:8080'}
      defaultToken={session?.accessToken ?? ''}
    />
  );
}
