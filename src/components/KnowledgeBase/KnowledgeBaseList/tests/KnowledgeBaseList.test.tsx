import { describe, expect, it, vi } from 'vitest';

import { QuickAppEditorI18nKeys } from '@/constants/i18n';
import { click } from '@/test-utils/dom';
import { setupTestRoot } from '@/test-utils/test-root';

import { KnowledgeBaseList } from '../KnowledgeBaseList';

vi.mock('@/hooks/use-translation', () => import('@/test-utils/mock-translation'));
vi.mock('@/context/AuthContext', () => ({
  useAuthContext: () => ({ user: { bucket: 'abc' } }),
}));

const dom = setupTestRoot();

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
    expect(items[0].textContent).toContain(QuickAppEditorI18nKeys.KnowledgeBaseOrganization);
    expect(items[0].textContent).toContain('user-research-reports');
    expect(items[1].textContent).toBe(QuickAppEditorI18nKeys.KnowledgeBasePersonal);
    expect(items[2].textContent).toContain('Dial-Design');
    expect(items[2].textContent).toContain('survey.pdf');
  });

  it('names each path navigation by the item', () => {
    dom.render(<KnowledgeBaseList files={files} onRemove={vi.fn()} />);

    expect(dom.container.querySelector('nav[aria-label="Path of survey.pdf"]')).not.toBeNull();
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
      dom.container.querySelector('button[aria-label="Remove survey.pdf from knowledge base"]'),
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
