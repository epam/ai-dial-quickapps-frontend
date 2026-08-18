import { describe, expect, it } from 'vitest';

import { getFileDirectoryPath } from '@/utils/dial-file-path';

describe('getFileDirectoryPath', () => {
  it('returns the nested directory path for an own-bucket appdata file', () => {
    const path =
      'files/6FEupToqsS9zx7gVciZHLgmTDnH5v3pBDQquWK7Spf541iH5S4bU95fE8oxXioiapV/appdata/Ocr/2025-annual-report-pdf-page-10-d1886aff479fc760a3891c411063e630c2ddd0ce-png_content.md';
    expect(getFileDirectoryPath(path)).toBe('appdata/Ocr');
  });

  it('returns the nested directory path for an own-bucket upload file', () => {
    const path =
      'files/6FEupToqsS9zx7gVciZHLgmTDnH5v3pBDQquWK7Spf541iH5S4bU95fE8oxXioiapV/Ocr/1773663532970/Group1-2.pdf';
    expect(getFileDirectoryPath(path)).toBe('Ocr/1773663532970');
  });

  it('returns the nested directory path for a shared-with-me file', () => {
    const path =
      'files/2V56nym3wVsWD9k3U5qfpz53JV3RfXZkSo4SzRtUJHXfiJGeVr8WYHiZtdNFmzUp4c/uploads/2026-03/test_FinancialReport.pdf';
    expect(getFileDirectoryPath(path)).toBe('uploads/2026-03');
  });

  it("returns '/' for an organization file at the bucket root", () => {
    const path = 'files/public/3.3.3 (1).gif';
    expect(getFileDirectoryPath(path)).toBe('/');
  });

  it("returns '/' for a path with no directory segments beyond the bucket", () => {
    expect(getFileDirectoryPath('files/public/AEG instruction 1.pdf')).toBe('/');
  });

  it("returns '/' when the path has fewer than three segments", () => {
    expect(getFileDirectoryPath('files/public')).toBe('/');
    expect(getFileDirectoryPath('document.pdf')).toBe('/');
  });
});
