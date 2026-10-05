import { describe, expect, it } from 'vitest';

import { resolveIconUrl } from '@/utils/resolve-icon-url';

describe('resolveIconUrl', () => {
  it('preserves an absolute URL', () => {
    expect(resolveIconUrl('https://cdn.example.com/icon.svg')).toBe(
      'https://cdn.example.com/icon.svg',
    );
  });

  it('builds a file download URL for a DIAL file icon', () => {
    expect(resolveIconUrl('files/my-bucket/icons/app.svg')).toBe(
      '/api/v1/files/download?bucket=my-bucket&path=icons%2Fapp.svg',
    );
  });

  it('builds a theme URL for a symbolic icon name', () => {
    expect(resolveIconUrl('dial-icon')).toBe('/api/themes/icon?iconName=dial-icon');
  });
});
