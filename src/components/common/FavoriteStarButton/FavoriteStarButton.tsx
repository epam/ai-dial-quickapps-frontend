import { FC, memo } from 'react';

import { IconStarFilled } from '@tabler/icons-react';

export interface FavoriteStarButtonProps {
  isFavorite: boolean;
}

/** Read-only favorite indicator — this app only displays favorites, it never modifies them. */
const FavoriteStarButton: FC<FavoriteStarButtonProps> = ({ isFavorite }) => {
  if (!isFavorite) return null;

  return (
    <IconStarFilled
      size={16}
      className="absolute end-3 top-3 text-warning-icon"
      aria-hidden="true"
    />
  );
};

export default memo(FavoriteStarButton);
