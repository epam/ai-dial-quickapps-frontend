import { describe, expect, it } from 'vitest';

import { sanitizeFileName } from '@/utils/file-name';

describe('sanitizeFileName', () => {
  it('keeps a normal file name unchanged', () => {
    expect(sanitizeFileName('report.pdf')).toBe('report.pdf');
  });

  it('replaces not allowed symbols in the base name', () => {
    expect(sanitizeFileName('bad:name.txt')).toBe('bad_name.txt');
  });

  it('sanitizes a file name without an extension', () => {
    expect(sanitizeFileName('bad:name')).toBe('bad_name');
  });

  it('keeps the original name when sanitization removes the whole base name', () => {
    expect(sanitizeFileName('...')).toBe('...');
  });
});
