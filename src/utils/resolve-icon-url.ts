const isAbsoluteUrl = (url: string) => /^https?:\/\//i.test(url);

export const resolveIconUrl = (iconUrl: string): string => {
  if (isAbsoluteUrl(iconUrl)) return iconUrl;
  if (iconUrl.startsWith('files/')) {
    // files/{bucket}/{path...} → chat-api wants bucket and path as separate
    // query params, not a single path segment.
    const [, bucket, ...pathParts] = iconUrl.split('/');
    const qs = new URLSearchParams({ bucket, path: pathParts.join('/') });
    return `/api/v1/files/download?${qs}`;
  }
  return `/api/themes/icon?iconName=${encodeURIComponent(iconUrl)}`;
};
