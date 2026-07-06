import { encodeApiUrl } from '@/utils/api';

const isAbsoluteUrl = (url: string) => /^https?:\/\//i.test(url);

export const resolveIconUrl = (iconUrl: string): string => {
  if (isAbsoluteUrl(iconUrl)) return iconUrl;
  if (iconUrl.startsWith('files/')) {
    return `/api/dial/v1/${encodeApiUrl(iconUrl)}`;
  }
  return `/api/themes/image/${encodeURIComponent(iconUrl)}`;
};
