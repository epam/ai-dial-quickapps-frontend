import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { CatalogContentNodeType, type CatalogItem } from '@epam/ai-dial-catalog';
import { CatalogEntityType } from '@epam/ai-dial-chat-shared';
import { EntityType } from '@epam/ai-dial-ui-kit';

import { QuickAppEditorI18nKeys } from '@/constants/i18n';
import { DetailsStatus } from '@/types/entity-details';

import { AddOnDetailsPopup, type AddOnDetailsPopupProps } from '../AddOnDetailsPopup';

const { appContext } = vi.hoisted(() => ({
  appContext: { settings: { dialCoreExternalUrl: undefined as string | undefined } },
}));

vi.mock('@/hooks/use-translation', () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, string>) =>
      key.replace(/\{\{(\w+)\}\}/g, (_, name: string) => options?.[name] ?? ''),
    language: 'en',
  }),
}));
vi.mock('@/context/AppContext', () => ({ useAppContext: () => appContext }));

const listing = {
  id: 'skills/public/research',
  name: 'User Research',
  type: CatalogEntityType.Skill,
  description: 'Listing description',
  topics: [],
  folder: ['Organization', 'research'],
} as unknown as CatalogItem;

const skillWithFiles = {
  ...listing,
  details: {
    promptContent: {
      content: 'Manifest body',
      selectedFileId: 'SKILL.md',
      files: [
        { type: CatalogContentNodeType.File, id: 'SKILL.md', name: 'SKILL.md' },
        { type: CatalogContentNodeType.File, id: 'guide.md', name: 'guide.md' },
      ],
    },
  },
} as unknown as CatalogItem;

let root: Root;
let container: HTMLDivElement;

beforeEach(() => {
  (globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;
  appContext.settings.dialCoreExternalUrl = undefined;
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

const render = (props: Partial<AddOnDetailsPopupProps> = {}) => {
  act(() =>
    root.render(
      <AddOnDetailsPopup
        entityType={EntityType.Skill}
        typeLabel="Skill"
        name="User Research"
        folder={['Organization', 'research']}
        item={listing}
        detailsStatus={DetailsStatus.Ready}
        onRetry={vi.fn()}
        isReadonly={false}
        deleteLabel="Delete"
        onDelete={vi.fn()}
        onClose={vi.fn()}
        {...props}
      />,
    ),
  );
};

const dialog = () => document.body.querySelector('[role="dialog"]') as HTMLElement;

describe('AddOnDetailsPopup — catalog layout', () => {
  it('draws the identity with a 52px icon and the folder as a FolderPath', () => {
    render();

    const folderPath = dialog().querySelector(
      `nav[aria-label="${QuickAppEditorI18nKeys.FolderPathAriaLabel}"]`,
    );
    expect(folderPath?.textContent).toContain('Organization');
    expect(folderPath?.textContent).toContain('research');
    expect(dialog().querySelector('[style*="52px"]')).not.toBeNull();
  });

  it('indents the action row under the name', () => {
    render({ actions: <button type="button">Log in</button> });

    const button = [...dialog().querySelectorAll('button')].find(
      (node) => node.textContent === 'Log in',
    );
    expect(button?.parentElement?.className).toContain('ps-[60px]');
  });

  it('shows the loading skeleton as a labelled status next to the tabs', () => {
    render({ detailsStatus: DetailsStatus.Loading });

    const status = dialog().querySelector(
      `[role="status"][aria-label="${QuickAppEditorI18nKeys.LoadingDetails}"]`,
    );
    expect(status).not.toBeNull();
    expect(status?.parentElement?.querySelector('[role="tablist"]')).not.toBeNull();
  });

  it('labels Markdown controls with the app translations', () => {
    const toolset = {
      ...listing,
      type: CatalogEntityType.Toolset,
      description: '```js\nconst x = 1;\n```',
    } as unknown as CatalogItem;
    render({ entityType: EntityType.Toolset, item: toolset });

    expect(
      dialog().querySelector(`button[aria-label="${QuickAppEditorI18nKeys.MarkdownCopyCode}"]`),
    ).not.toBeNull();
  });

  it('offers the package file selector on a multi-file skill', () => {
    render({ item: skillWithFiles });

    expect(dialog().textContent).toContain('Manifest body');
    expect(dialog().textContent).toContain('SKILL.md');
    expect(dialog().textContent).toContain('2 files');
  });
});

describe('AddOnDetailsPopup — Connect', () => {
  const MCP_URL = 'https://core.example.com/v1/toolsets/public/figma/mcp';
  const toolset = {
    ...listing,
    type: CatalogEntityType.Toolset,
    details: { api: { resource: { endpointUrl: MCP_URL } } },
  } as unknown as CatalogItem;

  const tabNames = () =>
    [...dialog().querySelectorAll('[role="tab"]')].map((tab) => tab.textContent?.trim());

  it('shows Connect last with the endpoint when a DIAL Core URL is set', () => {
    appContext.settings.dialCoreExternalUrl = 'https://core.example.com';
    render({ entityType: EntityType.Toolset, item: toolset });

    expect(tabNames().at(-1)).toBe(QuickAppEditorI18nKeys.ConnectTab);

    const connect = [...dialog().querySelectorAll<HTMLElement>('[role="tab"]')].at(-1);
    act(() => connect?.click());

    expect(dialog().textContent).toContain(MCP_URL);
  });

  it('hides Connect without a DIAL Core URL', () => {
    render({ entityType: EntityType.Toolset, item: toolset });

    expect(tabNames()).not.toContain(QuickAppEditorI18nKeys.ConnectTab);
  });
});
