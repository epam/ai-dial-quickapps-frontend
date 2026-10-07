import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { SectionRowVariant } from '@/types/section-row';

import { SectionRow } from '../SectionRow';

const PHYSICAL_DIRECTION_CLASS = /(^|\s)(ml|mr|pl|pr|left|right)-|text-(left|right)/;

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
  document.documentElement.removeAttribute('dir');
});

const getSection = () => container.querySelector('section');

const getAccessibleName = (element: Element | null) => {
  const labelledBy = element?.getAttribute('aria-labelledby');
  return labelledBy ? document.getElementById(labelledBy)?.textContent : undefined;
};

describe('SectionRow', () => {
  it('is a section named by its heading', () => {
    act(() => root.render(<SectionRow title="Default model">Content</SectionRow>));

    const heading = container.querySelector('h3');
    expect(heading?.textContent).toBe('Default model');
    expect(getAccessibleName(getSection())).toBe('Default model');
    expect(container.textContent).toContain('Content');
  });

  it('renders the action as a reachable button in the header row', () => {
    act(() =>
      root.render(
        <SectionRow title="Default model" action={<button type="button">Change</button>} />,
      ),
    );

    const button = [...container.querySelectorAll('button')].find(
      (el) => el.textContent === 'Change',
    );
    expect(button).toBeDefined();
    expect(button?.disabled).toBe(false);
    expect(button?.tabIndex).toBe(0);
    expect(button?.closest('section')).toBe(getSection());
  });

  it('renders the description when given', () => {
    act(() =>
      root.render(
        <SectionRow title="Model options" description="Additional models users can choose from." />,
      ),
    );

    const description = container.querySelector('p');
    expect(description?.textContent).toBe('Additional models users can choose from.');
  });

  it('renders no action wrapper and no description when they are omitted', () => {
    act(() => root.render(<SectionRow title="Default model" />));

    const headerRow = container.querySelector('h3')?.parentElement;
    expect(headerRow?.children).toHaveLength(1);
    expect(container.querySelector('p')).toBeNull();
  });

  it('exposes no expanded state', () => {
    act(() => root.render(<SectionRow title="Default model" action={<button>Change</button>} />));

    expect(container.querySelector('[aria-expanded]')).toBeNull();
  });

  it('keeps the heading before the action and uses no physical direction classes in RTL', () => {
    document.documentElement.dir = 'rtl';

    act(() =>
      root.render(
        <SectionRow
          title="Default model"
          description="Description"
          action={<button type="button">Change</button>}
        />,
      ),
    );

    const headerRow = container.querySelector('h3')?.parentElement;
    expect(headerRow?.firstElementChild?.tagName).toBe('H3');
    expect(headerRow?.lastElementChild?.textContent).toBe('Change');

    const classes = [...container.querySelectorAll('[class]')].map((el) => el.className);
    expect(classes.some((className) => PHYSICAL_DIRECTION_CLASS.test(className))).toBe(false);
  });

  it('styles the title as a row title by default', () => {
    act(() => root.render(<SectionRow title="Skills" />));

    expect(container.querySelector('h3')?.className).toContain('dial-small-semi-text');
  });

  it('styles the title as an uppercase caption in the caption variant', () => {
    act(() =>
      root.render(<SectionRow title="Default model" variant={SectionRowVariant.Caption} />),
    );

    expect(container.querySelector('h3')?.className).toContain('dial-caption-lead-semi-text');
  });

  it('styles the title as a tiny lead semibold primary title in the setting variant', () => {
    act(() => root.render(<SectionRow title="Attachments" variant={SectionRowVariant.Setting} />));

    const titleClassName = container.querySelector('h3')?.className;
    expect(titleClassName).toContain('dial-tiny-lead-semi-text');
    expect(titleClassName).toContain('text-primary');
  });
});
