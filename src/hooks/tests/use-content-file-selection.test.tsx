import { act, type FC } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { CatalogContentNodeType, type CatalogItem } from '@epam/ai-dial-catalog';

import {
  useContentFileSelection,
  type UseContentFileSelectionResult,
} from '@/hooks/use-content-file-selection';

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
              { type: CatalogContentNodeType.File, id: 'reference/guide.pdf', name: 'guide.pdf' },
            ],
          },
        ],
      },
    },
  }) as unknown as CatalogItem;

let latest: UseContentFileSelectionResult;

const Probe: FC<{ item?: CatalogItem }> = ({ item }) => {
  latest = useContentFileSelection(item);
  return null;
};

let root: Root;
let container: HTMLDivElement;

const render = async (item?: CatalogItem) => {
  await act(async () => root.render(<Probe item={item} />));
};

beforeEach(() => {
  (globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

describe('useContentFileSelection', () => {
  it('opens on the base file with every folder expanded and nothing picked', async () => {
    await render(skillItem());

    expect(latest.selectedFileId).toBe('SKILL.md');
    expect(latest.pickedFile).toBeNull();
    expect([...latest.expandedFolderIds]).toEqual(['reference']);
  });

  it('picks another file with its tree name', async () => {
    await render(skillItem());

    act(() => latest.onSelectFile('reference/guide.pdf'));

    expect(latest.selectedFileId).toBe('reference/guide.pdf');
    expect(latest.pickedFile).toEqual({ id: 'reference/guide.pdf', name: 'guide.pdf' });
  });

  it('clears the pick when the base file is chosen again', async () => {
    await render(skillItem());

    act(() => latest.onSelectFile('reference/guide.pdf'));
    act(() => latest.onSelectFile('SKILL.md'));

    expect(latest.selectedFileId).toBe('SKILL.md');
    expect(latest.pickedFile).toBeNull();
  });

  it('names a file missing from the tree by the last segment of its id', async () => {
    await render(skillItem());

    act(() => latest.onSelectFile('scripts/run.py'));

    expect(latest.pickedFile).toEqual({ id: 'scripts/run.py', name: 'run.py' });
  });

  it('resets the pick when the item changes', async () => {
    await render(skillItem());
    act(() => latest.onSelectFile('reference/guide.pdf'));

    await render(skillItem('skills/public/other'));

    expect(latest.selectedFileId).toBe('SKILL.md');
    expect(latest.pickedFile).toBeNull();
  });

  it('toggles a folder and the selector', async () => {
    await render(skillItem());

    act(() => latest.onToggleFolder('reference'));
    act(() => latest.onFileSelectorOpenChange(true));

    expect(latest.expandedFolderIds.has('reference')).toBe(false);
    expect(latest.isFileSelectorOpen).toBe(true);
  });
});
