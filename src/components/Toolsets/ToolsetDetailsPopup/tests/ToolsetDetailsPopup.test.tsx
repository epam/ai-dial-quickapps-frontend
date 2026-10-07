import { act, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { CatalogItemCredentials } from '@epam/ai-dial-catalog';
import { type DialToolset, ToolsetAuthStatus, ToolsetAuthType } from '@/types/dial-entities';

import { ToolsetDetailsPopup } from '../ToolsetDetailsPopup';

const HOST = 'https://host';

const { postToHost, fetchToolsetToolNames, dataContext } = vi.hoisted(() => ({
  postToHost: vi.fn(),
  fetchToolsetToolNames: vi.fn(),
  dataContext: {
    applyToolsetAuthResult: vi.fn(),
    refreshToolsets: vi.fn(),
  },
}));

vi.mock('@/hooks/use-translation', () => ({
  useTranslation: () => ({
    language: 'en-US',
    t: (key: string, options?: Record<string, string>) =>
      key.replace(/\{\{(\w+)\}\}/g, (_, name: string) => options?.[name] ?? ''),
  }),
}));
vi.mock('@/context/DataContext', () => ({
  useDataContext: () => ({ userBucket: 'user-bucket', ...dataContext }),
}));
vi.mock('@/context/AppContext', () => ({
  useAppContext: () => ({ settings: { allowedOrigins: [HOST] } }),
}));
vi.mock('@/utils/allowed-origins', () => ({
  postToHost,
  isOriginAllowed: (origin: string, allowed: string[] = []) => allowed.includes(origin),
}));
vi.mock('@/utils/dial-client', () => ({
  fetchToolsetToolNames,
  encodeDialPath: (id: string) => id,
}));
vi.mock('@/utils/chat-api-client', () => ({ toolsetsApi: {} }));
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
      credentials.userStatus !== 'SIGNED_IN' &&
      credentials.globalStatus !== 'SIGNED_IN';
    return isSignedOut ? <span data-testid="badge">{loggedOutLabel}</span> : null;
  },
}));

const FIGMA: DialToolset = {
  id: 'toolsets/public/figma',
  reference: 'toolsets/public/figma',
  name: 'Figma',
  type: 'toolset',
  version: '1.0.0',
  description: 'Reads and edits **design** files.',
  updatedAt: Date.UTC(2025, 9, 7, 12),
  authSettings: {
    authenticationType: ToolsetAuthType.OAuth,
    authStatus: ToolsetAuthStatus.SignedOut,
  },
};

const API_KEY_TOOLSET: DialToolset = {
  ...FIGMA,
  id: 'toolsets/public/jira',
  name: 'Jira',
  authSettings: {
    authenticationType: ToolsetAuthType.ApiKey,
    authStatus: ToolsetAuthStatus.SignedOut,
  },
};

let root: Root;
let container: HTMLDivElement;
const onRemove = vi.fn();
const onClose = vi.fn();

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

interface HarnessProps {
  initial?: DialToolset;
  toolsetId: string;
  isReadonly: boolean;
}

/** Plays `DataContext`: an applied auth result updates the toolset it hands down. */
const Harness = ({ initial, toolsetId, isReadonly }: HarnessProps) => {
  const [toolset, setToolset] = useState(initial);
  dataContext.applyToolsetAuthResult.mockImplementation(
    (_payload: unknown, status: ToolsetAuthStatus) =>
      setToolset((prev) =>
        prev ? { ...prev, authSettings: { ...prev.authSettings!, authStatus: status } } : prev,
      ),
  );
  return (
    <ToolsetDetailsPopup
      toolsetId={toolsetId}
      toolset={toolset}
      isReadonly={isReadonly}
      onRemove={onRemove}
      onClose={onClose}
    />
  );
};

const render = async (
  props: { toolset?: DialToolset; toolsetId?: string; isReadonly?: boolean } = {},
) => {
  const toolset = 'toolset' in props ? props.toolset : FIGMA;
  await act(async () => {
    root.render(
      <Harness
        initial={toolset}
        toolsetId={props.toolsetId ?? toolset?.id ?? 'toolsets/public/gone'}
        isReadonly={props.isReadonly ?? false}
      />,
    );
    await flush();
  });
};

const getDialog = (name: string) =>
  [...document.querySelectorAll('[role="dialog"]')].find(
    (dialog) => dialog.getAttribute('aria-label') === name,
  ) as HTMLElement | undefined;

const getButtonByText = (text: string) =>
  [...document.querySelectorAll('button')].find((button) => button.textContent?.trim() === text);

const getTab = (name: string) =>
  [...document.querySelectorAll('[role="tab"]')].find((tab) => tab.textContent === name) as
    HTMLElement | undefined;

const click = async (element?: HTMLElement) => {
  expect(element).toBeTruthy();
  await act(async () => {
    element?.click();
    await flush();
  });
};

const postFromHost = async (data: unknown, origin = HOST) => {
  await act(async () => {
    window.dispatchEvent(new MessageEvent('message', { data, origin }));
    await flush();
  });
};

const typeSearch = async (text: string) => {
  const input = document.querySelector<HTMLInputElement>('input[aria-label="Search..."]');
  if (!input) throw new Error('search input not found');
  const setValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
  await act(async () => {
    setValue?.call(input, text);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
};

beforeEach(() => {
  (globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;
  postToHost.mockReset();
  dataContext.applyToolsetAuthResult.mockReset();
  fetchToolsetToolNames.mockReset();
  fetchToolsetToolNames.mockResolvedValue(['evaluate_script', 'get_design_context', 'edit_design']);
  onRemove.mockReset();
  onClose.mockReset();
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  document.documentElement.dir = '';
});

describe('ToolsetDetailsPopup', () => {
  it('opens a dialog named by the toolset on the About tab', async () => {
    await render();

    const dialog = getDialog('Figma');
    expect(dialog?.textContent).toContain('Toolset');
    expect(dialog?.textContent).toContain('1.0.0');
    expect(dialog?.textContent).toContain('Organization');
    expect(['About', 'Overview', 'Tools'].map((name) => !!getTab(name))).toEqual([
      true,
      true,
      true,
    ]);
    expect(getTab('About')?.getAttribute('aria-selected')).toBe('true');
    expect(dialog?.querySelector('strong')?.textContent).toBe('design');
  });

  it('badges a signed-out toolset and explains it above the tabs', async () => {
    await render();

    expect(getDialog('Figma')?.querySelector('[data-testid="badge"]')).toBeTruthy();
    expect(getDialog('Figma')?.textContent).toContain('Logged out toolset.');
  });

  it('lists authentication, folder, updated date and version on Overview', async () => {
    await render();

    await click(getTab('Overview'));

    const terms = [...document.querySelectorAll('dt')].map((term) => term.textContent);
    const values = [...document.querySelectorAll('dd')].map((value) => value.textContent);
    expect(terms).toEqual(['Authentication', 'Folder', 'Updated', 'Version']);
    expect(values[0]).toBe('OAuth');
    expect(values[1]).toBe('Organization');
    expect(values[3]).toBe('1.0.0');
  });

  it('logs in through the host and reflects the result', async () => {
    await render();

    await click(getButtonByText('Log in'));

    expect(postToHost).toHaveBeenCalledTimes(1);
    expect(postToHost).toHaveBeenCalledWith(
      { type: 'REQUEST_TOOLSET_LOGIN', toolsetId: FIGMA.id },
      [HOST],
    );
    expect(getButtonByText('Logging in…')?.disabled).toBe(true);

    await postFromHost({ type: 'TOOLSET_LOGIN_RESULT', toolsetId: FIGMA.id, success: true });

    expect(getButtonByText('Log out')).toBeTruthy();
    expect(getDialog('Figma')?.querySelector('[data-testid="badge"]')).toBeNull();
    expect(getDialog('Figma')).toBeTruthy();
  });

  it('reports a failed login and lets the user try again', async () => {
    await render();

    await click(getButtonByText('Log in'));
    await postFromHost({ type: 'TOOLSET_LOGIN_RESULT', toolsetId: FIGMA.id, success: false });

    expect(getDialog('Figma')?.textContent).toContain('Failed to update toolset credentials');
    expect(getButtonByText('Log in')?.disabled).toBe(false);
  });

  it('ignores results from other origins and for other toolsets', async () => {
    await render();

    await click(getButtonByText('Log in'));
    await postFromHost(
      { type: 'TOOLSET_LOGIN_RESULT', toolsetId: FIGMA.id, success: true },
      'https://evil',
    );
    await postFromHost({ type: 'TOOLSET_LOGIN_RESULT', toolsetId: 'toolsets/x', success: true });

    expect(dataContext.applyToolsetAuthResult).not.toHaveBeenCalled();
    expect(getButtonByText('Logging in…')).toBeTruthy();
  });

  it('opens the API-key form for an API-key toolset', async () => {
    await render({ toolset: API_KEY_TOOLSET });

    await click(getButtonByText('Log in'));

    expect(postToHost).not.toHaveBeenCalled();
    expect(document.querySelector('input[type="password"]')).toBeTruthy();
  });

  it('shows an unavailable toolset without a request or an action, but still offers Delete', async () => {
    await render({ toolset: undefined, toolsetId: 'toolsets/public/gone' });

    const dialog = getDialog('gone');
    expect(dialog?.textContent).toContain('This toolset is no longer available');
    await click(getTab('Tools'));
    expect(fetchToolsetToolNames).not.toHaveBeenCalled();
    expect(getButtonByText('Log in')).toBeUndefined();
    expect(getButtonByText('Delete')).toBeTruthy();
  });

  it('detaches the toolset on Delete', async () => {
    await render();

    await click(getButtonByText('Delete'));

    expect(onRemove).toHaveBeenCalledWith(FIGMA.id);
    expect(onClose).toHaveBeenCalled();
  });

  it('offers only Close in a read-only application', async () => {
    await render({ isReadonly: true });

    expect(getButtonByText('Delete')).toBeUndefined();
    expect(getButtonByText('Log in')).toBeUndefined();
    expect(getButtonByText('Close')).toBeTruthy();
  });

  it('puts Delete before Close in a right-to-left document', async () => {
    document.documentElement.dir = 'rtl';
    await render();

    const del = getButtonByText('Delete') as HTMLElement;
    const close = getButtonByText('Close') as HTMLElement;
    expect(del.compareDocumentPosition(close) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});

describe('ToolsetDetailsPopup Tools tab', () => {
  const getToolNames = () =>
    [...document.querySelectorAll('ul[aria-label="Tools"] li')].map((item) => item.textContent);

  it('fetches nothing until Tools is selected', async () => {
    await render();
    await click(getTab('Overview'));

    expect(fetchToolsetToolNames).not.toHaveBeenCalled();
  });

  it('lists the tool names with their count', async () => {
    await render();
    await click(getTab('Tools'));

    expect(fetchToolsetToolNames).toHaveBeenCalledWith(FIGMA.id, expect.any(AbortSignal));
    expect(getToolNames()).toEqual(['evaluate_script', 'get_design_context', 'edit_design']);
    expect(getDialog('Figma')?.textContent).toContain('3 tools');
  });

  it('narrows the list and the count with search, and says when nothing matches', async () => {
    await render();
    await click(getTab('Tools'));

    await typeSearch('design');
    expect(getToolNames()).toEqual(['get_design_context', 'edit_design']);
    expect(getDialog('Figma')?.textContent).toContain('2 tools');

    await typeSearch('zzz');
    expect(getDialog('Figma')?.textContent).toContain('No results found');
  });

  it('shows a failure with a Retry that loads again', async () => {
    fetchToolsetToolNames.mockRejectedValueOnce(new Error('boom'));
    await render();
    await click(getTab('Tools'));

    expect(getDialog('Figma')?.textContent).toContain('Failed to load tools');

    await click(getButtonByText('Retry'));

    expect(fetchToolsetToolNames).toHaveBeenCalledTimes(2);
    expect(getToolNames()).toHaveLength(3);
  });

  it('says when the toolset reports no tools', async () => {
    fetchToolsetToolNames.mockResolvedValueOnce([]);
    await render();
    await click(getTab('Tools'));

    expect(getDialog('Figma')?.textContent).toContain('This toolset reports no tools');
  });

  it('does not refetch when coming back to Tools', async () => {
    await render();
    await click(getTab('Tools'));
    await click(getTab('About'));
    await click(getTab('Tools'));

    expect(fetchToolsetToolNames).toHaveBeenCalledTimes(1);
  });
});
