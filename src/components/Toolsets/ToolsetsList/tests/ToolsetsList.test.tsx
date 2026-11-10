import { act, useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ApplicationEditorI18nKeys, CatalogI18nKeys } from '@/constants/translation-keys';
import { getAccessibleName, getButton } from '@/test-utils/dom';
import { setupTestRoot } from '@/test-utils/test-root';
import { type DialToolset, ToolsetAuthStatus, ToolsetAuthType } from '@/types/dial-entities';
import { LoadStatus } from '@/types/load-status';

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

const data = vi.hoisted(() => ({ status: 'ready' as LoadStatus }));

vi.mock('@/hooks/use-add-on-entity-map', () => ({
  useAddOnEntityMap: () => ({ [FIGMA.id]: FIGMA, [JIRA.id]: JIRA }),
}));
vi.mock('@/context/DataContext', () => ({
  useDataContext: () => ({ status: data.status }),
}));
vi.mock('@/components/Toolsets/ToolsetDetailsPopup/ToolsetDetailsPopup', () => ({
  ToolsetDetailsPopup: ({
    toolsetId,
    toolset,
    inlineConfig,
    onRemove,
    onClose,
  }: {
    toolsetId: string;
    toolset?: DialToolset;
    inlineConfig?: Record<string, unknown>;
    onRemove: (id: string) => void;
    onClose: () => void;
  }) => (
    <div
      role="dialog"
      aria-label={toolset?.id ?? toolsetId}
      data-inline-config={inlineConfig ? JSON.stringify(inlineConfig) : undefined}
    >
      <button type="button" onClick={() => (onRemove(toolsetId), onClose())}>
        Delete
      </button>
    </div>
  ),
}));

const dom = setupTestRoot();

interface HarnessProps {
  initial: string[];
  inlineConfigs?: Record<string, Record<string, unknown>>;
}

const Harness = ({ initial, inlineConfigs }: HarnessProps) => {
  const [allIds, setAllIds] = useState(initial);
  return (
    <>
      <output data-testid="value">{allIds.join('|')}</output>
      <ToolsetsList
        ids={allIds.filter((id) => id.startsWith('toolsets/'))}
        allIds={allIds}
        inlineConfigs={inlineConfigs}
        onChange={setAllIds}
      />
    </>
  );
};

const render = async (initial: string[]) => {
  await act(async () => {
    dom.root.render(<Harness initial={initial} />);
  });
};

// The remove label comes from `t`, which the test mock returns as a bare key,
// so an item's buttons are found inside the list item showing the toolset's name.
const getItem = (name: string) =>
  [...dom.container.querySelectorAll('li')].find((item) => item.textContent?.includes(name));

// The details button is named by the toolset itself (its visible name and version).
const getDetailsButton = (name: string) =>
  [...(getItem(name)?.querySelectorAll('button') ?? [])].find((button) =>
    getAccessibleName(button)?.startsWith(name),
  );

const getRemoveButton = (name: string) => {
  const item = getItem(name);
  return item && getButton(ApplicationEditorI18nKeys.AddOnsRemove, item);
};

const getValue = () => dom.container.querySelector('[data-testid="value"]')?.textContent;

// The status line is the details button's accessible description.
const getStatus = (name: string) => {
  const describedBy = getDetailsButton(name)?.getAttribute('aria-describedby');
  return describedBy ? document.getElementById(describedBy) : null;
};

const hasClass = (status: Element | null, className: string) =>
  status?.querySelector(`.${className}`) != null;

afterEach(() => {
  document.documentElement.dir = '';
  data.status = LoadStatus.Ready;
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

    const badges = dom.container.querySelectorAll('[role="img"][aria-label]');
    expect(badges).toHaveLength(1);
    expect(badges[0].closest('li')?.textContent).toContain('Figma');
    expect(badges[0].getAttribute('aria-label')).toBe(CatalogI18nKeys.CredentialsBadgeLoggedOut);
    expect(dom.container.textContent).toContain(ApplicationEditorI18nKeys.AddOnsLoggedOutToolset);
  });

  it('names a toolset missing from the catalog after its id and flags it', async () => {
    await render(['toolsets/public/old-tool']);

    expect(getDetailsButton('old-tool')).toBeTruthy();
    const status = getStatus('old-tool');
    expect(status?.textContent).toBe(ApplicationEditorI18nKeys.AddOnsUnavailableRemovalRequired);
    expect(hasClass(status, 'text-error')).toBe(true);
  });

  it('keeps the logged-out status neutral', async () => {
    await render([FIGMA.id]);

    const status = getStatus('Figma');
    expect(status?.textContent).toBe(ApplicationEditorI18nKeys.AddOnsLoggedOutToolset);
    expect(hasClass(status, 'text-secondary')).toBe(true);
    expect(hasClass(status, 'text-error')).toBe(false);
  });

  it.each([LoadStatus.Idle, LoadStatus.Loading, LoadStatus.Error])(
    'does not flag a toolset missing from the catalog while the catalog is %s',
    async (status) => {
      data.status = status;
      await render(['toolsets/public/old-tool']);

      expect(getDetailsButton('old-tool')).toBeTruthy();
      expect(getStatus('old-tool')).toBeNull();
      expect(dom.container.textContent).not.toContain(
        ApplicationEditorI18nKeys.AddOnsUnavailableRemovalRequired,
      );
    },
  );

  it('names each details button after the toolset and its version', async () => {
    await render([FIGMA.id, JIRA.id, 'toolsets/public/old-tool']);

    const names = [...dom.container.querySelectorAll('li')].map((item) =>
      getAccessibleName(item.querySelector('button')),
    );
    expect(names).toEqual([`Figma ${FIGMA.version}`, 'Jira', 'old-tool']);
  });

  it('removes only that toolset and moves focus to the remaining one', async () => {
    await render(['applications/public/agent', FIGMA.id, JIRA.id]);

    await act(async () => getRemoveButton('Figma')?.click());

    expect(getValue()).toBe(`applications/public/agent|${JIRA.id}`);
    expect(document.activeElement).toBe(getDetailsButton('Jira'));
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

describe('ToolsetsList inline toolsets', () => {
  it('hands the entry config to the popup and shows no error status', async () => {
    const config = { type: 'rest-api', tools: [] };
    await act(async () => {
      dom.root.render(
        <ToolsetsList
          ids={['Weather rest-api toolset']}
          allIds={['Weather rest-api toolset']}
          inlineConfigs={{ 'Weather rest-api toolset': config }}
          onChange={() => undefined}
        />,
      );
    });

    expect(getStatus('Weather rest-api toolset')).toBeNull();

    await act(async () => {
      getDetailsButton('Weather rest-api toolset')?.click();
    });

    expect(document.querySelector('[role="dialog"]')?.getAttribute('data-inline-config')).toBe(
      JSON.stringify(config),
    );
  });
});
