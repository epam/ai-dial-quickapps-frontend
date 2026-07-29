import { DialSpinner } from '@epam/ai-dial-ui-kit';
import { FC } from 'react';

const LoadingScreen: FC = () => (
  <div className="flex h-screen items-center justify-center bg-layer-1">
    <DialSpinner />
  </div>
);

export default LoadingScreen;
