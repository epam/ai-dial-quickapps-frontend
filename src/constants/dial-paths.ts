export const DIAL_HIDDEN_FOLDER_MARKER = '.dial_folder';

/** Bucket segment of entities shared with every user (the Organization scope). */
export const PUBLIC_BUCKET_SEGMENT = 'public';

/** Entity roots whose second segment is a publisher path, not a bucket (`model/openai/gpt-4o`). */
export const MODEL_ROOTS: ReadonlySet<string> = new Set(['model', 'models']);
