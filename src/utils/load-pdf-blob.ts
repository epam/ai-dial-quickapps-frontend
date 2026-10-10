/**
 * Loads a URL-backed PDF for the attachment canvas. A skill package file is
 * always in memory, so this only runs for a same-origin URL, without any
 * cross-origin credentials.
 */
export const loadPdfBlob = async (url: string): Promise<Blob> => {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`PDF request failed with status ${response.status}`);
  return response.blob();
};
