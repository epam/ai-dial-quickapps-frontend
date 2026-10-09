import { CatalogEntityType } from '@epam/ai-dial-chat-shared';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

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

vi.mock('@/hooks/use-translation', () => ({
  useTranslation: () => ({
    language: 'en',
    t: (key: string, options?: Record<string, string>) =>
      key.replace(/\{\{(\w+)\}\}/g, (_, name: string) => options?.[name] ?? ''),
  }),
}));
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

let root: Root;

beforeEach(() => {
  (globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;
  root = createRoot(document.createElement('div'));
});

afterEach(() => {
  act(() => root.unmount());
});

describe('AddAgentsModal', () => {
  it('offers models, applications and MCP agents, without the app being edited', () => {
    act(() =>
      root.render(
        <AddAgentsModal
          allIds={['toolsets/public/figma', GPT.id]}
          agentIds={[GPT.id]}
          onConfirm={vi.fn()}
          onClose={vi.fn()}
        />,
      ),
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
    act(() =>
      root.render(
        <AddAgentsModal allIds={[]} agentIds={[]} onConfirm={vi.fn()} onClose={vi.fn()} />,
      ),
    );

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
