import { describe, expect, it } from 'vitest';

import { decodeFileUrl } from '@/utils/decode-file-url';

describe('decodeFileUrl', () => {
  it('decodes a singly-encoded URL to its raw form', () => {
    const encoded = 'files/public/Example%20Report%20-%20Final%20(v2).pdf';
    expect(decodeFileUrl(encoded)).toBe('files/public/Example Report - Final (v2).pdf');
  });

  it('decodes a double-encoded URL down to its raw form', () => {
    const doubleEncoded = 'files/public/Example%2520Report%2520-%2520Final%2520(v2).pdf';
    expect(decodeFileUrl(doubleEncoded)).toBe('files/public/Example Report - Final (v2).pdf');
  });

  it('leaves an already-raw URL unchanged', () => {
    const raw = 'files/public/Example Report - Final (v2).pdf';
    expect(decodeFileUrl(raw)).toBe(raw);
  });

  it('leaves an already-raw private bucket URL unchanged', () => {
    const url = 'files/some-bucket-id/Folder/123456789/document.pdf';
    expect(decodeFileUrl(url)).toBe(url);
  });

  it('falls back to the original string on a malformed escape sequence', () => {
    const malformed = 'files/public/100% off (final).png';
    expect(decodeFileUrl(malformed)).toBe(malformed);
  });
});
