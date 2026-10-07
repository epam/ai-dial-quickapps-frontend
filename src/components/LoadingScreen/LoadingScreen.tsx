import { Spinner } from '@epam/ai-dial-ui-kit';
import { FC } from 'react';

const LoadingScreen: FC = () => (
  <div className="flex h-screen items-center justify-center bg-layer-base">
    <Spinner />
  </div>
);

export default LoadingScreen;
