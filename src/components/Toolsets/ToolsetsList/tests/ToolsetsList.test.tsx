import { act, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { CatalogItemCredentials } from '@epam/ai-dial-catalog';
import { type DialToolset, ToolsetAuthStatus, ToolsetAuthType } from '@/types/dial-entities';

import ToolsetsList from '../ToolsetsList';

const makeToolset = (id: string, name: string, overrides: Partial<DialToolset> = {}) =>
  ({ id, reference: id, name, type: 'toolset', ...overrides }) as DialToolset;

const FIGMA = makeToolset('toolsets/public/figma', 'Figma', {
  version: '1.0.0',
  authSettings: {
    authenticationType: ToolsetAuthType.OAuth,
    authStatus: ToolsetAuthStatus.SignedOut,
  },
});
const JIRA = makeToolset('toolsets/public/jira', 'Jira', {
  authSettings: { authenticationType: ToolsetAuthType.None },
});

vi.mock('@/hooks/use-translation', () => ({
  useTranslation: () => ({
    language: 'en',
    t: (key: string, options?: Record<string, string>) =>
      key.replace(/\{\{(\w+)\}\}/g, (_, name: string) => options?.[name] ?? ''),
  }),
}));
vi.mock('@/hooks/use-add-on-entity-map', () => ({
  useAddOnEntityMap: () => ({ [FIGMA.id]: FIGMA, [JIRA.id]: JIRA }),
}));
// The real badge needs the catalog's tooltip layer; this stub keeps its
// contract: it shows only while the toolset is signed out at every level.
vi.mock('@epam/ai-dial-catalog', () => ({
  CredentialsBadge: ({
    credentials,
    loggedOutLabel,
  }: {
    credentials?: CatalogItemCredentials;
    loggedOutLabel?: string;
  }) => {
    const isSignedOut =
      credentials != null &&
      credentials.authenticationType !== 'NONE' &&
      credentials.userStatus !== 'SIGNED_IN' &&
      credentials.globalStatus !== 'SIGNED_IN';
    return isSignedOut ? <span data-testid="badge">{loggedOutLabel}</span> : null;
  },
}));

vi.mock('@/components/Toolsets/ToolsetDetailsPopup/ToolsetDetailsPopup', () => ({
  ToolsetDetailsPopup: ({
    toolsetId,
    toolset,
    onRemove,
    onClose,
  }: {
    toolsetId: string;
    toolset?: DialToolset;
    onRemove: (id: string) => void;
    onClose: () => void;
  }) => (
    <div role="dialog" aria-label={toolset?.id ?? toolsetId}>
      <button type="button" onClick={() => (onRemove(toolsetId), onClose())}>
        Delete
      </button>
    </div>
  ),
}));

let root: Root;
let container: HTMLDivElement;

interface HarnessProps {
  initial: string[];
  isReadonly?: boolean;
}

const Harness = ({ initial, isReadonly = false }: HarnessProps) => {
  const [allIds, setAllIds] = useState(initial);
  return (
    <>
      <output data-testid="value">{allIds.join('|')}</output>
      <ToolsetsList
        ids={allIds.filter((id) => id.startsWith('toolsets/'))}
        allIds={allIds}
        isReadonly={isReadonly}
        onChange={setAllIds}
      />
    </>
  );
};

const render = async (initial: string[], isReadonly?: boolean) => {
  await act(async () => {
    root.render(<Harness initial={initial} isReadonly={isReadonly} />);
  });
  // Let the lazily loaded badge module resolve and render.
  await act(async () => {
    await import('@/components/Toolsets/ToolsetBadge/ToolsetBadge');
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
};

const getButton = (name: string) =>
  [...container.querySelectorAll('button')].find(
    (button) => button.getAttribute('aria-label') === name,
  );

const getValue = () => container.querySelector('[data-testid="value"]')?.textContent;

beforeEach(() => {
  (globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  document.documentElement.dir = '';
});

describe('ToolsetsList', () => {
  it('lists the toolsets in order with their names and versions', async () => {
    await render([FIGMA.id, JIRA.id]);

    const items = [...container.querySelectorAll('li')].map((li) => li.textContent);
    expect(items[0]).toContain('Figma');
    expect(items[0]).toContain('1.0.0');
    expect(items[1]).toContain('Jira');
    expect(getButton('Figma details')).toBeTruthy();
  });

  it('badges a signed-out toolset and describes it as logged out', async () => {
    await render([FIGMA.id, JIRA.id]);

    const badges = container.querySelectorAll('[data-testid="badge"]');
    expect(badges).toHaveLength(1);
    expect(badges[0].closest('li')?.textContent).toContain('Figma');
    expect(badges[0].textContent).toBe('Authorize to use this toolset.');
    expect(container.textContent).toContain('Logged out toolset.');
  });

  it('names a toolset missing from the catalog after its id and flags it', async () => {
    await render(['toolsets/public/old-tool']);

    expect(getButton('old-tool details')).toBeTruthy();
    expect(container.textContent).toContain('needs to be removed');
  });

  it('removes only that toolset and moves focus to the remaining one', async () => {
    await render(['applications/public/agent', FIGMA.id, JIRA.id]);

    await act(async () => getButton('Remove Figma')?.click());

    expect(getValue()).toBe(`applications/public/agent|${JIRA.id}`);
    expect(document.activeElement).toBe(getButton('Jira details'));
  });

  it('renders no remove button in a read-only application', async () => {
    await render([FIGMA.id], true);

    expect(getButton('Figma details')).toBeTruthy();
    expect(getButton('Remove Figma')).toBeUndefined();
  });

  it('keeps avatar, name and trash in reading order in a right-to-left document', async () => {
    document.documentElement.dir = 'rtl';
    await render([FIGMA.id]);

    const details = getButton('Figma details') as HTMLButtonElement;
    const remove = getButton('Remove Figma') as HTMLButtonElement;
    expect(details.firstElementChild?.getAttribute('aria-hidden')).toBe('true');
    expect(details.className).toContain('text-start');
    expect(details.compareDocumentPosition(remove) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('renders nothing without attached toolsets', async () => {
    await render(['applications/public/agent']);

    expect(container.querySelector('ul')).toBeNull();
  });
});

describe('ToolsetsList details popup', () => {
  it('opens the activated toolset and detaches it on Delete', async () => {
    await render([FIGMA.id, JIRA.id]);

    await act(async () => {
      getButton('Jira details')?.click();
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    expect(container.querySelector('[role="dialog"]')?.getAttribute('aria-label')).toBe(JIRA.id);

    await act(async () => {
      [...container.querySelectorAll('button')].find((b) => b.textContent === 'Delete')?.click();
    });

    expect(getValue()).toBe(FIGMA.id);
    expect(container.querySelector('[role="dialog"]')).toBeNull();
  });
});
