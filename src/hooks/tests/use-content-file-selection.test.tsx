import { act, type FC } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  CatalogContentNodeType,
  CatalogContentPreviewType,
  type CatalogItem,
} from '@epam/ai-dial-catalog';

import {
  useContentFileSelection,
  type UseContentFileSelectionResult,
} from '@/hooks/use-content-file-selection';

const ERROR = 'Failed to load this file.';

const skillItem = (id = 'skills/public/research'): CatalogItem =>
  ({
    id,
    details: {
      promptContent: {
        content: 'manifest body',
        selectedFileId: 'SKILL.md',
        files: [
          { type: CatalogContentNodeType.File, id: 'SKILL.md', name: 'SKILL.md' },
          {
            type: CatalogContentNodeType.Folder,
            id: 'reference',
            name: 'reference',
            items: [
              { type: CatalogContentNodeType.File, id: 'reference/guide.md', name: 'guide.md' },
            ],
          },
        ],
      },
    },
  }) as unknown as CatalogItem;

let latest: UseContentFileSelectionResult;
let load: ReturnType<typeof vi.fn<(fileId: string) => Promise<string | undefined>>>;

const Probe: FC<{ item?: CatalogItem }> = ({ item }) => {
  latest = useContentFileSelection(item, load, ERROR);
  return null;
};

let root: Root;
let container: HTMLDivElement;

const render = async (item?: CatalogItem) => {
  await act(async () => root.render(<Probe item={item} />));
};

beforeEach(() => {
  (globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;
  load = vi.fn<(fileId: string) => Promise<string | undefined>>();
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

describe('useContentFileSelection', () => {
  it('opens on the base file with every folder expanded and no preview', async () => {
    await render(skillItem());

    expect(latest.selectedFileId).toBe('SKILL.md');
    expect(latest.filePreview).toBeNull();
    expect([...latest.expandedFolderIds]).toEqual(['reference']);
  });

  it('loads another file and shows it as Markdown', async () => {
    load.mockResolvedValue('# Guide');
    await render(skillItem());

    await act(async () => latest.onSelectFile('reference/guide.md'));

    expect(load).toHaveBeenCalledWith('reference/guide.md');
    expect(latest.selectedFileId).toBe('reference/guide.md');
    expect(latest.isFileLoading).toBe(false);
    expect(latest.filePreview).toEqual({
      type: CatalogContentPreviewType.Markdown,
      text: '# Guide',
    });
  });

  it('returns to the base file without a request', async () => {
    load.mockResolvedValue('# Guide');
    await render(skillItem());

    await act(async () => latest.onSelectFile('reference/guide.md'));
    await act(async () => latest.onSelectFile('SKILL.md'));

    expect(load).toHaveBeenCalledTimes(1);
    expect(latest.selectedFileId).toBe('SKILL.md');
    expect(latest.filePreview).toBeNull();
  });

  it('shows the error text when a file fails to load', async () => {
    load.mockRejectedValue(new Error('404'));
    await render(skillItem());

    await act(async () => latest.onSelectFile('reference/guide.md'));

    expect(latest.filePreview).toEqual({ type: CatalogContentPreviewType.Text, text: ERROR });
  });

  it('drops the response of a superseded pick', async () => {
    let resolveFirst: (text: string) => void = () => undefined;
    load
      .mockImplementationOnce(() => new Promise((resolve) => (resolveFirst = resolve)))
      .mockResolvedValueOnce('second');
    await render(skillItem());

    await act(async () => latest.onSelectFile('reference/guide.md'));
    await act(async () => latest.onSelectFile('other.md'));
    await act(async () => resolveFirst('first'));

    expect(latest.selectedFileId).toBe('other.md');
    expect(latest.filePreview).toEqual({
      type: CatalogContentPreviewType.Markdown,
      text: 'second',
    });
  });

  it('resets the pick when the item changes', async () => {
    load.mockResolvedValue('# Guide');
    await render(skillItem());
    await act(async () => latest.onSelectFile('reference/guide.md'));

    await render(skillItem('skills/public/other'));

    expect(latest.selectedFileId).toBe('SKILL.md');
    expect(latest.filePreview).toBeNull();
  });

  it('toggles a folder and the selector', async () => {
    await render(skillItem());

    act(() => latest.onToggleFolder('reference'));
    act(() => latest.onFileSelectorOpenChange(true));

    expect(latest.expandedFolderIds.has('reference')).toBe(false);
    expect(latest.isFileSelectorOpen).toBe(true);
  });
});
