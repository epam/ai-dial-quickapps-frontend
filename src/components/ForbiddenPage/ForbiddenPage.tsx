import { IconLockX } from '@tabler/icons-react';
import { FC, memo } from 'react';

import { useAuthContext } from '@/context/AuthContext';
import { DialNeutralButton } from '@epam/ai-dial-ui-kit';

const ForbiddenPage: FC = () => {
  const { logout } = useAuthContext();

  return (
    <div className="flex h-screen flex-col items-center justify-center gap-4">
      <IconLockX size={48} stroke={1} className="text-secondary" />
      <p className="text-primary font-semibold">Access Denied</p>
      <p className="text-secondary">You don&apos;t have permission to access this application.</p>
      <DialNeutralButton label="Sign out" onClick={() => void logout()} />
    </div>
  );
};

export default memo(ForbiddenPage);
