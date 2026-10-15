import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { setupTestRoot } from '@/test-utils/test-root';
import { DialEntityType } from '@/types/dial-entities';
import type { DialSkill } from '@/types/dial-entities';

import { SkillDetailsPopup } from '../SkillDetailsPopup';
import {
  ApplicationEditorI18nKeys,
  BasicI18nKeys,
  ButtonsI18nKeys,
  CatalogI18nKeys,
} from '@/constants/translation-keys';

const { skillsApi } = vi.hoisted(() => ({
  skillsApi: { downloadSkillFileRaw: vi.fn(), listSkillFiles: vi.fn(), getSkillMetadata: vi.fn() },
}));

vi.mock('@/utils/chat-api-client', () => ({ skillsApi, deploymentsApi: {} }));
vi.mock('@/context/DataContext', () => ({
  useDataContext: () => ({ userBucket: 'user-bucket-123', skills: [SKILL] }),
}));
vi.mock('@/context/AppContext', () => ({ useAppContext: () => ({ settings: {} }) }));

const SKILL: DialSkill = {
  id: 'skills/public/research/user-research',
  reference: 'skills/public/research/user-research',
  name: 'User Research',
  type: DialEntityType.Skill,
  description: 'Listing description',
  author: 'listing.author',
  updatedAt: Date.UTC(2025, 9, 7, 12),
};

const MANIFEST = [
  '---',
  'name: User Research',
  'description: Plan, conduct, and synthesize user research.',
  'when_to_use: When a study needs planning.',
  '---',
  '# Interview Guide',
  '',
  'Help plan, execute, and synthesize user research studies.',
].join('\n');

const FILES = {
  items: [
    {
      name: 'SKILL.md',
      path: 'research/user-research/SKILL.md',
      url: 'skills/public/research/user-research/SKILL.md',
      bucket: 'public',
      nodeType: 'item',
    },
  ],
};

const dom = setupTestRoot();
const onRemove = vi.fn();
const onClose = vi.fn();

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

const render = async (props: { skill?: DialSkill; isReadonly?: boolean } = {}) => {
  const skill = 'skill' in props ? props.skill : SKILL;
  await act(async () => {
    dom.root.render(
      <SkillDetailsPopup
        skillId={SKILL.id}
        skill={skill}
        fallbackName="user-research"
        isReadonly={props.isReadonly ?? false}
        onRemove={onRemove}
        onClose={onClose}
      />,
    );
    await flush();
  });
};

const getDialog = () => document.querySelector('[role="dialog"]') as HTMLElement | null;

const getButtonByText = (text: string) =>
  [...document.querySelectorAll('button')].find((button) => button.textContent?.trim() === text);

const getTab = (name: string) =>
  [...document.querySelectorAll('[role="tab"]')].find((tab) => tab.textContent === name) as
    HTMLElement | undefined;

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
  vi.clearAllMocks();
  skillsApi.downloadSkillFileRaw.mockImplementation(async () => ({ raw: new Response(MANIFEST) }));
  skillsApi.listSkillFiles.mockResolvedValue(FILES);
  skillsApi.getSkillMetadata.mockResolvedValue({
    name: 'user-research',
    path: 'research/user-research',
    url: SKILL.id,
    bucket: 'public',
    nodeType: 'item',
    author: 'jane.doe',
    updatedAt: Date.UTC(2025, 9, 7, 12),
  });
});

afterEach(() => {
  document.documentElement.dir = '';
});

describe('SkillDetailsPopup', () => {
  it('opens a dialog named by the skill on Details, with Overview and the folder line', async () => {
    await render();

    expect(getDialog()?.getAttribute('aria-label')).toBe('User Research');
    expect(getDialog()?.textContent).toContain(CatalogI18nKeys.DetailsSkillSection);
    // The catalog's folder line: a FolderPath nav, one segment per folder.
    const folderPath = getDialog()?.querySelector('nav[aria-label="Folder path"]');
    expect(folderPath?.textContent).toContain(BasicI18nKeys.Organization);
    expect(folderPath?.textContent).toContain('research');
    expect(getTabNames()).toEqual([
      CatalogI18nKeys.DetailsTabContent,
      CatalogI18nKeys.DetailsTabOverview,
    ]);
    expect(getTab(CatalogI18nKeys.DetailsTabContent)?.getAttribute('aria-selected')).toBe('true');
  });

  it('shows the manifest description and rendered body without frontmatter', async () => {
    await render();

    const dialog = getDialog();
    expect(skillsApi.downloadSkillFileRaw).toHaveBeenCalledWith(
      { bucket: 'public', path: 'research/user-research', filePath: 'SKILL.md' },
      { signal: undefined },
    );
    expect(dialog?.textContent).toContain('Plan, conduct, and synthesize user research.');
    const headings = [...(dialog?.querySelectorAll('h1, h2, h3, h4') ?? [])].map(
      (heading) => heading.textContent,
    );
    expect(headings).toContain('Interview Guide');
    expect(dialog?.textContent).not.toContain('name: User Research');
  });

  it('shows the catalog’s Specification and Skill sections on Overview', async () => {
    await render();

    await click(getTab(CatalogI18nKeys.DetailsTabOverview));

    const panel = document.querySelector('[role="tabpanel"]');
    expect(panel?.textContent).toContain(CatalogI18nKeys.DetailsOverviewSpecification);
    expect(panel?.textContent).toContain(CatalogI18nKeys.DetailsSkillWhenToUse);
    expect(panel?.textContent).toContain('When a study needs planning.');
    expect(panel?.textContent).toContain(CatalogI18nKeys.DetailsSkillAuthor);
    expect(panel?.textContent).toContain('jane.doe');
    expect(panel?.textContent).toContain(CatalogI18nKeys.DetailsSkillFileCount);
  });

  it('falls back to the listing author when the skill’s metadata fails', async () => {
    skillsApi.getSkillMetadata.mockRejectedValueOnce(new Error('403'));
    await render();

    await click(getTab(CatalogI18nKeys.DetailsTabOverview));

    expect(document.querySelector('[role="tabpanel"]')?.textContent).toContain('listing.author');
  });

  it('hides Overview when the file listing fails', async () => {
    skillsApi.listSkillFiles.mockRejectedValueOnce(new Error('boom'));
    await render();

    expect(getTabNames()).toEqual([CatalogI18nKeys.DetailsTabContent]);
    expect(getDialog()?.textContent).toContain('Interview Guide');
  });

  it('shows a failure with a Retry that loads again', async () => {
    skillsApi.downloadSkillFileRaw.mockRejectedValueOnce(new Error('boom'));
    skillsApi.listSkillFiles.mockRejectedValueOnce(new Error('boom'));
    await render();

    expect(getDialog()?.textContent).toContain(CatalogI18nKeys.DetailsLoadError);
    expect(getDialog()?.textContent).toContain('Listing description');

    await click(getButtonByText(ButtonsI18nKeys.Retry));

    expect(skillsApi.downloadSkillFileRaw).toHaveBeenCalledTimes(2);
    expect(getDialog()?.textContent).toContain('Interview Guide');
    expect(getDialog()?.textContent).not.toContain(CatalogI18nKeys.DetailsLoadError);
  });

  it('shows the loading state while the details are pending', async () => {
    skillsApi.downloadSkillFileRaw.mockReturnValue(new Promise(() => undefined));
    await render();

    expect(
      document.querySelector(`[aria-label="${CatalogI18nKeys.DetailsLoading}"]`),
    ).not.toBeNull();
    expect(getDialog()?.textContent).toContain('Listing description');
  });

  it('detaches the skill and closes on Delete', async () => {
    await render();

    await click(getButtonByText(ButtonsI18nKeys.Delete));

    expect(onRemove).toHaveBeenCalledWith(SKILL.id);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('offers only Close in a read-only application', async () => {
    await render({ isReadonly: true });

    expect(getButtonByText(ButtonsI18nKeys.Delete)).toBeUndefined();
    await click(getButtonByText(ButtonsI18nKeys.Close));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onRemove).not.toHaveBeenCalled();
  });

  it('closes without detaching on Escape', async () => {
    await render();

    await act(async () => {
      getDialog()?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      await flush();
    });

    expect(onClose).toHaveBeenCalled();
    expect(onRemove).not.toHaveBeenCalled();
  });

  it('shows an unavailable skill without requesting it, and still offers Delete', async () => {
    await render({ skill: undefined });

    expect(skillsApi.downloadSkillFileRaw).not.toHaveBeenCalled();
    expect(getDialog()?.getAttribute('aria-label')).toBe('user-research');
    expect(getDialog()?.textContent).toContain(ApplicationEditorI18nKeys.SkillsUnavailable);
    expect(getButtonByText(ButtonsI18nKeys.Delete)).toBeTruthy();
  });

  it('places Delete before Close in a right-to-left document', async () => {
    document.documentElement.dir = 'rtl';
    await render();

    const buttons = [...document.querySelectorAll('button')].map((button) =>
      button.textContent?.trim(),
    );
    expect(buttons.indexOf(ButtonsI18nKeys.Delete)).toBeLessThan(
      buttons.indexOf(ButtonsI18nKeys.Close),
    );
  });
});
