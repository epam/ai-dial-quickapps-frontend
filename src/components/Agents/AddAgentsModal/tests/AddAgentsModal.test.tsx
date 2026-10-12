import { CatalogEntityType } from '@epam/ai-dial-chat-shared';
import { describe, expect, it, vi } from 'vitest';

import { setupTestRoot } from '@/test-utils/test-root';

import { DialEntityType } from '@/types/dial-entities';
import type { AddOnCatalogModalProps } from '@/components/common/AddOnCatalogModal/AddOnCatalogModal';
import type { DialModel } from '@/types/dial-entities';

import { AddAgentsModal } from '../AddAgentsModal';

const { captured } = vi.hoisted(() => ({ captured: { props: undefined as unknown } }));

const makeAgent = (id: string, name: string, type: DialModel['type']) =>
  ({ id, reference: id, name, type }) as DialModel;

const GPT = makeAgent('gpt-4o', 'GPT-4o', DialEntityType.Model);
const RESEARCH = makeAgent('applications/public/research', 'Research', DialEntityType.Application);
const SELF = makeAgent('applications/me/this-app__1.0', 'This app', DialEntityType.Application);
const MCP = makeAgent('applications/public/mcp-agent', 'MCP agent', DialEntityType.Application);

vi.mock('@/hooks/use-translation', () => import('@/test-utils/mock-translation'));
vi.mock('@/context/AppContext', () => ({
  useAppContext: () => ({ app: { id: 'applications/me/this-app__2.0' } }),
}));
vi.mock('@/context/DataContext', () => ({
  useDataContext: () => ({ models: [GPT, RESEARCH, SELF], mcpAgents: [MCP], userBucket: 'me' }),
}));
vi.mock('@/components/common/AddOnCatalogModal/AddOnCatalogModal', () => ({
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
        agentIds={[GPT.id]}
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
    expect(props.initialCheckedIds).toEqual([GPT.id]);
  });

  it('labels the popup for agents', () => {
    dom.render(<AddAgentsModal allIds={[]} agentIds={[]} onConfirm={vi.fn()} onClose={vi.fn()} />);

    const { labels } = captured.props as AddOnCatalogModalProps;
    expect(labels).toMatchObject({
      title: 'Add agent',
      catalog: 'Agents catalog',
      search: 'Search agents...',
      empty: 'No agents available',
      selectAll: 'Select all agents',
    });
    expect(labels.selectRow('Research')).toBe('Select Research');
  });
});
