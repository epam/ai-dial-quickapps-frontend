import { MIMEType } from '@/types/mime-type';

import type { AutocompleteTagInputSuggestion } from '@epam/ai-dial-ui-kit';

const suggestion = (label: string, mimeType: MIMEType): AutocompleteTagInputSuggestion => ({
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
  suggestion('TIFF', MIMEType.TIFF),
  suggestion('JSON', MIMEType.JSON),
  suggestion('XML', MIMEType.XML),
  suggestion('HTML', MIMEType.ApplicationHTML),
  suggestion('CSV', MIMEType.ApplicationCSV),
  suggestion('TEXT-JSON', MIMEType.TextJSON),
  suggestion('TEXT-XML', MIMEType.TextXML),
  suggestion('TEXT-HTML', MIMEType.HTML),
  suggestion('TEXT-CSV', MIMEType.CSV),
  suggestion('MARKDOWN', MIMEType.Markdown),
  suggestion('PLAIN-TEXT', MIMEType.Plain),
  suggestion('CSS', MIMEType.CSS),
  suggestion('JAVASCRIPT', MIMEType.JavaScript),
  suggestion('PDF', MIMEType.PDF),
  suggestion('APNG', MIMEType.APNG),
  suggestion('AVIF', MIMEType.AVIF),
  suggestion('BMP', MIMEType.BMP),
  suggestion('ICO', MIMEType.ICO),
  suggestion('SVG', MIMEType.SVG),
  suggestion('WEBP', MIMEType.WebP),
  suggestion('X-ICON', MIMEType.XIcon),
  suggestion('DOC', MIMEType.DOC),
  suggestion('DOCX', MIMEType.DOCX),
  suggestion('PDB', MIMEType.PDB),
  suggestion('PLOTLY', MIMEType.Plotly),
  suggestion('PPT', MIMEType.PPT),
  suggestion('PPTX', MIMEType.PPTX),
  suggestion('TTYD-TABLE', MIMEType.DialTtydTable),
  suggestion('UNKNOWN-BINARY', MIMEType.OctetStream),
  suggestion('XLS', MIMEType.XLS),
  suggestion('XLSX', MIMEType.XLSX),
];
