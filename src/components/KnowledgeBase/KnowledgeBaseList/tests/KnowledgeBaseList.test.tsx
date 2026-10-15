import { describe, expect, it, vi } from 'vitest';

import {
  ApplicationEditorI18nKeys,
  BasicI18nKeys,
  CatalogI18nKeys,
} from '@/constants/translation-keys';
import { click } from '@/test-utils/dom';
import { setupTestRoot } from '@/test-utils/test-root';

import { KnowledgeBaseList } from '../KnowledgeBaseList';

vi.mock('@/context/AuthContext', () => ({
  useAuthContext: () => ({ user: { bucket: 'abc' } }),
}));

const dom = setupTestRoot();

const getItem = (text: string) =>
  [...dom.container.querySelectorAll('ul > li')].find((item) =>
    item.textContent?.includes(text),
  ) as HTMLElement;

const files = [
  'files/public/user-research-reports/',
  'files/abc/',
  'files/public/Dial-Design/survey.pdf',
];

describe('KnowledgeBaseList', () => {
  it('renders one item per file with its breadcrumb path in order', () => {
    dom.render(<KnowledgeBaseList files={files} onRemove={vi.fn()} />);

    const items = [...dom.container.querySelectorAll('ul > li')];
    expect(items).toHaveLength(3);
    expect(items[0].textContent).toContain(BasicI18nKeys.Organization);
    expect(items[0].textContent).toContain('user-research-reports');
    expect(items[1].textContent).toBe(CatalogI18nKeys.FolderPersonal);
    expect(items[2].textContent).toContain('Dial-Design');
    expect(items[2].textContent).toContain('survey.pdf');
  });

  it('labels the path navigation of each item', () => {
    dom.render(<KnowledgeBaseList files={files} onRemove={vi.fn()} />);

    const items = [...dom.container.querySelectorAll('ul > li')];
    expect(items).toHaveLength(3);
    items.forEach((item) => {
      expect(item.querySelector('nav')?.getAttribute('aria-label')).toBe(
        ApplicationEditorI18nKeys.KnowledgeBasePathLabel,
      );
    });
  });

  it('marks the last path segment as the current item', () => {
    dom.render(<KnowledgeBaseList files={files} onRemove={vi.fn()} />);

    const current = dom.container
      .querySelectorAll('ul > li')[2]
      .querySelector('[aria-current="page"]');
    expect(current?.textContent).toBe('survey.pdf');
  });

  it('removes only the item whose trash button is activated', () => {
    const onRemove = vi.fn();
    dom.render(<KnowledgeBaseList files={files} onRemove={onRemove} />);

    click(
      getItem('survey.pdf').querySelector(
        `button[aria-label="${ApplicationEditorI18nKeys.KnowledgeBaseRemoveItem}"]`,
      ),
    );

    expect(onRemove).toHaveBeenCalledTimes(1);
    expect(onRemove).toHaveBeenCalledWith('files/public/Dial-Design/survey.pdf');
  });

  it('keeps the trash button focusable and revealed on hover or focus', () => {
    dom.render(<KnowledgeBaseList files={files} onRemove={vi.fn()} />);

    const button = dom.container.querySelector('ul > li button') as HTMLButtonElement;
    expect(button.className).toContain('opacity-0');
    expect(button.className).toContain('group-hover:opacity-100');
    expect(button.className).toContain('focus-visible:opacity-100');
    expect(button.hidden).toBe(false);
  });

  it('hides the trash buttons when no remove handler is given', () => {
    dom.render(<KnowledgeBaseList files={files} />);

    expect(dom.container.querySelectorAll('ul > li')).toHaveLength(3);
    expect(dom.container.querySelector('ul > li button')).toBeNull();
  });

  it('uses logical layout and mirrored separators for right-to-left locales', () => {
    dom.render(<KnowledgeBaseList files={files} onRemove={vi.fn()} />);

    const item = dom.container.querySelector('ul > li') as HTMLElement;
    expect(item.className).not.toMatch(/(^|\s)(ml|mr|pl|pr|left|right)-/);
    expect(item.querySelector('nav svg')?.getAttribute('class')).toContain('rtl:scale-x-[-1]');
  });
});
