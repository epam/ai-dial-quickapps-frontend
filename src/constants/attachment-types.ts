import { MIMEType } from '@/types/mime-type';

import type { AutocompleteTagInputSuggestion } from '@epam/ai-dial-ui-kit';

const suggestion = (label: string, mimeType: string): AutocompleteTagInputSuggestion => ({
  value: mimeType,
  label,
  description: mimeType,
});

/**
 * Suggested Attachment types, in display order. Mirrors the DIAL admin app's
 * attachment-types suggestions so both editors offer the same list. Labels are
 * file-format identifiers and are not translated.
 */
export const ATTACHMENT_TYPE_SUGGESTIONS: AutocompleteTagInputSuggestion[] = [
  suggestion('GIF', MIMEType.GIF),
  suggestion('PNG', MIMEType.PNG),
  suggestion('JPG', MIMEType.JPEG),
  suggestion('TIFF', 'image/tiff'),
  suggestion('JSON', MIMEType.JSON),
  suggestion('XML', MIMEType.XML),
  suggestion('HTML', 'application/html'),
  suggestion('CSV', 'application/csv'),
  suggestion('TEXT-JSON', 'text/json'),
  suggestion('TEXT-XML', 'text/xml'),
  suggestion('TEXT-HTML', MIMEType.HTML),
  suggestion('TEXT-CSV', MIMEType.CSV),
  suggestion('MARKDOWN', MIMEType.Markdown),
  suggestion('PLAIN-TEXT', MIMEType.Plain),
  suggestion('CSS', MIMEType.CSS),
  suggestion('JAVASCRIPT', MIMEType.JavaScript),
  suggestion('PDF', MIMEType.PDF),
  suggestion('APNG', 'image/apng'),
  suggestion('AVIF', 'image/avif'),
  suggestion('BMP', MIMEType.BMP),
  suggestion('ICO', 'image/vnd.microsoft.icon'),
  suggestion('SVG', MIMEType.SVG),
  suggestion('WEBP', MIMEType.WebP),
  suggestion('X-ICON', 'image/x-icon'),
  suggestion('DOC', 'application/msword'),
  suggestion('DOCX', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'),
  suggestion('PDB', 'chemical/x-pdb'),
  suggestion('PLOTLY', 'application/vnd.plotly.v1+json'),
  suggestion('PPT', 'application/vnd.ms-powerpoint'),
  suggestion('PPTX', 'application/vnd.openxmlformats-officedocument.presentationml.presentation'),
  suggestion('TTYD-TABLE', 'application/dial-ttyd-table'),
  suggestion('UNKNOWN-BINARY', 'application/octet-stream'),
  suggestion('XLS', 'application/vnd.ms-excel'),
  suggestion('XLSX', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'),
];
