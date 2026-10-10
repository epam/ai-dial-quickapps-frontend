import { OoxmlFileType } from '@epam/ai-dial-attachment-canvas';
import type { AttachmentCanvasUrlResolvers } from '@epam/ai-dial-chat-hooks/file-manager-canvas';
import type { DisplayAttachment } from '@epam/ai-dial-chat-shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  HTML_PREVIEW_FRAME_URL,
  skillFileCanvasResolvers,
} from '@/utils/skill-file-canvas-resolvers';

const hooks = vi.hoisted(() => ({
  resolveTextCanvasContent: vi.fn(),
  resolveOoxmlCanvasContent: vi.fn(),
  resolveHtmlCanvasContent: vi.fn(),
  resolveVisualizerCanvasContent: vi.fn(),
  hasAttachmentTextSource: vi.fn(),
}));

vi.mock('@epam/ai-dial-chat-hooks/file-manager-canvas', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  ...hooks,
}));

const csv = {
  id: 'data/people.csv',
  name: 'people.csv',
  contentType: 'text/csv',
  file: new File(['name,role\nAnn,Designer'], 'people.csv', { type: 'text/csv' }),
} as unknown as DisplayAttachment;

const urlResolversOf = (mock: ReturnType<typeof vi.fn>, argIndex: number) =>
  mock.mock.calls[0][argIndex] as AttachmentCanvasUrlResolvers;

beforeEach(() => {
  vi.clearAllMocks();
});

describe('skillFileCanvasResolvers', () => {
  it('resolves a CSV through the shared OOXML resolver', async () => {
    const content = { type: 'ooxml' };
    hooks.resolveOoxmlCanvasContent.mockResolvedValue(content);

    await expect(
      skillFileCanvasResolvers.resolveOoxmlContent(csv, OoxmlFileType.Csv),
    ).resolves.toBe(content);
    expect(hooks.resolveOoxmlCanvasContent).toHaveBeenCalledWith(
      csv,
      expect.any(Object),
      OoxmlFileType.Csv,
    );
  });

  it('never resolves a DIAL file URL, since a skill file is in memory', async () => {
    hooks.resolveTextCanvasContent.mockResolvedValue(null);

    await skillFileCanvasResolvers.resolveTextContent(csv);
    const urls = urlResolversOf(hooks.resolveTextCanvasContent, 1);

    expect(urls.resolveDialFileDownloadUrl('files/bucket/a.txt')).toBeUndefined();
    expect(urls.resolveDialUrl(csv)).toBeUndefined();
    expect(urls.resolveDialFileMetadataUrl('files/bucket/a.txt')).toBeUndefined();
    expect(skillFileCanvasResolvers.resolveContentUrl(csv)).toBeUndefined();
    expect(skillFileCanvasResolvers.resolveReferencePdfContent(csv)).toBeNull();
  });

  it('renders inline HTML through chat-api’s preview frame', async () => {
    hooks.resolveHtmlCanvasContent.mockResolvedValue(null);

    await skillFileCanvasResolvers.resolveHtmlContent(csv);

    expect(urlResolversOf(hooks.resolveHtmlCanvasContent, 1).htmlSrcdocHostUrl).toBe(
      HTML_PREVIEW_FRAME_URL,
    );
  });

  it('passes an empty theme to a visualizer when none is given', async () => {
    hooks.resolveVisualizerCanvasContent.mockResolvedValue(null);
    const visualizer = { title: 'chart' } as never;

    await skillFileCanvasResolvers.resolveVisualizerContent(csv, visualizer);

    expect(hooks.resolveVisualizerCanvasContent).toHaveBeenCalledWith(
      csv,
      expect.any(Object),
      visualizer,
      '',
    );
  });

  it('asks the shared resolver whether a file has a text source', () => {
    hooks.hasAttachmentTextSource.mockReturnValue(true);

    expect(skillFileCanvasResolvers.hasTextSource(csv)).toBe(true);
  });
});
