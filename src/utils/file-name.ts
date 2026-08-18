import { NOT_ALLOWED_SYMBOLS_REGEXP } from '@epam/ai-dial-ui-kit';
import {
  Icon,
  IconFile,
  IconFileTypeJpg,
  IconFileTypePng,
  IconFileTypeSvg,
  IconFileTypeBmp,
  IconPhoto,
  IconVideo,
  IconMusic,
  IconFileTypePdf,
  IconFileTypeDoc,
  IconFileTypeDocx,
  IconFileTypePpt,
  IconFileTypeXls,
  IconFileTypeZip,
  IconFileTypeCsv,
  IconFileTypeTxt,
  IconFileTypeHtml,
  IconFileTypeXml,
  IconFileTypeSql,
  IconFileTypeJs,
  IconFileTypeJsx,
  IconFileTypeTs,
  IconFileTypeTsx,
  IconFileTypeCss,
  IconFileTypePhp,
  IconFileTypeRs,
  IconFileTypeVue,
} from '@tabler/icons-react';

export const sanitizeFileName = (name: string): string => {
  const lastDot = name.lastIndexOf('.');
  const hasExtension = lastDot > 0;

  const baseName = hasExtension ? name.slice(0, lastDot) : name;
  const extension = hasExtension ? name.slice(lastDot) : '';

  const sanitizedBase = baseName
    .replace(new RegExp(NOT_ALLOWED_SYMBOLS_REGEXP.source, 'g'), '_')
    .replace(/[.\s]+$/, '');

  if (sanitizedBase === '') {
    return name;
  }

  return `${sanitizedBase}${extension}`;
};

/**
 * Get the file extension from a given path or filename.
 */
export const getExtension = (path: string): string | undefined => {
  const clean = path.split(/[?#]/)[0];
  const dotIdx = clean.lastIndexOf('.');
  if (dotIdx === -1) return undefined;
  const ext = clean.slice(dotIdx + 1).toLowerCase();
  return ext;
};

/** Returns the Tabler icon component for a given file or `IconFile` for unknown types. */
export const getAttachmentIcon = (fileName: string): Icon => {
  const extension = getExtension(fileName);
  if (!extension) return IconFile;

  switch (extension) {
    // Images
    case 'jpg':
    case 'jpeg':
      return IconFileTypeJpg;
    case 'png':
      return IconFileTypePng;
    case 'svg':
      return IconFileTypeSvg;
    case 'bmp':
      return IconFileTypeBmp;
    case 'gif':
    case 'webp':
    case 'tif':
    case 'tiff':
    case 'ico':
      return IconPhoto;

    // Video
    case 'mp4':
    case 'mov':
    case 'avi':
    case 'mkv':
    case 'webm':
    case 'wmv':
      return IconVideo;

    // Audio
    case 'mp3':
    case 'wav':
    case 'ogg':
    case 'flac':
    case 'm4a':
    case 'aac':
      return IconMusic;

    // Documents
    case 'pdf':
      return IconFileTypePdf;
    case 'doc':
      return IconFileTypeDoc;
    case 'docx':
      return IconFileTypeDocx;
    case 'ppt':
    case 'pptx':
      return IconFileTypePpt;
    case 'xls':
    case 'xlsx':
      return IconFileTypeXls;

    // Archives
    case 'zip':
    case 'rar':
    case '7z':
    case 'gz':
    case 'tar':
      return IconFileTypeZip;

    // Data / markup
    case 'csv':
      return IconFileTypeCsv;
    case 'txt':
      return IconFileTypeTxt;
    case 'html':
    case 'htm':
      return IconFileTypeHtml;
    case 'xml':
      return IconFileTypeXml;
    case 'sql':
      return IconFileTypeSql;

    // Web / code
    case 'js':
    case 'mjs':
    case 'cjs':
      return IconFileTypeJs;
    case 'jsx':
      return IconFileTypeJsx;
    case 'ts':
      return IconFileTypeTs;
    case 'tsx':
      return IconFileTypeTsx;
    case 'css':
      return IconFileTypeCss;
    case 'php':
      return IconFileTypePhp;
    case 'rs':
      return IconFileTypeRs;
    case 'vue':
      return IconFileTypeVue;

    default:
      return IconFile;
  }
};
