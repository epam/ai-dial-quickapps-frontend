/** Well-known MIME type constants used in DIAL API attachments. */
export enum MIMEType {
  // Text / markup
  /** GitHub-flavoured Markdown. */
  Markdown = 'text/markdown',
  /** Plain unformatted text. */
  Plain = 'text/plain',
  /** HTML markup. */
  HTML = 'text/html',
  /** XHTML markup. */
  XHTML = 'application/xhtml+xml',
  /** Cascading Style Sheets. */
  CSS = 'text/css',
  /** JavaScript source. */
  JavaScript = 'text/javascript',
  /** TypeScript source (non-standard but widely used). */
  TypeScript = 'text/typescript',
  /** CSV spreadsheet data. */
  CSV = 'text/csv',
  /** JSON data (text type, non-standard but widely used). */
  TextJSON = 'text/json',
  /** XML document (text type). */
  TextXML = 'text/xml',

  // Data formats
  /** JSON data. */
  JSON = 'application/json',
  /** XML document (application type). */
  XML = 'application/xml',
  /** HTML markup (application type, non-standard). */
  ApplicationHTML = 'application/html',
  /** CSV data (application type, non-standard). */
  ApplicationCSV = 'application/csv',
  /** PDF document. */
  PDF = 'application/pdf',
  /** ZIP archive. */
  ZIP = 'application/zip',
  /** GZIP-compressed data. */
  GZIP = 'application/gzip',
  /** Arbitrary binary data. */
  OctetStream = 'application/octet-stream',
  /** Plotly chart JSON. */
  Plotly = 'application/vnd.plotly.v1+json',
  /** DIAL TTYD table. */
  DialTtydTable = 'application/dial-ttyd-table',
  /** Protein Data Bank structure. */
  PDB = 'chemical/x-pdb',

  // Office documents
  /** Microsoft Word (`.doc`). */
  DOC = 'application/msword',
  /** Microsoft Word (`.docx`). */
  DOCX = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  /** Microsoft PowerPoint (`.ppt`). */
  PPT = 'application/vnd.ms-powerpoint',
  /** Microsoft PowerPoint (`.pptx`). */
  PPTX = 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  /** Microsoft Excel (`.xls`). */
  XLS = 'application/vnd.ms-excel',
  /** Microsoft Excel (`.xlsx`). */
  XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',

  // Images
  /** JPEG raster image. */
  JPEG = 'image/jpeg',
  /** PNG raster image. */
  PNG = 'image/png',
  /** GIF image. */
  GIF = 'image/gif',
  /** WebP image. */
  WebP = 'image/webp',
  /** BMP bitmap image. */
  BMP = 'image/bmp',
  /** SVG vector image. */
  SVG = 'image/svg+xml',
  /** TIFF raster image. */
  TIFF = 'image/tiff',
  /** Animated PNG image. */
  APNG = 'image/apng',
  /** AVIF image. */
  AVIF = 'image/avif',
  /** ICO icon (IANA-registered type). */
  ICO = 'image/vnd.microsoft.icon',
  /** ICO icon (legacy type). */
  XIcon = 'image/x-icon',

  // Audio
  /** MPEG audio (`.mp3`). */
  MP3 = 'audio/mpeg',
  /** WAV audio. */
  WAV = 'audio/wav',
  /** Ogg audio. */
  OGG = 'audio/ogg',
}

/** Well-known file extension constants used as fallback when a MIME type is unavailable. */
export enum FileExtension {
  /** PDF document. */
  PDF = 'pdf',
  /** Markdown document (`.md`). */
  Markdown = 'md',
  /** Markdown document, alternate extension (`.markdown`). */
  MarkdownAlt = 'markdown',
  /** JSON document. */
  JSON = 'json',
}
