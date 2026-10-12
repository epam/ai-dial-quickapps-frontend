import { afterEach, describe, expect, it } from 'vitest';

import { setupTestRoot } from '@/test-utils/test-root';
import { SectionRowVariant } from '@/types/section-row';

import { SectionRow } from '../SectionRow';

const PHYSICAL_DIRECTION_CLASS = /(^|\s)(ml|mr|pl|pr|left|right)-|text-(left|right)/;

const dom = setupTestRoot();

afterEach(() => {
  document.documentElement.removeAttribute('dir');
});

const getSection = () => dom.container.querySelector('section');

const getAccessibleName = (element: Element | null) => {
  const labelledBy = element?.getAttribute('aria-labelledby');
  return labelledBy ? document.getElementById(labelledBy)?.textContent : undefined;
};

describe('SectionRow', () => {
  it('is a section named by its heading', () => {
    dom.render(<SectionRow title="Default model">Content</SectionRow>);

    const heading = dom.container.querySelector('h3');
    expect(heading?.textContent).toBe('Default model');
    expect(getAccessibleName(getSection())).toBe('Default model');
    expect(dom.container.textContent).toContain('Content');
  });

  it('renders the action as a reachable button in the header row', () => {
    dom.render(<SectionRow title="Default model" action={<button type="button">Change</button>} />);

    const button = [...dom.container.querySelectorAll('button')].find(
      (el) => el.textContent === 'Change',
    );
    expect(button).toBeDefined();
    expect(button?.disabled).toBe(false);
    expect(button?.tabIndex).toBe(0);
    expect(button?.closest('section')).toBe(getSection());
  });

  it('renders the description when given', () => {
    dom.render(
      <SectionRow title="Model options" description="Additional models users can choose from." />,
    );

    const description = dom.container.querySelector('p');
    expect(description?.textContent).toBe('Additional models users can choose from.');
  });

  it('renders no action wrapper and no description when they are omitted', () => {
    dom.render(<SectionRow title="Default model" />);

    const headerRow = dom.container.querySelector('h3')?.parentElement;
    expect(headerRow?.children).toHaveLength(1);
    expect(dom.container.querySelector('p')).toBeNull();
  });

  it('exposes no expanded state', () => {
    dom.render(<SectionRow title="Default model" action={<button>Change</button>} />);

    expect(dom.container.querySelector('[aria-expanded]')).toBeNull();
  });

  it('keeps the heading before the action and uses no physical direction classes in RTL', () => {
    document.documentElement.dir = 'rtl';

    dom.render(
      <SectionRow
        title="Default model"
        description="Description"
        action={<button type="button">Change</button>}
      />,
    );

    const headerRow = dom.container.querySelector('h3')?.parentElement;
    expect(headerRow?.firstElementChild?.tagName).toBe('H3');
    expect(headerRow?.lastElementChild?.textContent).toBe('Change');

    const classes = [...dom.container.querySelectorAll('[class]')].map((el) => el.className);
    expect(classes.some((className) => PHYSICAL_DIRECTION_CLASS.test(className))).toBe(false);
  });

  it('styles the title as a row title by default', () => {
    dom.render(<SectionRow title="Skills" />);

    expect(dom.container.querySelector('h3')?.className).toContain('dial-small-semi-text');
  });

  it('styles the title as an uppercase caption in the caption variant', () => {
    dom.render(<SectionRow title="Default model" variant={SectionRowVariant.Caption} />);

    expect(dom.container.querySelector('h3')?.className).toContain('dial-caption-lead-semi-text');
  });

  it('styles the title as a tiny semibold primary title in the setting variant', () => {
    dom.render(<SectionRow title="Attachments" variant={SectionRowVariant.Setting} />);

    const titleClassName = dom.container.querySelector('h3')?.className;
    expect(titleClassName).toContain('dial-tiny-semi-text');
    expect(titleClassName).not.toContain('dial-tiny-lead-semi-text');
    expect(titleClassName).toContain('text-primary');
  });
});
