import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { CatalogContentNodeType, type CatalogItem } from '@epam/ai-dial-catalog';
import { CatalogEntityType } from '@epam/ai-dial-chat-shared';

import { QuickAppEditorI18nKeys } from '@/constants/i18n';
import { AppDetailsTab, DetailsStatus } from '@/types/entity-details';

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
        entityType={CatalogEntityType.Skill}
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
  it('renders the catalog header: a 52px icon, the type and the folder path', () => {
    render();

    const folderPath = dialog().querySelector('nav[aria-label="Folder path"]');
    expect(folderPath?.textContent).toContain('Organization');
    expect(folderPath?.textContent).toContain('research');
    expect(dialog().querySelector('[style*="52px"]')).not.toBeNull();
  });

  it('indents the action row under the name', () => {
    render({ actions: <button type="button">Application credentials</button> });

    const button = [...dialog().querySelectorAll('button')].find(
      (node) => node.textContent === 'Application credentials',
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
    render({ entityType: CatalogEntityType.Toolset, item: toolset });

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

describe('AddOnDetailsPopup — app-owned tabs', () => {
  const agent = {
    ...listing,
    id: 'applications/research-agent',
    type: CatalogEntityType.Agent,
    description: 'About the agent',
  } as unknown as CatalogItem;
  const settingsTab = {
    id: AppDetailsTab.Settings,
    label: 'Settings',
    content: <p>Settings content</p>,
  };

  const tabNames = () =>
    [...dialog().querySelectorAll('[role="tab"]')].map((tab) => tab.textContent);
  const selectedTab = () => dialog().querySelector('[role="tab"][aria-selected="true"]');

  it('lists an app tab after the catalog tabs, with the first tab selected', () => {
    render({ entityType: CatalogEntityType.Agent, item: agent, appTabs: [settingsTab] });

    expect(tabNames().at(-1)).toBe('Settings');
    expect(tabNames().length).toBeGreaterThan(1);
    expect(selectedTab()?.textContent).not.toBe('Settings');
    expect(dialog().textContent).not.toContain('Settings content');
  });

  it('shows the app tab content when it is selected', () => {
    render({ entityType: CatalogEntityType.Agent, item: agent, appTabs: [settingsTab] });

    const tab = [...dialog().querySelectorAll<HTMLElement>('[role="tab"]')].find(
      (node) => node.textContent === 'Settings',
    );
    act(() => tab?.click());

    const panel = dialog().querySelector('[role="tabpanel"]');
    expect(panel?.getAttribute('aria-label')).toBe('Settings');
    expect(panel?.textContent).toContain('Settings content');
  });

  it('renders no app tab while the entity is unavailable', () => {
    render({
      entityType: CatalogEntityType.Agent,
      item: undefined,
      unavailableText: 'This agent is no longer available',
      appTabs: [settingsTab],
    });

    expect(dialog().querySelector('[role="tablist"]')).toBeNull();
    expect(dialog().textContent).not.toContain('Settings content');
  });

  it('keeps the selection when an app tab appears later', () => {
    render({ entityType: CatalogEntityType.Agent, item: agent });
    const firstTab = selectedTab()?.textContent;

    render({ entityType: CatalogEntityType.Agent, item: agent, appTabs: [settingsTab] });

    expect(tabNames().at(-1)).toBe('Settings');
    expect(selectedTab()?.textContent).toBe(firstTab);
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
    render({ entityType: CatalogEntityType.Toolset, item: toolset });

    expect(tabNames().at(-1)).toBe(QuickAppEditorI18nKeys.ConnectTab);

    const connect = [...dialog().querySelectorAll<HTMLElement>('[role="tab"]')].at(-1);
    act(() => connect?.click());

    expect(dialog().textContent).toContain(MCP_URL);
  });

  it('hides Connect without a DIAL Core URL', () => {
    render({ entityType: CatalogEntityType.Toolset, item: toolset });

    expect(tabNames()).not.toContain(QuickAppEditorI18nKeys.ConnectTab);
  });
});

describe('AddOnDetailsPopup — catalog header actions', () => {
  // Owned and editable, so the catalog would offer Share and the Manage menu.
  const ownedToolset = {
    ...listing,
    type: CatalogEntityType.Toolset,
    isMyApp: true,
    isEditable: true,
    credentials: { authenticationType: 'OAUTH', isPublic: true, userStatus: 'SIGNED_OUT' },
  } as unknown as CatalogItem;

  const buttonLabels = () =>
    [...dialog().querySelectorAll('button')].map(
      (button) => button.getAttribute('aria-label') ?? button.textContent?.trim(),
    );

  it('shows only the credentials action and starts the login with it', () => {
    const onLogin = vi.fn().mockResolvedValue(undefined);
    render({
      entityType: CatalogEntityType.Toolset,
      item: ownedToolset,
      credentials: { onLogin, onLogout: vi.fn() },
    });

    expect(buttonLabels()).toContain(QuickAppEditorI18nKeys.LoginToolsetAction);
    expect(buttonLabels()).not.toContain('Share');
    expect(buttonLabels()).not.toContain('Manage');
    expect(buttonLabels()).not.toContain('Use in chat');

    const login = [...dialog().querySelectorAll('button')].find(
      (button) => button.textContent?.trim() === QuickAppEditorI18nKeys.LoginToolsetAction,
    );
    act(() => login?.click());

    expect(onLogin).toHaveBeenCalledWith({ apiKey: undefined });
  });

  it('shows no credentials action without credentials handlers', () => {
    render({ entityType: CatalogEntityType.Toolset, item: ownedToolset });

    expect(buttonLabels()).not.toContain(QuickAppEditorI18nKeys.LoginToolsetAction);
  });
});
