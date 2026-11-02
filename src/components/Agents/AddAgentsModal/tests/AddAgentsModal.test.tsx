import { type AddOnCatalogModalProps, CatalogLoadStatus } from '@epam/ai-dial-catalog';
import { CatalogEntityType } from '@epam/ai-dial-chat-shared';
import { describe, expect, it, vi } from 'vitest';

import { ApplicationEditorI18nKeys } from '@/constants/translation-keys';
import { setupTestRoot } from '@/test-utils/test-root';

import { DialEntityType } from '@/types/dial-entities';
import type { DialModel } from '@/types/dial-entities';

import { AddAgentsModal } from '../AddAgentsModal';

const { captured, SHARED } = vi.hoisted(() => ({
  captured: { props: undefined as unknown },
  SHARED: {
    labels: { cancel: 'cancel', add: 'add' },
    status: 'ready',
    error: 'chat-api error',
    onRetry: () => undefined,
  },
}));

const makeAgent = (id: string, name: string, type: DialModel['type']) =>
  ({ id, reference: id, name, type }) as DialModel;

const GPT = makeAgent('gpt-4o', 'GPT-4o', DialEntityType.Model);
const RESEARCH = makeAgent('applications/public/research', 'Research', DialEntityType.Application);
const SELF = makeAgent('applications/me/this-app__1.0', 'This app', DialEntityType.Application);
const MCP = makeAgent('applications/public/mcp-agent', 'MCP agent', DialEntityType.Application);

vi.mock('@/context/AppContext', () => ({
  useAppContext: () => ({ app: { id: 'applications/me/this-app__2.0' } }),
}));
vi.mock('@/context/DataContext', () => ({
  useDataContext: () => ({ models: [GPT, RESEARCH, SELF], mcpAgents: [MCP], userBucket: 'me' }),
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

describe('AddAgentsModal', () => {
  it('offers models, applications and MCP agents, without the app being edited', () => {
    dom.render(
      <AddAgentsModal
        allIds={['toolsets/public/figma', GPT.id]}
        onConfirm={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    const props = captured.props as AddOnCatalogModalProps;
    expect(props.type).toBe(CatalogEntityType.Agent);
    expect(props.items.map((item) => [item.name, item.type])).toEqual([
      ['GPT-4o', CatalogEntityType.Model],
      ['Research', CatalogEntityType.Agent],
      ['MCP agent', CatalogEntityType.Agent],
    ]);
    expect(props.attachedIds).toEqual(['toolsets/public/figma', GPT.id]);
  });

  it('labels the popup for agents', () => {
    dom.render(<AddAgentsModal allIds={[]} onConfirm={vi.fn()} onClose={vi.fn()} />);

    const { labels } = captured.props as AddOnCatalogModalProps;
    expect(labels).toMatchObject({
      title: ApplicationEditorI18nKeys.AgentsAdd,
      catalog: ApplicationEditorI18nKeys.AgentsCatalogTitle,
      search: ApplicationEditorI18nKeys.AgentsSearchPlaceholder,
      empty: ApplicationEditorI18nKeys.AgentsEmpty,
      selectAll: ApplicationEditorI18nKeys.AgentsSelectAll,
    });
    expect(labels.selectRow?.('Research')).toBe(ApplicationEditorI18nKeys.AddOnsSelect);
  });

  it('hands over the shared picker strings and the load state', () => {
    dom.render(<AddAgentsModal allIds={[]} onConfirm={vi.fn()} onClose={vi.fn()} />);

    const props = captured.props as AddOnCatalogModalProps;
    expect(props.labels).toMatchObject(SHARED.labels);
    expect(props.status).toBe(CatalogLoadStatus.Ready);
    expect(props.error).toBe(SHARED.error);
    expect(props.onRetry).toBe(SHARED.onRetry);
    expect(props.listProps?.columnVisibility?.favorite?.(CatalogEntityType.Model)).toBe(false);
  });
});
