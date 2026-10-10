/*
 * `pdfjs-dist`'s worker is process-wide state the app owns, not the
 * attachment-canvas library (as in the chat app). Both imports are dynamic,
 * so `pdfjs-dist` is only fetched the first time a PDF is opened.
 */
let configurePdfWorkerPromise: Promise<void> | null = null;

/** Points `pdfjs-dist`'s worker at the bundled worker script. Idempotent; a failed attempt can be retried. */
export const configurePdfWorker = (): Promise<void> => {
  if (configurePdfWorkerPromise == null) {
    configurePdfWorkerPromise = (async () => {
      try {
        const [{ GlobalWorkerOptions }, { default: pdfWorkerUrl }] = await Promise.all([
          import('pdfjs-dist'),
          import('pdfjs-dist/build/pdf.worker.min.mjs?url'),
        ]);
        GlobalWorkerOptions.workerSrc = pdfWorkerUrl;
      } catch (error) {
        configurePdfWorkerPromise = null;
        throw error;
      }
    })();
  }
  return configurePdfWorkerPromise;
};
