import { act, useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { CatalogItemCredentials } from '@epam/ai-dial-catalog';
import { ApplicationEditorI18nKeys, CatalogI18nKeys } from '@/constants/translation-keys';
import { getButton } from '@/test-utils/dom';
import { setupTestRoot } from '@/test-utils/test-root';
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

const dom = setupTestRoot();

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
    dom.root.render(<Harness initial={initial} isReadonly={isReadonly} />);
  });
  // Let the lazily loaded badge module resolve and render.
  await act(async () => {
    await import('@/components/Toolsets/ToolsetBadge/ToolsetBadge');
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
};

// The labels come from `t`, which the test mock returns as bare keys, so an
// item's buttons are found inside the list item showing the toolset's name.
const getItem = (name: string) =>
  [...dom.container.querySelectorAll('li')].find((item) => item.textContent?.includes(name));

const getDetailsButton = (name: string) => {
  const item = getItem(name);
  return item && getButton(ApplicationEditorI18nKeys.AddOnsDetails, item);
};

const getRemoveButton = (name: string) => {
  const item = getItem(name);
  return item && getButton(ApplicationEditorI18nKeys.AddOnsRemove, item);
};

const getValue = () => dom.container.querySelector('[data-testid="value"]')?.textContent;

afterEach(() => {
  document.documentElement.dir = '';
});

describe('ToolsetsList', () => {
  it('lists the toolsets in order with their names and versions', async () => {
    await render([FIGMA.id, JIRA.id]);

    const items = [...dom.container.querySelectorAll('li')].map((li) => li.textContent);
    expect(items[0]).toContain('Figma');
    expect(items[0]).toContain('1.0.0');
    expect(items[1]).toContain('Jira');
    expect(getDetailsButton('Figma')).toBeTruthy();
  });

  it('badges a signed-out toolset and describes it as logged out', async () => {
    await render([FIGMA.id, JIRA.id]);

    const badges = dom.container.querySelectorAll('[data-testid="badge"]');
    expect(badges).toHaveLength(1);
    expect(badges[0].closest('li')?.textContent).toContain('Figma');
    expect(badges[0].textContent).toBe(CatalogI18nKeys.CredentialsBadgeLoggedOut);
    expect(dom.container.textContent).toContain(ApplicationEditorI18nKeys.AddOnsLoggedOutToolset);
  });

  it('names a toolset missing from the catalog after its id and flags it', async () => {
    await render(['toolsets/public/old-tool']);

    expect(getDetailsButton('old-tool')).toBeTruthy();
    expect(dom.container.textContent).toContain(
      ApplicationEditorI18nKeys.AddOnsUnavailableRemovalRequired,
    );
  });

  it('removes only that toolset and moves focus to the remaining one', async () => {
    await render(['applications/public/agent', FIGMA.id, JIRA.id]);

    await act(async () => getRemoveButton('Figma')?.click());

    expect(getValue()).toBe(`applications/public/agent|${JIRA.id}`);
    expect(document.activeElement).toBe(getDetailsButton('Jira'));
  });

  it('renders no remove button in a read-only application', async () => {
    await render([FIGMA.id], true);

    expect(getDetailsButton('Figma')).toBeTruthy();
    expect(getRemoveButton('Figma')).toBeUndefined();
  });

  it('keeps avatar, name and trash in reading order in a right-to-left document', async () => {
    document.documentElement.dir = 'rtl';
    await render([FIGMA.id]);

    const details = getDetailsButton('Figma') as HTMLButtonElement;
    const remove = getRemoveButton('Figma') as HTMLButtonElement;
    expect(details.firstElementChild?.getAttribute('aria-hidden')).toBe('true');
    expect(details.className).toContain('text-start');
    expect(details.compareDocumentPosition(remove) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('renders nothing without attached toolsets', async () => {
    await render(['applications/public/agent']);

    expect(dom.container.querySelector('ul')).toBeNull();
  });
});

describe('ToolsetsList details popup', () => {
  it('opens the activated toolset and detaches it on Delete', async () => {
    await render([FIGMA.id, JIRA.id]);

    await act(async () => {
      getDetailsButton('Jira')?.click();
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    expect(dom.container.querySelector('[role="dialog"]')?.getAttribute('aria-label')).toBe(
      JIRA.id,
    );

    await act(async () => {
      [...dom.container.querySelectorAll('button')]
        .find((b) => b.textContent === 'Delete')
        ?.click();
    });

    expect(getValue()).toBe(FIGMA.id);
    expect(dom.container.querySelector('[role="dialog"]')).toBeNull();
  });
});
