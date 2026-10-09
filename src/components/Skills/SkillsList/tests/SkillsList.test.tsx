import { act, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { DialSkill } from '@/types/dial-entities';

import SkillsList from '../SkillsList';

const makeSkill = (id: string, name: string, overrides: Partial<DialSkill> = {}): DialSkill => ({
  id,
  reference: id,
  name,
  type: 'skill',
  ...overrides,
});

const SKILLS_MAP: Record<string, DialSkill> = {
  'skills/public/web-search': makeSkill('skills/public/web-search', 'Web Search', {
    version: '1.4.6',
  }),
  'skills/public/user-research': makeSkill('skills/public/user-research', 'User Research'),
};

vi.mock('@/hooks/use-translation', () => ({
  useTranslation: () => ({
    language: 'en',
    t: (key: string, options?: Record<string, string>) =>
      key.replace(/\{\{(\w+)\}\}/g, (_, name: string) => options?.[name] ?? ''),
  }),
}));

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

let root: Root;
let container: HTMLDivElement;

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
    root.render(<Harness initial={initial} isReadonly={isReadonly} />);
  });
};

const getButton = (name: string) =>
  [...container.querySelectorAll('button')].find(
    (button) => (button.getAttribute('aria-label') ?? button.textContent) === name,
  );

const click = async (element?: Element | null) => {
  expect(element).toBeTruthy();
  await act(async () => {
    (element as HTMLElement).click();
    // Let the lazily loaded popup module resolve.
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
};

beforeEach(() => {
  (globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  document.documentElement.dir = '';
});

describe('SkillsList', () => {
  it('lists the attached skills in order with their initials and names', async () => {
    await render(['skills/public/web-search', 'skills/public/user-research']);

    const items = [...container.querySelectorAll('li')];
    expect(items.map((item) => item.textContent)).toEqual([
      expect.stringContaining('Web Search'),
      expect.stringContaining('User Research'),
    ]);
    expect(items[0].textContent).toContain('WS');
    expect(items[1].textContent).toContain('UR');
  });

  it('shows the version only when the listing has one', async () => {
    await render(['skills/public/web-search', 'skills/public/user-research']);

    const [first, second] = container.querySelectorAll('li');
    expect(first.textContent).toContain('1.4.6');
    expect(second.textContent).not.toMatch(/\d+\.\d+/);
  });

  it('names a skill missing from the catalog after its id', async () => {
    await render(['skills/public/deleted-skill']);

    expect(getButton('deleted-skill details')).toBeTruthy();
  });

  it('gives each item a details button followed by a remove button', async () => {
    await render(['skills/public/web-search']);

    const labels = [...container.querySelectorAll('li button')].map((button) =>
      button.getAttribute('aria-label'),
    );
    expect(labels).toEqual(['Web Search details', 'Remove Web Search']);
  });

  it('keeps the remove button hidden until the item is hovered or focused', async () => {
    await render(['skills/public/web-search']);

    const remove = getButton('Remove Web Search') as HTMLButtonElement;
    expect(remove.className).toContain('opacity-0');
    expect(remove.className).toContain('group-hover:opacity-100');
    expect(remove.className).toContain('group-has-[:focus-visible]:opacity-100');
    expect(remove.className).not.toContain('group-focus-within');
    expect(remove.tabIndex).not.toBe(-1);
  });

  it('removes a skill from the list without opening its details', async () => {
    await render(['skills/public/web-search', 'skills/public/user-research']);

    await click(getButton('Remove User Research'));

    expect(container.querySelector('[data-testid="value"]')?.textContent).toBe(
      'skills/public/web-search',
    );
    expect(container.querySelector('[role="dialog"]')).toBeNull();
    expect(document.activeElement).toBe(getButton('Web Search details'));
  });

  it('renders no remove button in a read-only application', async () => {
    await render(['skills/public/web-search'], true);

    expect(getButton('Remove Web Search')).toBeUndefined();
  });

  it('renders nothing without attached skills', async () => {
    await render([]);

    expect(container.querySelector('ul')).toBeNull();
  });

  it('opens the details popup of the activated skill', async () => {
    await render(['skills/public/web-search', 'skills/public/user-research']);

    await click(getButton('User Research details'));

    expect(container.querySelector('[role="dialog"]')?.getAttribute('aria-label')).toBe(
      'User Research',
    );
    expect(container.querySelector('[data-testid="popup-skill-id"]')?.textContent).toBe(
      'skills/public/user-research',
    );
  });

  it('detaches the skill on Delete and moves focus to the remaining list', async () => {
    await render(['skills/public/web-search', 'skills/public/user-research']);
    await click(getButton('User Research details'));

    await click(getButton('Delete'));

    expect(container.querySelector('[data-testid="value"]')?.textContent).toBe(
      'skills/public/web-search',
    );
    expect(container.querySelector('[role="dialog"]')).toBeNull();
    expect(document.activeElement).toBe(getButton('Web Search details'));
  });

  it('closes without changes', async () => {
    await render(['skills/public/web-search']);
    await click(getButton('Web Search details'));

    await click(getButton('Close'));

    expect(container.querySelector('[role="dialog"]')).toBeNull();
    expect(container.querySelector('[data-testid="value"]')?.textContent).toBe(
      'skills/public/web-search',
    );
  });

  it('still opens details in a read-only application, without Delete', async () => {
    await render(['skills/public/web-search'], true);
    await click(getButton('Web Search details'));

    expect(container.querySelector('[role="dialog"]')).not.toBeNull();
    expect(getButton('Delete')).toBeUndefined();
  });

  it('keeps avatar before name in a right-to-left document', async () => {
    document.documentElement.dir = 'rtl';
    await render(['skills/public/web-search']);

    const button = getButton('Web Search details') as HTMLButtonElement;
    const [avatar, header] = [...button.children];
    expect(avatar.getAttribute('aria-hidden')).toBe('true');
    expect(header.textContent).toContain('Web Search');
    expect(button.className).toContain('text-start');
    expect(button.className).not.toMatch(/\b(ml|mr|pl|pr|text-left|text-right)-?/);
  });
});
