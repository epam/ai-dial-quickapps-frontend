import { describe, expect, it } from 'vitest';
import {
  IconFile,
  IconFileTypeBmp,
  IconFileTypeCss,
  IconFileTypeCsv,
  IconFileTypeDoc,
  IconFileTypeDocx,
  IconFileTypeHtml,
  IconFileTypeJpg,
  IconFileTypeJs,
  IconFileTypeJsx,
  IconFileTypePng,
  IconFileTypePdf,
  IconFileTypePhp,
  IconFileTypePpt,
  IconFileTypeRs,
  IconFileTypeSql,
  IconFileTypeSvg,
  IconFileTypeTs,
  IconFileTypeTsx,
  IconFileTypeTxt,
  IconFileTypeVue,
  IconFileTypeXls,
  IconFileTypeXml,
  IconFileTypeZip,
  IconMusic,
  IconPhoto,
  IconVideo,
} from '@tabler/icons-react';

import {
  getAttachmentIcon,
  getExtension,
  sanitizeFileName,
} from '@/utils/file-name';

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

describe('getExtension', () => {
  it('returns a lowercase extension without query or fragment suffixes', () => {
    expect(getExtension('DIR/Photo.JPEG?download=1#section')).toBe('jpeg');
  });

  it('returns undefined when a path has no extension', () => {
    expect(getExtension('no-extension')).toBeUndefined();
  });

  it('returns an empty extension for a trailing dot', () => {
    expect(getExtension('name.')).toBe('');
  });
});

describe('getAttachmentIcon', () => {
  it.each([
    ['photo.jpg', IconFileTypeJpg],
    ['photo.jpeg', IconFileTypeJpg],
    ['image.png', IconFileTypePng],
    ['image.svg', IconFileTypeSvg],
    ['image.bmp', IconFileTypeBmp],
    ['image.gif', IconPhoto],
    ['image.webp', IconPhoto],
    ['image.tif', IconPhoto],
    ['image.tiff', IconPhoto],
    ['image.ico', IconPhoto],
    ['clip.mp4', IconVideo],
    ['clip.mov', IconVideo],
    ['clip.avi', IconVideo],
    ['clip.mkv', IconVideo],
    ['clip.webm', IconVideo],
    ['clip.wmv', IconVideo],
    ['track.mp3', IconMusic],
    ['track.wav', IconMusic],
    ['track.ogg', IconMusic],
    ['track.flac', IconMusic],
    ['track.m4a', IconMusic],
    ['track.aac', IconMusic],
    ['document.pdf', IconFileTypePdf],
    ['document.doc', IconFileTypeDoc],
    ['document.docx', IconFileTypeDocx],
    ['document.ppt', IconFileTypePpt],
    ['document.pptx', IconFileTypePpt],
    ['spreadsheet.xls', IconFileTypeXls],
    ['spreadsheet.xlsx', IconFileTypeXls],
    ['archive.zip', IconFileTypeZip],
    ['archive.rar', IconFileTypeZip],
    ['archive.7z', IconFileTypeZip],
    ['archive.gz', IconFileTypeZip],
    ['archive.tar', IconFileTypeZip],
    ['data.csv', IconFileTypeCsv],
    ['data.txt', IconFileTypeTxt],
    ['page.html', IconFileTypeHtml],
    ['page.htm', IconFileTypeHtml],
    ['data.xml', IconFileTypeXml],
    ['query.sql', IconFileTypeSql],
    ['script.js', IconFileTypeJs],
    ['script.mjs', IconFileTypeJs],
    ['script.cjs', IconFileTypeJs],
    ['component.jsx', IconFileTypeJsx],
    ['module.ts', IconFileTypeTs],
    ['component.tsx', IconFileTypeTsx],
    ['styles.css', IconFileTypeCss],
    ['script.php', IconFileTypePhp],
    ['module.rs', IconFileTypeRs],
    ['component.vue', IconFileTypeVue],
  ])('returns the expected icon for %s', (fileName, expectedIcon) => {
    expect(getAttachmentIcon(fileName)).toBe(expectedIcon);
  });

  it('strips query and fragment suffixes before resolving the icon', () => {
    expect(getAttachmentIcon('report.PDF?download=1#section')).toBe(IconFileTypePdf);
  });

  it('returns IconFile for an unknown or missing extension', () => {
    expect(getAttachmentIcon('archive.unknownext')).toBe(IconFile);
    expect(getAttachmentIcon('no-extension')).toBe(IconFile);
  });
});
