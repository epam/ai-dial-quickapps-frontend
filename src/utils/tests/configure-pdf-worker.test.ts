import { beforeEach, describe, expect, it, vi } from 'vitest';

const GlobalWorkerOptions = { workerSrc: '' };

const mockPdfjs = (load: () => object) => {
  vi.doMock('pdfjs-dist', load);
  vi.doMock('pdfjs-dist/build/pdf.worker.min.mjs?url', () => ({
    default: '/assets/pdf.worker.js',
  }));
};

beforeEach(() => {
  vi.resetModules();
  GlobalWorkerOptions.workerSrc = '';
});

describe('configurePdfWorker', () => {
  it('points pdf.js at the bundled worker once across calls', async () => {
    const load = vi.fn(() => ({ GlobalWorkerOptions }));
    mockPdfjs(load);
    const { configurePdfWorker } = await import('@/utils/configure-pdf-worker');

    await Promise.all([configurePdfWorker(), configurePdfWorker()]);
    await configurePdfWorker();

    expect(GlobalWorkerOptions.workerSrc).toBe('/assets/pdf.worker.js');
    expect(load).toHaveBeenCalledTimes(1);
  });

  it('can be retried after a failed load', async () => {
    let shouldFail = true;
    mockPdfjs(() => {
      if (shouldFail) throw new Error('chunk failed');
      return { GlobalWorkerOptions };
    });
    const { configurePdfWorker } = await import('@/utils/configure-pdf-worker');

    await expect(configurePdfWorker()).rejects.toThrow();

    shouldFail = false;
    await configurePdfWorker();

    expect(GlobalWorkerOptions.workerSrc).toBe('/assets/pdf.worker.js');
  });
});
