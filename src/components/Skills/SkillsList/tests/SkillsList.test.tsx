import { act, useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ApplicationEditorI18nKeys } from '@/constants/translation-keys';
import { getButton } from '@/test-utils/dom';
import { setupTestRoot } from '@/test-utils/test-root';
import { DialEntityType } from '@/types/dial-entities';
import type { DialSkill } from '@/types/dial-entities';

import SkillsList from '../SkillsList';

const makeSkill = (id: string, name: string, overrides: Partial<DialSkill> = {}): DialSkill => ({
  id,
  reference: id,
  name,
  type: DialEntityType.Skill,
  ...overrides,
});

const SKILLS_MAP: Record<string, DialSkill> = {
  'skills/public/web-search': makeSkill('skills/public/web-search', 'Web Search', {
    version: '1.4.6',
  }),
  'skills/public/user-research': makeSkill('skills/public/user-research', 'User Research'),
};

vi.mock('@/context/DataContext', () => ({
  useDataContext: () => ({ skillsMap: SKILLS_MAP }),
}));

interface PopupStubProps {
  skillId: string;
  skill?: DialSkill;
  fallbackName: string;
  isReadonly: boolean;
  onRemove: (id: string) => void;
  onClose: () => void;
}

vi.mock('@/components/Skills/SkillDetailsPopup/SkillDetailsPopup', () => ({
  SkillDetailsPopup: ({
    skillId,
    skill,
    fallbackName,
    isReadonly,
    onRemove,
    onClose,
  }: PopupStubProps) => (
    <div role="dialog" aria-label={skill?.name ?? fallbackName}>
      <span data-testid="popup-skill-id">{skillId}</span>
      {!isReadonly && (
        <button type="button" onClick={() => (onRemove(skillId), onClose())}>
          Delete
        </button>
      )}
      <button type="button" onClick={onClose}>
        Close
      </button>
    </div>
  ),
}));

const dom = setupTestRoot();

const Harness = ({ initial, isReadonly = false }: { initial: string[]; isReadonly?: boolean }) => {
  const [value, setValue] = useState(initial);
  return (
    <>
      <output data-testid="value">{value.join('|')}</output>
      <SkillsList
        value={value}
        isReadonly={isReadonly}
        onRemove={(id) => setValue((prev) => prev.filter((x) => x !== id))}
      />
    </>
  );
};

const render = async (initial: string[], isReadonly?: boolean) => {
  await act(async () => {
    dom.root.render(<Harness initial={initial} isReadonly={isReadonly} />);
  });
};

// The labels come from `t`, which the test mock returns as bare keys, so an
// item's buttons are found inside the list item showing the skill's name.
const getItem = (name: string) =>
  [...dom.container.querySelectorAll('li')].find((item) => item.textContent?.includes(name));

const getDetailsButton = (name: string) => {
  const item = getItem(name);
  return item && getButton(ApplicationEditorI18nKeys.AddOnsDetails, item);
};

const getRemoveButton = (name: string) => {
  const item = getItem(name);
  return item && getButton(ApplicationEditorI18nKeys.AddOnsRemove, item);
};

const click = async (element?: Element | null) => {
  expect(element).toBeTruthy();
  await act(async () => {
    (element as HTMLElement).click();
    // Let the lazily loaded popup module resolve.
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
};

afterEach(() => {
  document.documentElement.dir = '';
});

describe('SkillsList', () => {
  it('lists the attached skills in order with their initials and names', async () => {
    await render(['skills/public/web-search', 'skills/public/user-research']);

    const items = [...dom.container.querySelectorAll('li')];
    expect(items.map((item) => item.textContent)).toEqual([
      expect.stringContaining('Web Search'),
      expect.stringContaining('User Research'),
    ]);
    expect(items[0].textContent).toContain('WS');
    expect(items[1].textContent).toContain('UR');
  });

  it('shows the version only when the listing has one', async () => {
    await render(['skills/public/web-search', 'skills/public/user-research']);

    const [first, second] = dom.container.querySelectorAll('li');
    expect(first.textContent).toContain('1.4.6');
    expect(second.textContent).not.toMatch(/\d+\.\d+/);
  });

  it('names a skill missing from the catalog after its id', async () => {
    await render(['skills/public/deleted-skill']);

    expect(getDetailsButton('deleted-skill')).toBeTruthy();
  });

  it('gives each item a details button followed by a remove button', async () => {
    await render(['skills/public/web-search']);

    const labels = [...dom.container.querySelectorAll('li button')].map((button) =>
      button.getAttribute('aria-label'),
    );
    expect(labels).toEqual([
      ApplicationEditorI18nKeys.AddOnsDetails,
      ApplicationEditorI18nKeys.AddOnsRemove,
    ]);
  });

  it('keeps the remove button hidden until the item is hovered or focused', async () => {
    await render(['skills/public/web-search']);

    const remove = getRemoveButton('Web Search') as HTMLButtonElement;
    expect(remove.className).toContain('opacity-0');
    expect(remove.className).toContain('group-hover:opacity-100');
    expect(remove.className).toContain('group-has-[:focus-visible]:opacity-100');
    expect(remove.className).not.toContain('group-focus-within');
    expect(remove.tabIndex).not.toBe(-1);
  });

  it('removes a skill from the list without opening its details', async () => {
    await render(['skills/public/web-search', 'skills/public/user-research']);

    await click(getRemoveButton('User Research'));

    expect(dom.container.querySelector('[data-testid="value"]')?.textContent).toBe(
      'skills/public/web-search',
    );
    expect(dom.container.querySelector('[role="dialog"]')).toBeNull();
    expect(document.activeElement).toBe(getDetailsButton('Web Search'));
  });

  it('renders no remove button in a read-only application', async () => {
    await render(['skills/public/web-search'], true);

    expect(getDetailsButton('Web Search')).toBeTruthy();
    expect(getRemoveButton('Web Search')).toBeUndefined();
  });

  it('renders nothing without attached skills', async () => {
    await render([]);

    expect(dom.container.querySelector('ul')).toBeNull();
  });

  it('opens the details popup of the activated skill', async () => {
    await render(['skills/public/web-search', 'skills/public/user-research']);

    await click(getDetailsButton('User Research'));

    expect(dom.container.querySelector('[role="dialog"]')?.getAttribute('aria-label')).toBe(
      'User Research',
    );
    expect(dom.container.querySelector('[data-testid="popup-skill-id"]')?.textContent).toBe(
      'skills/public/user-research',
    );
  });

  it('detaches the skill on Delete and moves focus to the remaining list', async () => {
    await render(['skills/public/web-search', 'skills/public/user-research']);
    await click(getDetailsButton('User Research'));

    await click(getButton('Delete'));

    expect(dom.container.querySelector('[data-testid="value"]')?.textContent).toBe(
      'skills/public/web-search',
    );
    expect(dom.container.querySelector('[role="dialog"]')).toBeNull();
    expect(document.activeElement).toBe(getDetailsButton('Web Search'));
  });

  it('closes without changes', async () => {
    await render(['skills/public/web-search']);
    await click(getDetailsButton('Web Search'));

    await click(getButton('Close'));

    expect(dom.container.querySelector('[role="dialog"]')).toBeNull();
    expect(dom.container.querySelector('[data-testid="value"]')?.textContent).toBe(
      'skills/public/web-search',
    );
  });

  it('still opens details in a read-only application, without Delete', async () => {
    await render(['skills/public/web-search'], true);
    await click(getDetailsButton('Web Search'));

    expect(dom.container.querySelector('[role="dialog"]')).not.toBeNull();
    expect(getButton('Delete')).toBeUndefined();
  });

  it('keeps avatar before name in a right-to-left document', async () => {
    document.documentElement.dir = 'rtl';
    await render(['skills/public/web-search']);

    const button = getDetailsButton('Web Search') as HTMLButtonElement;
    const [avatar, header] = [...button.children];
    expect(avatar.getAttribute('aria-hidden')).toBe('true');
    expect(header.textContent).toContain('Web Search');
    expect(button.className).toContain('text-start');
    expect(button.className).not.toMatch(/\b(ml|mr|pl|pr|text-left|text-right)-?/);
  });
});
