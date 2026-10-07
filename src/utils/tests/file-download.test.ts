import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  DownloadDestinationType,
  prepareDownloadDestination,
  triggerBrowserDownload,
} from '@/utils/file-download';

type PickerWindow = Window & { showSaveFilePicker?: unknown };

afterEach(() => {
  delete (window as PickerWindow).showSaveFilePicker;
  vi.restoreAllMocks();
});

describe('prepareDownloadDestination', () => {
  it('falls back to a blob download without the File System Access API', async () => {
    await expect(prepareDownloadDestination('a.txt')).resolves.toEqual({
      type: DownloadDestinationType.Blob,
    });
  });

  it('streams into the file the user picked', async () => {
    const writable = {} as WritableStream<Uint8Array>;
    const picker = vi.fn().mockResolvedValue({ createWritable: async () => writable });
    (window as PickerWindow).showSaveFilePicker = picker;

    const destination = await prepareDownloadDestination('report.pdf', 'application/pdf');

    expect(destination).toEqual({ type: DownloadDestinationType.Stream, writable });
    expect(picker).toHaveBeenCalledWith({
      suggestedName: 'report.pdf',
      types: [{ description: 'application/pdf', accept: { 'application/pdf': ['.pdf'] } }],
    });
  });

  it('reports a cancelled picker', async () => {
    (window as PickerWindow).showSaveFilePicker = vi
      .fn()
      .mockRejectedValue(new DOMException('cancel', 'AbortError'));

    await expect(prepareDownloadDestination('a')).resolves.toEqual({
      type: DownloadDestinationType.Cancelled,
    });
  });

  it('falls back to a blob download in a cross-origin iframe', async () => {
    (window as PickerWindow).showSaveFilePicker = vi
      .fn()
      .mockRejectedValue(new DOMException('blocked', 'SecurityError'));

    await expect(prepareDownloadDestination('a')).resolves.toEqual({
      type: DownloadDestinationType.Blob,
    });
  });

  it('rethrows other picker errors', async () => {
    (window as PickerWindow).showSaveFilePicker = vi.fn().mockRejectedValue(new Error('boom'));

    await expect(prepareDownloadDestination('a')).rejects.toThrow('boom');
  });
});

describe('triggerBrowserDownload', () => {
  let clicked: HTMLAnchorElement[];

  beforeEach(() => {
    clicked = [];
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      clicked.push(this);
    });
    URL.createObjectURL = vi.fn(() => 'blob:1');
    URL.revokeObjectURL = vi.fn();
  });

  it('saves a blob under the server-provided file name', async () => {
    const response = new Response('x', {
      headers: { 'Content-Disposition': 'attachment; filename="../report.pdf"' },
    });

    await triggerBrowserDownload(response, 'fallback.bin');

    expect(clicked[0].download).toBe('..report.pdf');
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:1');
  });

  it('uses the fallback name without Content-Disposition', async () => {
    await triggerBrowserDownload(new Response('x'), 'fallback.bin');

    expect(clicked[0].download).toBe('fallback.bin');
  });

  it('does nothing for a cancelled destination', async () => {
    await triggerBrowserDownload(new Response('x'), 'a', {
      type: DownloadDestinationType.Cancelled,
    });

    expect(clicked).toHaveLength(0);
  });

  it('pipes the body into a stream destination', async () => {
    const chunks: Uint8Array[] = [];
    const writable = new WritableStream<Uint8Array>({ write: (c) => void chunks.push(c) });

    await triggerBrowserDownload(new Response('abc'), 'a', {
      type: DownloadDestinationType.Stream,
      writable,
    });

    expect(new TextDecoder().decode(chunks[0])).toBe('abc');
    expect(clicked).toHaveLength(0);
  });
});
