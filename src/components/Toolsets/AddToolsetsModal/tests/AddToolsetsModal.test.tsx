import { type AddOnCatalogModalProps, CatalogLoadStatus } from '@epam/ai-dial-catalog';
import { CatalogEntityType } from '@epam/ai-dial-chat-shared';
import { describe, expect, it, vi } from 'vitest';

import { ApplicationEditorI18nKeys, CatalogI18nKeys } from '@/constants/translation-keys';
import { setupTestRoot } from '@/test-utils/test-root';
import { type DialModel, type DialToolset, ToolsetAuthType } from '@/types/dial-entities';

import { AddToolsetsModal } from '../AddToolsetsModal';

const { captured, SHARED } = vi.hoisted(() => ({
  captured: { props: undefined as unknown },
  SHARED: {
    labels: { cancel: 'cancel', add: 'add' },
    status: 'ready',
    error: 'chat-api error',
    onRetry: () => undefined,
  },
}));

const makeToolset = (id: string, name: string, overrides: Partial<DialToolset> = {}) =>
  ({ id, reference: id, name, type: 'toolset', ...overrides }) as DialToolset;

const FIGMA = makeToolset('toolsets/public/figma', 'Figma', {
  authSettings: { authenticationType: ToolsetAuthType.OAuth },
});
const JIRA = makeToolset('toolsets/public/jira', 'Jira');
const HIDDEN = makeToolset('toolsets/public/.dial_folder', 'Hidden');

const makeAgent = (id: string, name: string) =>
  ({ id, reference: id, name, type: 'application', mcp: true }) as DialModel;

const MCP_AGENT = makeAgent('applications/public/dial-loop', 'Dial Loop');
const SELF = makeAgent('applications/me/current-app', 'Current');
const CHAT_AND_MCP_AGENT = makeAgent('applications/public/chat-mcp', 'Chat MCP');
const CHAT_ONLY_AGENT = { ...makeAgent('applications/public/chat', 'Chat only'), mcp: false };
const HIDDEN_AGENT = makeAgent('applications/public/.dial_folder', 'Hidden agent');

vi.mock('@/context/AppContext', () => ({
  useAppContext: () => ({ app: { id: 'applications/me/current-app__1.0' } }),
}));
vi.mock('@/context/DataContext', () => ({
  useDataContext: () => ({
    toolsets: [FIGMA, JIRA, HIDDEN],
    models: [CHAT_AND_MCP_AGENT, CHAT_ONLY_AGENT],
    mcpAgents: [MCP_AGENT, SELF, HIDDEN_AGENT],
    userBucket: 'me',
  }),
}));
vi.mock('@/hooks/use-catalog-picker-shared-props', () => ({
  useCatalogPickerSharedProps: () => SHARED,
}));
vi.mock('@epam/ai-dial-catalog', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@epam/ai-dial-catalog')>()),
  AddOnCatalogModal: (props: unknown) => {
    captured.props = props;
    return null;
  },
}));

const dom = setupTestRoot();

describe('AddToolsetsModal', () => {
  it('offers the visible toolsets and MCP agents, with their sign-in state', () => {
    const onConfirm = vi.fn();
    dom.render(
      <AddToolsetsModal
        allIds={['applications/public/agent', FIGMA.id]}
        onConfirm={onConfirm}
        onClose={vi.fn()}
      />,
    );

    const props = captured.props as AddOnCatalogModalProps;
    expect(props.type).toBe(CatalogEntityType.Toolset);
    expect(props.items.map((item) => item.name)).toEqual([
      'Figma',
      'Jira',
      'Dial Loop',
      'Chat MCP',
    ]);
    expect(props.items[0].credentials?.authenticationType).toBe('OAUTH');
    expect(props.attachedIds).toEqual(['applications/public/agent', FIGMA.id]);
    expect(props.onConfirm).toBe(onConfirm);
  });

  it('lists an application attached in the Agents row, unchecked', () => {
    dom.render(
      <AddToolsetsModal
        allIds={[MCP_AGENT.id]}
        otherRowIds={[MCP_AGENT.id]}
        onConfirm={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    const { items } = captured.props as AddOnCatalogModalProps;
    const props = captured.props as AddOnCatalogModalProps;
    expect(items.some((item) => item.id === MCP_AGENT.id)).toBe(true);
    expect(props.attachedIds).toEqual([]);
  });

  it('lists MCP agents as toolsets, never the edited app itself', () => {
    dom.render(<AddToolsetsModal allIds={[]} onConfirm={vi.fn()} onClose={vi.fn()} />);

    const { items } = captured.props as AddOnCatalogModalProps;
    const agent = items.find((item) => item.id === MCP_AGENT.id);
    expect(agent?.type).toBe(CatalogEntityType.Toolset);
    expect(items.some((item) => item.id === SELF.id)).toBe(false);
  });

  it('labels the popup for toolsets', () => {
    dom.render(<AddToolsetsModal allIds={[]} onConfirm={vi.fn()} onClose={vi.fn()} />);

    const { labels, listProps } = captured.props as AddOnCatalogModalProps;
    expect(labels).toMatchObject({
      title: ApplicationEditorI18nKeys.ToolsetsAdd,
      catalog: ApplicationEditorI18nKeys.ToolsetsCatalogTitle,
      search: ApplicationEditorI18nKeys.ToolsetsSearchPlaceholder,
      loading: ApplicationEditorI18nKeys.ToolsetsLoading,
      failedToLoad: ApplicationEditorI18nKeys.ToolsetsLoadError,
      empty: ApplicationEditorI18nKeys.ToolsetsEmpty,
      selectAll: ApplicationEditorI18nKeys.ToolsetsSelectAll,
    });
    expect(labels.selectRow?.('Figma')).toBe(ApplicationEditorI18nKeys.AddOnsSelect);
    expect(listProps?.credentialsBadgeLoggedOutLabel).toBe(
      CatalogI18nKeys.CredentialsBadgeLoggedOut,
    );
  });

  it('hands over the shared picker strings and the load state', () => {
    dom.render(<AddToolsetsModal allIds={[]} onConfirm={vi.fn()} onClose={vi.fn()} />);

    const props = captured.props as AddOnCatalogModalProps;
    expect(props.labels).toMatchObject(SHARED.labels);
    expect(props.status).toBe(CatalogLoadStatus.Ready);
    expect(props.error).toBe(SHARED.error);
    expect(props.onRetry).toBe(SHARED.onRetry);
    expect(props.listProps?.columnVisibility?.favorite?.(CatalogEntityType.Model)).toBe(false);
  });
});
