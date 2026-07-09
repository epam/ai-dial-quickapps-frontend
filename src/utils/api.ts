const PATH_KEY_SEPARATOR = '__';

const safeEncodeURIComponent = (s: string) =>
  s.replace(/[^\uD800-􏰀-\uDFFF]+/gm, (match) =>
    encodeURIComponent(match),
  );

const constructPath = (...parts: string[]) => parts.join('/');

export const encodeApiUrl = (path: string): string =>
  constructPath(...path.split('/').map(safeEncodeURIComponent));

export const decodeApiUrl = (path?: string): string =>
  constructPath(...(path?.split('/').map((p) => decodeURIComponent(p)) ?? []));

export const isApplicationId = (id?: string) =>
  id?.startsWith('applications/') ?? false;

export const isToolsetId = (id?: string) =>
  id?.startsWith('toolsets/') ?? false;

export const splitEntityId = (id: string) => {
  const parts = id.split('/');
  const name = parts[parts.length - 1];
  return { name };
};

export const getEntityNameFromId = (
  id: string,
  options?: { removeVersion?: boolean },
): string => {
  const { name } = splitEntityId(id);
  if (options?.removeVersion) {
    return parseEntityApiKey(name, { parseVersion: true }).name;
  }
  return name;
};

export const getVersionFromId = (id: string): string | undefined => {
  const { name } = splitEntityId(id);
  return parseEntityApiKey(name, { parseVersion: true }).version;
};

export const parseEntityApiKey = (
  apiKey: string,
  options?: { parseVersion?: boolean },
): { name: string; version?: string } => {
  const parts = apiKey.split(PATH_KEY_SEPARATOR);
  if (options?.parseVersion && parts.length >= 2) {
    const version = parts.pop();
    return { name: parts.join(PATH_KEY_SEPARATOR), version };
  }
  return { name: apiKey };
};
