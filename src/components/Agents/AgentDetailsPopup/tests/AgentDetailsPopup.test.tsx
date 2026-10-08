import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { DialModel } from '@/types/dial-entities';
import { DialAppTransportType } from '@/types/quick-apps';

import { AgentDetailsPopup } from '../AgentDetailsPopup';

const { searchParams, requestApplicationCredentials, authState, deploymentsApi } = vi.hoisted(() => ({
  deploymentsApi: { getDeploymentDetails: vi.fn(), getDeploymentLimits: vi.fn() },
  searchParams: new Map<string, string>(),
  requestApplicationCredentials: vi.fn(),
  authState: { isRequired: false, lastAppId: undefined as string | undefined },
}));

vi.mock('@/hooks/use-translation', () => ({
  useTranslation: () => ({ language: 'en-US', t: (key: string) => key }),
}));
vi.mock('@/context/DataContext', () => ({
  useDataContext: () => ({ userBucket: 'user-bucket', skills: [] }),
}));
vi.mock('@/utils/chat-api-client', () => ({ deploymentsApi, skillsApi: {} }));
vi.mock('@/context/AppContext', () => ({
  useAppContext: () => ({ settings: { allowedOrigins: ['https://host'] } }),
}));
vi.mock('@/hooks/use-search-params', () => ({
  useSearchParams: () => ({ get: (key: string) => searchParams.get(key) ?? null }),
}));
vi.mock('@/hooks/use-application-authentication', () => ({
  useApplicationAuthentication: (appId?: string) => {
    authState.lastAppId = appId;
    return !!appId && authState.isRequired;
  },
}));
vi.mock('@/utils/request-application-credentials', () => ({ requestApplicationCredentials }));
vi.mock('@/components/Agents/DialAppConfigurationModal/DialAppConfigurationModal', () => ({
  DialAppConfigurationModal: ({
    onSave,
    onClose,
  }: {
    onSave: (transport: DialAppTransportType) => void;
    onClose: () => void;
  }) => (
    <div role="dialog" aria-label="Transport">
      <button type="button" onClick={() => (onSave(DialAppTransportType.ChatCompletion), onClose())}>
        Apply chat completion
      </button>
    </div>
  ),
}));

const MCP_APP: DialModel = {
  id: 'applications/public/research',
  reference: 'applications/public/research',
  name: 'Research Agent',
  type: 'application',
  version: '2.1',
  mcp: true,
  description: 'Finds **sources**.',
  topics: ['Research'],
};

const MODEL: DialModel = {
  id: 'gpt-4o',
  reference: 'gpt-4o',
  name: 'GPT-4o',
  type: 'model',
  mcp: true,
};

const APP_DETAILS = {
  id: MCP_APP.id,
  type: 'application',
  applicationDetails: { owner: 'Research Lab', features: { tools: true } },
};

const MODEL_DETAILS = {
  id: MODEL.id,
  type: 'model',
  modelDetails: {
    owner: 'OpenAI',
    pricing: { unit: 'token', prompt: '0.000005', completion: '0.000015' },
  },
};

const LIMITS = { dayTokenStats: { total: 1000, used: 250 } };

let root: Root;
let container: HTMLDivElement;
const onRemove = vi.fn();
const onConfigure = vi.fn();
const onClose = vi.fn();

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

interface RenderProps {
  agent?: DialModel;
  agentId?: string;
  isReadonly?: boolean;
  transport?: DialAppTransportType;
}

const render = async (props: RenderProps = {}) => {
  const agent = 'agent' in props ? props.agent : MCP_APP;
  await act(async () => {
    root.render(
      <AgentDetailsPopup
        agentId={props.agentId ?? agent?.id ?? 'applications/public/gone'}
        agent={agent}
        transport={props.transport}
        isReadonly={props.isReadonly ?? false}
        onRemove={onRemove}
        onConfigure={onConfigure}
        onClose={onClose}
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
    | HTMLElement
    | undefined;

const getTabNames = () =>
  [...document.querySelectorAll('[role="tab"]')].map((tab) => tab.textContent);

const click = async (element?: HTMLElement) => {
  expect(element).toBeTruthy();
  await act(async () => {
    element?.click();
    await flush();
  });
};

beforeEach(() => {
  (globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;
  searchParams.clear();
  authState.isRequired = false;
  authState.lastAppId = undefined;
  requestApplicationCredentials.mockReset();
  deploymentsApi.getDeploymentDetails.mockReset();
  deploymentsApi.getDeploymentDetails.mockImplementation(({ deployment }: { deployment: string }) =>
    Promise.resolve(deployment === MODEL.id ? MODEL_DETAILS : APP_DETAILS),
  );
  deploymentsApi.getDeploymentLimits.mockReset();
  deploymentsApi.getDeploymentLimits.mockResolvedValue(LIMITS);
  onRemove.mockReset();
  onConfigure.mockReset();
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

describe('AgentDetailsPopup', () => {
  it('opens a dialog named by the agent on the About tab', async () => {
    await render();

    const dialog = getDialog('Research Agent');
    expect(dialog?.textContent).toMatch(/agent/i);
    expect(dialog?.textContent).toContain('2.1');
    expect(dialog?.textContent).toContain('Organization');
    expect(getTab('About')?.getAttribute('aria-selected')).toBe('true');
    expect(dialog?.querySelector('strong')?.textContent).toBe('sources');
    expect(dialog?.textContent).toContain('Research');
  });

  it('shows an application’s catalog Overview, without Pricing or Limits', async () => {
    await render({ transport: DialAppTransportType.ChatCompletion });

    expect(getTabNames()).toEqual(['About', 'Overview']);
    expect(deploymentsApi.getDeploymentLimits).not.toHaveBeenCalled();

    await click(getTab('Overview'));

    const panel = document.querySelector('[role="tabpanel"]');
    expect(panel?.textContent).toContain('Hosted by');
    expect(panel?.textContent).toContain('Research Lab');
    expect(panel?.textContent).toContain('Capabilities');
  });

  it('shows a model’s Pricing and Limits', async () => {
    await render({ agent: MODEL });

    expect(getTabNames()).toEqual(['About', 'Overview', 'Pricing', 'Limits']);

    await click(getTab('Pricing'));
    expect(document.querySelector('[role="tabpanel"]')?.textContent).toContain('Token pricing');

    await click(getTab('Limits'));
    const limits = document.querySelector('[role="tabpanel"]')?.textContent;
    expect(limits).toContain('Token limits');
    expect(limits).toContain('Today');
  });

  it('leaves out Limits when a model’s limits fail', async () => {
    deploymentsApi.getDeploymentLimits.mockRejectedValueOnce(new Error('403'));
    await render({ agent: MODEL });

    expect(getTabNames()).toEqual(['About', 'Overview', 'Pricing']);
  });

  it('configures the transport and stays open', async () => {
    await render();

    await click(getButtonByText('Connection'));
    await click(getButtonByText('Apply chat completion'));

    expect(onConfigure).toHaveBeenCalledWith(MCP_APP.id, DialAppTransportType.ChatCompletion);
    expect(getDialog('Research Agent')).toBeTruthy();
    expect(getDialog('Transport')).toBeUndefined();
  });

  it('shows a model with the Model caption and no actions', async () => {
    await render({ agent: MODEL });

    expect(getDialog('GPT-4o')?.textContent).toMatch(/model/i);
    expect(getButtonByText('Connection')).toBeUndefined();
    expect(getButtonByText('Application credentials')).toBeUndefined();
  });

  it('requests application credentials only in credentials mode for an app behind auth', async () => {
    authState.isRequired = true;
    await render();
    expect(getButtonByText('Application credentials')).toBeUndefined();
    expect(authState.lastAppId).toBeUndefined();

    searchParams.set('applicationCredentials', 'true');
    await render();
    await click(getButtonByText('Application credentials'));

    expect(requestApplicationCredentials).toHaveBeenCalledTimes(1);
    expect(requestApplicationCredentials).toHaveBeenCalledWith(MCP_APP.id, ['https://host']);
  });

  it('shows an unavailable agent without actions, but still offers Delete', async () => {
    await render({ agent: undefined, agentId: 'applications/public/gone' });

    const dialog = getDialog('gone');
    expect(dialog?.textContent).toContain('This agent is no longer available');
    expect(getButtonByText('Connection')).toBeUndefined();
    expect(getButtonByText('Delete')).toBeTruthy();
    expect(deploymentsApi.getDeploymentDetails).not.toHaveBeenCalled();
  });

  it('detaches the agent on Delete', async () => {
    await render();

    await click(getButtonByText('Delete'));

    expect(onRemove).toHaveBeenCalledWith(MCP_APP.id);
    expect(onClose).toHaveBeenCalled();
  });

  it('offers only Close in a read-only application', async () => {
    await render({ isReadonly: true });

    expect(getButtonByText('Delete')).toBeUndefined();
    expect(getButtonByText('Connection')).toBeUndefined();
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
