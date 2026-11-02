import { type AddOnCatalogModalProps, CatalogLoadStatus } from '@epam/ai-dial-catalog';
import { CatalogEntityType } from '@epam/ai-dial-chat-shared';
import { describe, expect, it, vi } from 'vitest';

import { ApplicationEditorI18nKeys, CatalogI18nKeys } from '@/constants/translation-keys';
import { setupTestRoot } from '@/test-utils/test-root';
import { type DialToolset, ToolsetAuthType } from '@/types/dial-entities';

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

vi.mock('@/context/DataContext', () => ({
  useDataContext: () => ({ toolsets: [FIGMA, JIRA, HIDDEN], userBucket: 'me' }),
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
  it('offers the visible toolsets only, with their sign-in state', () => {
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
    expect(props.items.map((item) => item.name)).toEqual(['Figma', 'Jira']);
    expect(props.items[0].credentials?.authenticationType).toBe('OAUTH');
    expect(props.attachedIds).toEqual(['applications/public/agent', FIGMA.id]);
    expect(props.onConfirm).toBe(onConfirm);
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
