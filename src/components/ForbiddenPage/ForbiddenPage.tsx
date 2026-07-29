'use client';

import { IconLockX } from '@tabler/icons-react';
import { signOut } from 'next-auth/react';
import { FC, memo } from 'react';

import { DialNeutralButton } from '@epam/ai-dial-ui-kit';

const ForbiddenPage: FC = () => (
  <div className="flex h-screen flex-col items-center justify-center gap-4">
    <IconLockX size={48} stroke={1} className="text-secondary" />
    <p className="text-primary font-semibold">Access Denied</p>
    <p className="text-secondary">You don&apos;t have permission to access this application.</p>
    <DialNeutralButton label="Sign out" onClick={() => void signOut({ redirect: false })} />
  </div>
);

export default memo(ForbiddenPage);
