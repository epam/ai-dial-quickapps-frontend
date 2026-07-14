import { FC, memo } from 'react';

interface AuthErrorProps {
  message: string;
}

const AuthError: FC<AuthErrorProps> = ({ message }) => (
  <div className="flex h-screen flex-col items-center justify-center gap-4">
    <p className="text-secondary">{message}</p>
  </div>
);

export default memo(AuthError);
