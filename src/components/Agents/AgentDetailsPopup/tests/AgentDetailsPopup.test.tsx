import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { setupTestRoot } from '@/test-utils/test-root';

import { DialEntityType } from '@/types/dial-entities';
import type { DialModel } from '@/types/dial-entities';
import { DialAppTransportType } from '@/types/quick-apps';

import { AgentDetailsPopup } from '../AgentDetailsPopup';
import {
  ApplicationCredentialsI18nKeys,
  ApplicationEditorI18nKeys,
  BasicI18nKeys,
  ButtonsI18nKeys,
  CatalogI18nKeys,
} from '@/constants/translation-keys';

const { searchParams, requestApplicationCredentials, authState, deploymentsApi, dataContext } =
  vi.hoisted(() => ({
    dataContext: {
      userBucket: 'user-bucket',
      skills: [],
      modelsMap: {} as Record<string, unknown>,
    },
    deploymentsApi: { getDeploymentDetails: vi.fn(), getDeploymentLimits: vi.fn() },
    searchParams: new Map<string, string>(),
    requestApplicationCredentials: vi.fn(),
    authState: { isRequired: false, lastAppId: undefined as string | undefined },
  }));

vi.mock('@/context/DataContext', () => ({
  useDataContext: () => dataContext,
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

const MCP_APP: DialModel = {
  id: 'applications/public/research',
  reference: 'applications/public/research',
  name: 'Research Agent',
  type: DialEntityType.Application,
  version: '2.1',
  mcp: true,
  description: 'Finds **sources**.',
  topics: ['Research'],
};

const MODEL: DialModel = {
  id: 'gpt-4o',
  reference: 'gpt-4o',
  name: 'GPT-4o',
  type: DialEntityType.Model,
  mcp: true,
};

const APP_DETAILS = {
  id: MCP_APP.id,
  type: DialEntityType.Application,
  applicationDetails: { owner: 'Research Lab', features: { tools: true } },
};

const MODEL_DETAILS = {
  id: MODEL.id,
  type: DialEntityType.Model,
  modelDetails: {
    owner: 'OpenAI',
    pricing: { unit: 'token', prompt: '0.000005', completion: '0.000015' },
  },
};

const LIMITS = { dayTokenStats: { total: 1000, used: 250 } };

const dom = setupTestRoot();
const onRemove = vi.fn();
const onConfigure = vi.fn();
const onClose = vi.fn();

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

interface RenderProps {
  agent?: DialModel;
  agentId?: string;
  transport?: DialAppTransportType;
}

const render = async (props: RenderProps = {}) => {
  const agent = 'agent' in props ? props.agent : MCP_APP;
  await act(async () => {
    dom.root.render(
      <AgentDetailsPopup
        agentId={props.agentId ?? agent?.id ?? 'applications/public/gone'}
        agent={agent}
        transport={props.transport}
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
    HTMLElement | undefined;

const getTabNames = () =>
  [...document.querySelectorAll('[role="tab"]')].map((tab) => tab.textContent);

const getRadio = (label: string) =>
  [...document.querySelectorAll<HTMLInputElement>('input[type="radio"]')].find((radio) =>
    [...(radio.labels ?? [])].some((node) => node.textContent?.trim() === label),
  );

const click = async (element?: HTMLElement) => {
  expect(element).toBeTruthy();
  await act(async () => {
    element?.click();
    await flush();
  });
};

beforeEach(() => {
  searchParams.clear();
  // The MCP app also serves chat completion, so its transport is a real choice.
  dataContext.modelsMap = { [MCP_APP.id]: MCP_APP };
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
});

afterEach(() => {
  document.documentElement.dir = '';
});

describe('AgentDetailsPopup', () => {
  it('opens a dialog named by the agent on the About tab', async () => {
    await render();

    const dialog = getDialog('Research Agent');
    expect(dialog?.textContent).toContain(ApplicationEditorI18nKeys.AgentsTypeLabel);
    expect(dialog?.textContent).toContain('2.1');
    expect(dialog?.textContent).toContain(BasicI18nKeys.Organization);
    expect(getTab(CatalogI18nKeys.DetailsTabAbout)?.getAttribute('aria-selected')).toBe('true');
    expect(dialog?.querySelector('strong')?.textContent).toBe('sources');
    expect(dialog?.textContent).toContain('Research');
  });

  it('shows an application’s catalog Overview, without Pricing or Limits', async () => {
    await render({ transport: DialAppTransportType.ChatCompletion });

    expect(getTabNames()).toEqual([
      CatalogI18nKeys.DetailsTabAbout,
      CatalogI18nKeys.DetailsTabOverview,
      BasicI18nKeys.Settings,
    ]);
    expect(deploymentsApi.getDeploymentLimits).not.toHaveBeenCalled();

    await click(getTab(CatalogI18nKeys.DetailsTabOverview));

    const panel = document.querySelector('[role="tabpanel"]');
    expect(panel?.textContent).toContain(CatalogI18nKeys.DetailsOverviewHostedBy);
    expect(panel?.textContent).toContain('Research Lab');
    expect(panel?.textContent).toContain(CatalogI18nKeys.DetailsOverviewCapabilities);
  });

  it('shows a model’s Pricing and Limits', async () => {
    await render({ agent: MODEL });

    expect(getTabNames()).toEqual([
      CatalogI18nKeys.DetailsTabAbout,
      CatalogI18nKeys.DetailsTabOverview,
      CatalogI18nKeys.DetailsTabPricing,
      CatalogI18nKeys.DetailsTabLimits,
    ]);

    await click(getTab(CatalogI18nKeys.DetailsTabPricing));
    expect(document.querySelector('[role="tabpanel"]')?.textContent).toContain(
      CatalogI18nKeys.DetailsPricingPricesSection,
    );

    await click(getTab(CatalogI18nKeys.DetailsTabLimits));
    const limits = document.querySelector('[role="tabpanel"]')?.textContent;
    expect(limits).toContain(CatalogI18nKeys.DetailsLimitsTokenGroupLabel);
    expect(limits).toContain(CatalogI18nKeys.DetailsLimitsToday);
  });

  it('leaves out Limits when a model’s limits fail', async () => {
    deploymentsApi.getDeploymentLimits.mockRejectedValueOnce(new Error('403'));
    await render({ agent: MODEL });

    expect(getTabNames()).toEqual([
      CatalogI18nKeys.DetailsTabAbout,
      CatalogI18nKeys.DetailsTabOverview,
      CatalogI18nKeys.DetailsTabPricing,
    ]);
  });

  it('lists Settings last, with About still selected', async () => {
    await render();

    expect(getTabNames().at(-1)).toBe(BasicI18nKeys.Settings);
    expect(getTab(CatalogI18nKeys.DetailsTabAbout)?.getAttribute('aria-selected')).toBe('true');
    expect(getButtonByText('Connection')).toBeUndefined();
  });

  it('preselects MCP in Settings when no transport is saved', async () => {
    await render();
    await click(getTab(BasicI18nKeys.Settings));

    expect(getRadio(ApplicationEditorI18nKeys.AgentsTransportMcp)?.checked).toBe(true);
    expect(getRadio(ApplicationEditorI18nKeys.AgentsTransportChatCompletion)?.checked).toBe(false);
    expect(getRadio(ApplicationEditorI18nKeys.AgentsTransportChatCompletion)?.disabled).toBe(false);
  });

  it('shows the saved transport as checked', async () => {
    await render({ transport: DialAppTransportType.ChatCompletion });
    await click(getTab(BasicI18nKeys.Settings));

    expect(getRadio(ApplicationEditorI18nKeys.AgentsTransportChatCompletion)?.checked).toBe(true);
  });

  it('configures the transport at once and stays open on Settings', async () => {
    await render();
    await click(getTab(BasicI18nKeys.Settings));

    await click(getRadio(ApplicationEditorI18nKeys.AgentsTransportChatCompletion));

    expect(onConfigure).toHaveBeenCalledWith(MCP_APP.id, DialAppTransportType.ChatCompletion);
    expect(getDialog('Research Agent')).toBeTruthy();
    expect(getTab(BasicI18nKeys.Settings)?.getAttribute('aria-selected')).toBe('true');
  });

  it('shows no Settings tab for an MCP-only agent without credentials', async () => {
    dataContext.modelsMap = {};
    await render();

    expect(getTabNames()).not.toContain(BasicI18nKeys.Settings);
  });

  it('shows a model with the Model caption and no Settings', async () => {
    await render({ agent: MODEL });

    expect(getDialog('GPT-4o')?.textContent).toContain(ApplicationEditorI18nKeys.OrchestratorModel);
    expect(getTabNames()).not.toContain(BasicI18nKeys.Settings);
    expect(getButtonByText(ApplicationCredentialsI18nKeys.Title)).toBeUndefined();
  });

  it('requests application credentials only in credentials mode for an app behind auth', async () => {
    authState.isRequired = true;
    await render();
    expect(getButtonByText(ApplicationCredentialsI18nKeys.Title)).toBeUndefined();
    expect(authState.lastAppId).toBeUndefined();

    searchParams.set('applicationCredentials', 'true');
    await render();
    await click(getButtonByText(ApplicationCredentialsI18nKeys.Title));

    expect(requestApplicationCredentials).toHaveBeenCalledTimes(1);
    expect(requestApplicationCredentials).toHaveBeenCalledWith(MCP_APP.id, ['https://host']);
  });

  it('closes the popup when handing over to the host’s credential forms', async () => {
    authState.isRequired = true;
    searchParams.set('applicationCredentials', 'true');
    await render();

    await click(getButtonByText(ApplicationCredentialsI18nKeys.Title));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('shows Credentials under the header, before the tab row, not in Settings', async () => {
    authState.isRequired = true;
    searchParams.set('applicationCredentials', 'true');
    await render();

    const credentials = getButtonByText(ApplicationCredentialsI18nKeys.Title) as HTMLElement;
    const tablist = document.querySelector('[role="tablist"]') as HTMLElement;
    expect(
      credentials.compareDocumentPosition(tablist) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();

    await click(getTab(BasicI18nKeys.Settings));
    expect(document.querySelector('[role="tabpanel"]')?.textContent).not.toContain(
      ApplicationCredentialsI18nKeys.Title,
    );
  });

  it('shows Credentials but no Settings tab for an MCP-only agent behind auth', async () => {
    dataContext.modelsMap = {};
    authState.isRequired = true;
    searchParams.set('applicationCredentials', 'true');
    await render();

    expect(getTabNames()).not.toContain(BasicI18nKeys.Settings);
    expect(getButtonByText(ApplicationCredentialsI18nKeys.Title)).toBeTruthy();
  });

  it('shows an unavailable agent without Settings, but still offers Delete', async () => {
    await render({ agent: undefined, agentId: 'applications/public/gone' });

    const dialog = getDialog('gone');
    expect(dialog?.textContent).toContain(ApplicationEditorI18nKeys.AgentsUnavailable);
    expect(getTab(BasicI18nKeys.Settings)).toBeUndefined();
    expect(getButtonByText(ButtonsI18nKeys.Delete)).toBeTruthy();
    expect(deploymentsApi.getDeploymentDetails).not.toHaveBeenCalled();
  });

  it('detaches the agent on Delete', async () => {
    await render();

    await click(getButtonByText(ButtonsI18nKeys.Delete));

    expect(onRemove).toHaveBeenCalledWith(MCP_APP.id);
    expect(onClose).toHaveBeenCalled();
  });

  it('puts Delete before Close in a right-to-left document', async () => {
    document.documentElement.dir = 'rtl';
    await render();

    const del = getButtonByText(ButtonsI18nKeys.Delete) as HTMLElement;
    const close = getButtonByText(ButtonsI18nKeys.Close) as HTMLElement;
    expect(del.compareDocumentPosition(close) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});
