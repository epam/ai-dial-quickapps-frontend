import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { DialSkill } from '@/types/dial-entities';

import { SkillDetailsPopup } from '../SkillDetailsPopup';

const { fetchSkillManifest } = vi.hoisted(() => ({ fetchSkillManifest: vi.fn() }));

vi.mock('@/utils/dialClient', () => ({ fetchSkillManifest }));

vi.mock('@/hooks/use-translation', () => ({
  useTranslation: () => ({ language: 'en-US', t: (key: string) => key }),
}));

vi.mock('@/context/DataContext', () => ({
  useDataContext: () => ({ userBucket: 'user-bucket-123' }),
}));

const SKILL: DialSkill = {
  id: 'skills/public/research/user-research',
  reference: 'skills/public/research/user-research',
  name: 'User Research',
  type: 'skill',
  description: 'Listing description',
  author: 'jane.doe',
  updatedAt: Date.UTC(2025, 9, 7, 12),
};

const MANIFEST = [
  '---',
  'name: User Research',
  'description: Plan, conduct, and synthesize user research.',
  '---',
  '# Interview Guide',
  '',
  'Help plan, execute, and synthesize user research studies.',
].join('\n');

let root: Root;
let container: HTMLDivElement;
const onRemove = vi.fn();
const onClose = vi.fn();

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

const render = async (props: { skill?: DialSkill; isReadonly?: boolean } = {}) => {
  const skill = 'skill' in props ? props.skill : SKILL;
  await act(async () => {
    root.render(
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

const click = async (element?: HTMLElement) => {
  expect(element).toBeTruthy();
  await act(async () => {
    element?.click();
    await flush();
  });
};

beforeEach(() => {
  (globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;
  fetchSkillManifest.mockReset();
  fetchSkillManifest.mockResolvedValue(MANIFEST);
  onRemove.mockReset();
  onClose.mockReset();
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  document.documentElement.dir = '';
});

describe('SkillDetailsPopup', () => {
  it('opens a dialog named by the skill on the Details tab', async () => {
    await render();

    expect(getDialog()?.getAttribute('aria-label')).toBe('User Research');
    expect(getDialog()?.textContent).toContain('Skill');
    expect(getTab('Details')?.getAttribute('aria-selected')).toBe('true');
    expect(getTab('Overview')?.getAttribute('aria-selected')).toBe('false');
  });

  it('shows the manifest description and rendered body without frontmatter', async () => {
    await render();

    const dialog = getDialog();
    expect(fetchSkillManifest).toHaveBeenCalledWith(SKILL, expect.any(AbortSignal));
    expect(dialog?.textContent).toContain('Plan, conduct, and synthesize user research.');
    const headings = [...(dialog?.querySelectorAll('h1, h2, h3, h4') ?? [])].map(
      (heading) => heading.textContent,
    );
    expect(headings).toContain('Interview Guide');
    expect(dialog?.textContent).not.toContain('name: User Research');
    expect(dialog?.textContent).not.toContain('---');
  });

  it('shows author, folder and updated date on Overview, without an absent version', async () => {
    await render();

    await click(getTab('Overview'));

    const terms = [...document.querySelectorAll('dt')].map((term) => term.textContent);
    const values = [...document.querySelectorAll('dd')].map((value) => value.textContent);
    expect(terms).toEqual(['Author', 'Folder', 'Updated']);
    expect(values).toEqual(['jane.doe', 'Organization / research', 'Oct 7, 2025']);
  });

  it('detaches the skill and closes on Delete', async () => {
    await render();

    await click(getButtonByText('Delete'));

    expect(onRemove).toHaveBeenCalledWith(SKILL.id);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('offers only Close in a read-only application', async () => {
    await render({ isReadonly: true });

    expect(getButtonByText('Delete')).toBeUndefined();
    await click(getButtonByText('Close'));
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

  it('shows the error with a Retry that loads the manifest again', async () => {
    fetchSkillManifest.mockReset();
    fetchSkillManifest.mockRejectedValueOnce(new Error('boom')).mockResolvedValueOnce(MANIFEST);
    await render();

    expect(getDialog()?.textContent).toContain('Failed to load skill content');
    expect(getDialog()?.textContent).toContain('Listing description');

    await click(getButtonByText('Retry'));

    expect(fetchSkillManifest).toHaveBeenCalledTimes(2);
    expect(getDialog()?.textContent).toContain('Interview Guide');
  });

  it('shows the loading state while the manifest is pending', async () => {
    fetchSkillManifest.mockReset();
    fetchSkillManifest.mockReturnValue(new Promise(() => undefined));
    await render();

    expect(document.querySelector('[aria-label="Loading skill content…"]')).not.toBeNull();
    expect(getDialog()?.textContent).toContain('Listing description');
  });

  it('shows an unavailable skill without requesting it, and still offers Delete', async () => {
    await render({ skill: undefined });

    expect(fetchSkillManifest).not.toHaveBeenCalled();
    expect(getDialog()?.getAttribute('aria-label')).toBe('user-research');
    expect(getDialog()?.textContent).toContain('This skill is no longer available');
    expect(getButtonByText('Delete')).toBeTruthy();
  });

  it('places Delete before Close in a right-to-left document', async () => {
    document.documentElement.dir = 'rtl';
    await render();

    const buttons = [...document.querySelectorAll('button')].map((button) =>
      button.textContent?.trim(),
    );
    expect(buttons.indexOf('Delete')).toBeLessThan(buttons.indexOf('Close'));
  });
});
