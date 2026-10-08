import { act, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { CatalogItemCredentials } from '@epam/ai-dial-catalog';
import { type DialToolset, ToolsetAuthStatus, ToolsetAuthType } from '@/types/dial-entities';

import { ToolsetDetailsPopup } from '../ToolsetDetailsPopup';

const HOST = 'https://host';

const { postToHost, deploymentsApi, toolsetsApi, dataContext } = vi.hoisted(() => ({
  postToHost: vi.fn(),
  toolsetsApi: { loginToolset: vi.fn(), logoutToolset: vi.fn() },
  deploymentsApi: { getDeploymentDetails: vi.fn(), getDeploymentLimits: vi.fn() },
  dataContext: {
    skills: [],
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
vi.mock('@/utils/dial-client', () => ({ encodeDialPath: (id: string) => id }));
vi.mock('@/utils/chat-api-client', () => ({ toolsetsApi, skillsApi: {}, deploymentsApi }));
// The real badge needs the catalog's tooltip layer; this stub keeps its
// contract: it shows only while the toolset is signed out at every level.
vi.mock('@epam/ai-dial-catalog', async (importOriginal) => ({
  ...(await importOriginal<object>()),
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

const FIGMA_DETAILS = {
  id: FIGMA.id,
  type: 'toolset',
  toolsetDetails: {
    owner: 'Figma Inc.',
    catalogProperties: { provider: 'Figma' },
    authSettings: { authenticationType: 'OAUTH' },
    allowedTools: ['edit_design'],
    allToolNames: ['evaluate_script', 'get_design_context', 'edit_design'],
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

beforeEach(() => {
  (globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;
  // The catalog API-key popover is a kit Dropdown, which observes its anchor.
  (globalThis as Record<string, unknown>).IntersectionObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
  toolsetsApi.loginToolset.mockReset();
  dataContext.refreshToolsets.mockReset();
  postToHost.mockReset();
  dataContext.applyToolsetAuthResult.mockReset();
  deploymentsApi.getDeploymentDetails.mockReset();
  deploymentsApi.getDeploymentDetails.mockResolvedValue(FIGMA_DETAILS);
  deploymentsApi.getDeploymentLimits.mockReset();
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
    // The catalog header's caption: 'TOOLSET' until the catalog takes entityTypeLabels.
    expect(dialog?.textContent).toMatch(/toolset/i);
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

  it('explains a signed-out toolset above the tabs, with no badge on the header icon', async () => {
    await render();

    expect(getDialog('Figma')?.querySelector('[data-testid="badge"]')).toBeNull();
    expect(getDialog('Figma')?.textContent).toContain('Logged out toolset.');
  });

  it('shows the catalog Specification on Overview', async () => {
    await render();

    await click(getTab('Overview'));

    const panel = document.querySelector('[role="tabpanel"]');
    expect(panel?.textContent).toContain('Specification');
    expect(panel?.textContent).toContain('Authentication');
    expect(panel?.textContent).toContain('Provider');
    expect(panel?.textContent).toContain('Hosted by');
    expect(panel?.textContent).toContain('Figma Inc.');
  });

  it('logs in through the host and reflects the result', async () => {
    await render();

    await click(getButtonByText('Log in'));

    expect(postToHost).toHaveBeenCalledTimes(1);
    expect(postToHost).toHaveBeenCalledWith(
      { type: 'REQUEST_TOOLSET_LOGIN', toolsetId: FIGMA.id },
      [HOST],
    );

    await postFromHost({ type: 'TOOLSET_LOGIN_RESULT', toolsetId: FIGMA.id, success: true });

    expect(getButtonByText('Log out')).toBeTruthy();
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
    expect(getButtonByText('Log in')).toBeTruthy();
  });

  it('adds a personal API key from the catalog popover', async () => {
    toolsetsApi.loginToolset.mockResolvedValue({});
    await render({ toolset: API_KEY_TOOLSET });

    await click(getButtonByText('API key'));
    const input = document.querySelector<HTMLInputElement>('input[type="password"]');
    expect(input).toBeTruthy();
    await act(async () => {
      const setValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
      setValue?.call(input, 'secret-key');
      input?.dispatchEvent(new Event('input', { bubbles: true }));
      await flush();
    });
    await click(getButtonByText('Add'));

    expect(postToHost).not.toHaveBeenCalled();
    expect(toolsetsApi.loginToolset).toHaveBeenCalledWith({
      toolsetName: API_KEY_TOOLSET.id,
      toolsetLoginBodyDto: {
        url: API_KEY_TOOLSET.id,
        credentialsLevel: 'USER',
        authenticationType: 'API_KEY',
        apiKey: 'secret-key',
      },
    });
    expect(dataContext.refreshToolsets).toHaveBeenCalled();
  });

  it('shows an unavailable toolset without a request or an action, but still offers Delete', async () => {
    await render({ toolset: undefined, toolsetId: 'toolsets/public/gone' });

    const dialog = getDialog('gone');
    expect(dialog?.textContent).toContain('This toolset is no longer available');
    expect(getTab('About')).toBeUndefined();
    expect(deploymentsApi.getDeploymentDetails).not.toHaveBeenCalled();
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

describe('ToolsetDetailsPopup catalog details', () => {
  const getTabNames = () =>
    [...document.querySelectorAll('[role="tab"]')].map((tab) => tab.textContent);
  const getPanel = () => document.querySelector('[role="tabpanel"]');

  it('requests the details once, on open, by the toolset id', async () => {
    await render();
    await click(getTab('Tools'));
    await click(getTab('About'));

    expect(deploymentsApi.getDeploymentDetails).toHaveBeenCalledTimes(1);
    expect(deploymentsApi.getDeploymentDetails).toHaveBeenCalledWith({ deployment: FIGMA.id });
    expect(deploymentsApi.getDeploymentLimits).not.toHaveBeenCalled();
  });

  it('lists only the allow-listed tools', async () => {
    await render();
    await click(getTab('Tools'));

    expect(getPanel()?.textContent).toContain('edit_design');
    expect(getPanel()?.textContent).not.toContain('evaluate_script');
  });

  it('lists every reported tool when there is no allow-list', async () => {
    deploymentsApi.getDeploymentDetails.mockResolvedValueOnce({
      ...FIGMA_DETAILS,
      toolsetDetails: { ...FIGMA_DETAILS.toolsetDetails, allowedTools: [] },
    });
    await render();
    await click(getTab('Tools'));

    expect(getPanel()?.textContent).toContain('evaluate_script');
    expect(getPanel()?.textContent).toContain('get_design_context');
  });

  it('shows no Tools tab when the toolset reports no tools', async () => {
    deploymentsApi.getDeploymentDetails.mockResolvedValueOnce({
      ...FIGMA_DETAILS,
      toolsetDetails: { owner: 'Figma Inc.' },
    });
    await render();

    expect(getTabNames()).toEqual(['About', 'Overview']);
  });

  it('shows About alone with a spinner while the details load', async () => {
    deploymentsApi.getDeploymentDetails.mockReturnValueOnce(new Promise(() => undefined));
    await render();

    expect(getTabNames()).toEqual(['About']);
    expect(document.querySelector('[aria-label="Loading details"]')).not.toBeNull();
  });

  it('keeps About on a failure and loads again on Retry', async () => {
    deploymentsApi.getDeploymentDetails.mockRejectedValueOnce(new Error('boom'));
    await render();

    expect(getTabNames()).toEqual(['About']);
    expect(getDialog('Figma')?.textContent).toContain('Failed to load details');

    await click(getButtonByText('Retry'));

    expect(deploymentsApi.getDeploymentDetails).toHaveBeenCalledTimes(2);
    expect(getTabNames()).toEqual(['About', 'Overview', 'Tools']);
  });

  it('lays the tab row out by the document direction', async () => {
    document.documentElement.dir = 'rtl';
    await render();

    const tabs = [...document.querySelectorAll('[role="tab"]')];
    expect(tabs.map((tab) => tab.textContent)).toEqual(['About', 'Overview', 'Tools']);
    expect(document.querySelector('[role="tablist"]')?.closest('[dir="ltr"]')).toBeNull();
  });
});
