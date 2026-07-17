// DIAL Core file resource ids (e.g. from the file picker) come back percent-encoded.
// The app stores context/skill file URLs decoded internally — see decodeDialPath /
// encodeDialPath in dialClient.ts, which is the single place re-encoding happens
// before a save. Decode fully here (looping in case the source handed back a value
// encoded more than once) so newly attached files match that internal convention.
export const decodeFileUrl = (url: string): string => {
  let current = url;
  for (let i = 0; i < 5; i++) {
    let next: string;
    try {
      next = decodeURIComponent(current);
    } catch {
      return current;
    }
    if (next === current) return current;
    current = next;
  }
  return current;
};
