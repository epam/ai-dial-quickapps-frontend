import { CatalogEntityType } from '@epam/ai-dial-chat-shared';
import { describe, expect, it, vi } from 'vitest';

import type { AddOnCatalogModalProps } from '@/components/common/AddOnCatalogModal/AddOnCatalogModal';
import { setupTestRoot } from '@/test-utils/test-root';
import { type DialToolset, ToolsetAuthType } from '@/types/dial-entities';

import { AddToolsetsModal } from '../AddToolsetsModal';

const { captured } = vi.hoisted(() => ({ captured: { props: undefined as unknown } }));

const makeToolset = (id: string, name: string, overrides: Partial<DialToolset> = {}) =>
  ({ id, reference: id, name, type: 'toolset', ...overrides }) as DialToolset;

const FIGMA = makeToolset('toolsets/public/figma', 'Figma', {
  authSettings: { authenticationType: ToolsetAuthType.OAuth },
});
const JIRA = makeToolset('toolsets/public/jira', 'Jira');
const HIDDEN = makeToolset('toolsets/public/.dial_folder', 'Hidden');

vi.mock('@/hooks/use-translation', () => import('@/test-utils/mock-translation'));
vi.mock('@/context/DataContext', () => ({
  useDataContext: () => ({ toolsets: [FIGMA, JIRA, HIDDEN], userBucket: 'me' }),
}));
vi.mock('@/components/common/AddOnCatalogModal/AddOnCatalogModal', () => ({
  AddOnCatalogModal: (props: unknown) => {
    captured.props = props;
    return null;
  },
}));

const dom = setupTestRoot();

describe('AddToolsetsModal', () => {
  it('offers the visible toolsets only, with their sign-in state', () => {
    const onConfirm = vi.fn();
    dom.render(
      <AddToolsetsModal
        allIds={['applications/public/agent', FIGMA.id]}
        toolsetIds={[FIGMA.id]}
        onConfirm={onConfirm}
        onClose={vi.fn()}
      />,
    );

    const props = captured.props as AddOnCatalogModalProps;
    expect(props.type).toBe(CatalogEntityType.Toolset);
    expect(props.items.map((item) => item.name)).toEqual(['Figma', 'Jira']);
    expect(props.items[0].credentials?.authenticationType).toBe('OAUTH');
    expect(props.attachedIds).toEqual(['applications/public/agent', FIGMA.id]);
    expect(props.initialCheckedIds).toEqual([FIGMA.id]);
    expect(props.onConfirm).toBe(onConfirm);
  });

  it('labels the popup for toolsets', () => {
    dom.render(
      <AddToolsetsModal allIds={[]} toolsetIds={[]} onConfirm={vi.fn()} onClose={vi.fn()} />,
    );

    const { labels } = captured.props as AddOnCatalogModalProps;
    expect(labels).toMatchObject({
      title: 'Add toolset',
      catalog: 'Toolsets catalog',
      search: 'Search toolsets...',
      empty: 'No toolsets available',
      selectAll: 'Select all toolsets',
      credentialsBadge: 'Authorize to use this toolset.',
    });
    expect(labels.selectRow('Figma')).toBe('Select Figma');
  });
});
