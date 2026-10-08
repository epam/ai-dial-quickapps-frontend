import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AddOnListItem, type AddOnListItemProps } from '../AddOnListItem';

let root: Root;
let container: HTMLDivElement;

const render = (props: Partial<AddOnListItemProps> = {}) => {
  act(() => {
    root.render(
      <AddOnListItem
        id="toolsets/public/figma"
        name="Figma"
        detailsLabel="Figma details"
        removeLabel="Remove Figma"
        onClick={vi.fn()}
        {...props}
      />,
    );
  });
};

const getButton = (name: string) =>
  [...container.querySelectorAll('button')].find(
    (button) => button.getAttribute('aria-label') === name,
  );

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

describe('AddOnListItem', () => {
  it('shows the name and version in a named details button', () => {
    const onClick = vi.fn();
    render({ version: '1.0.0', onClick });

    const details = getButton('Figma details');
    expect(details?.textContent).toContain('Figma');
    expect(details?.textContent).toContain('1.0.0');

    act(() => details?.click());
    expect(onClick).toHaveBeenCalledWith('toolsets/public/figma');
  });

  it('describes the details button with the status line', () => {
    render({ statusText: 'Logged out toolset.' });

    const details = getButton('Figma details');
    const describedBy = details?.getAttribute('aria-describedby');
    expect(describedBy).toBeTruthy();
    expect(document.getElementById(describedBy as string)?.textContent).toBe(
      'Logged out toolset.',
    );
  });

  it('has no description without a status', () => {
    render();

    expect(getButton('Figma details')?.hasAttribute('aria-describedby')).toBe(false);
  });

  it('renders the remove button only when removal is allowed', () => {
    render();
    expect(getButton('Remove Figma')).toBeUndefined();

    const onRemove = vi.fn();
    render({ onRemove });
    act(() => getButton('Remove Figma')?.click());
    expect(onRemove).toHaveBeenCalledWith('toolsets/public/figma');
  });

  it('draws the badge over the avatar', () => {
    render({ badge: <span>badge</span> });

    const details = getButton('Figma details');
    const avatar = details?.firstElementChild;
    expect(avatar?.getAttribute('aria-hidden')).toBe('true');
    expect(avatar?.textContent).toContain('badge');
  });
});
