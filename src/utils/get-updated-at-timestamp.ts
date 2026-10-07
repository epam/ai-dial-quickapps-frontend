/**
 * Normalizes an `updatedAt` value into a comparable epoch-ms number. DIAL
 * Core has been observed returning this field as either an ISO string or an
 * epoch-ms number depending on entity type, so callers must not assume a
 * string (e.g. `localeCompare`/string sort throws when it's actually a
 * number). Missing or unparsable values sort as oldest (0).
 */
export const getUpdatedAtTimestamp = (value?: string | number): number => {
  if (value == null) return 0;
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? 0 : time;
};

/** An `updatedAt` value as a localized medium date, or `''` when it is missing or unparsable. */
export const formatUpdatedAtDate = (value: string | number | undefined, language: string): string => {
  const timestamp = getUpdatedAtTimestamp(value);
  if (timestamp <= 0) return '';
  return new Intl.DateTimeFormat(language, { dateStyle: 'medium' }).format(timestamp);
};
