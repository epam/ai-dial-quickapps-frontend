import { describe, expect, it } from 'vitest';
import {
  IconFile,
  IconFileTypeDocx,
  IconFileTypeJpg,
  IconFileTypePdf,
  IconFileTypeTs,
  IconFileTypeZip,
  IconMusic,
  IconPhoto,
  IconVideo,
} from '@tabler/icons-react';

import { getAttachmentIcon, sanitizeFileName } from '@/utils/file-name';

describe('sanitizeFileName', () => {
  it('keeps a normal file name unchanged', () => {
    expect(sanitizeFileName('report.pdf')).toBe('report.pdf');
  });

  it('replaces not allowed symbols in the base name', () => {
    expect(sanitizeFileName('bad:name.txt')).toBe('bad_name.txt');
  });
});

describe('getAttachmentIcon', () => {
  it('resolves an icon by file extension, case-insensitively', () => {
    expect(getAttachmentIcon('report.PDF')).toBe(IconFileTypePdf);
  });

  it('resolves specific document, code, and archive icons', () => {
    expect(getAttachmentIcon('photo.jpg')).toBe(IconFileTypeJpg);
    expect(getAttachmentIcon('letter.docx')).toBe(IconFileTypeDocx);
    expect(getAttachmentIcon('module.ts')).toBe(IconFileTypeTs);
    expect(getAttachmentIcon('archive.zip')).toBe(IconFileTypeZip);
  });

  it('falls back to broad category icons for less common media extensions', () => {
    expect(getAttachmentIcon('clip.mov')).toBe(IconVideo);
    expect(getAttachmentIcon('track.mp3')).toBe(IconMusic);
    expect(getAttachmentIcon('image.gif')).toBe(IconPhoto);
  });

  it('returns IconFile for an unknown or missing extension', () => {
    expect(getAttachmentIcon('archive.unknownext')).toBe(IconFile);
    expect(getAttachmentIcon('no-extension')).toBe(IconFile);
  });
});
