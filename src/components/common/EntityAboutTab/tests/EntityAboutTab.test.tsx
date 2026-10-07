import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { EntityAboutTab } from '../EntityAboutTab';

vi.mock('@/hooks/use-translation', () => ({
  useTranslation: () => ({ language: 'en', t: (key: string) => key }),
}));

let root: Root;
let container: HTMLDivElement;

beforeEach(() => {
  (globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

describe('EntityAboutTab', () => {
  it('renders the description as Markdown followed by the topics', () => {
    act(() => root.render(<EntityAboutTab description="Edits **designs**." topics={['Design']} />));

    expect(container.querySelector('strong')?.textContent).toBe('designs');
    // jsdom has no layout, so the topics line collapses everything into its overflow chip.
    expect(container.textContent).toContain('+1');
  });

  it('says there is no description when it is blank', () => {
    act(() => root.render(<EntityAboutTab description="   " />));

    expect(container.textContent).toBe('No description');
  });
});
