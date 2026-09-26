export const SUPPORTED_UPLOAD_EXTENSIONS = [
  'pdf',
  'txt',
  'md',
  'docx',
  'doc',
  'epub',
  'rtf',
  'odt',
  'html',
  'htm',
  'csv',
  'log',
] as const;

export const SUPPORTED_UPLOAD_EXTENSION_SET = new Set<string>(SUPPORTED_UPLOAD_EXTENSIONS);

export const SUPPORTED_UPLOAD_ACCEPT = SUPPORTED_UPLOAD_EXTENSIONS.map((ext) => `.${ext}`).join(',');

export const MAX_UPLOAD_BYTES = 100 * 1024 * 1024;

export const MAX_UPLOAD_MB = MAX_UPLOAD_BYTES / (1024 * 1024);

export const SUPPORTED_UPLOAD_LABEL =
  `PDF, DOCX, DOC, EPUB, RTF, ODT, TXT, MD, HTML, CSV up to ${MAX_UPLOAD_MB}MB`;

export const TEXT_PREVIEW_FILE_TYPES = new Set([
  'txt',
  'text',
  'md',
  'markdown',
  'html',
  'htm',
  'csv',
  'log',
]);
