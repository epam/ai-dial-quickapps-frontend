import { describe, expect, it, vi } from 'vitest';

import { click, getButton } from '@/test-utils/dom';
import { setupTestRoot } from '@/test-utils/test-root';

import { AddOnListItem, type AddOnListItemProps } from '../AddOnListItem';

const dom = setupTestRoot();

const render = (props: Partial<AddOnListItemProps> = {}) => {
  dom.render(
    <AddOnListItem
      id="toolsets/public/figma"
      name="Figma"
      detailsLabel="Figma details"
      removeLabel="Remove Figma"
      onClick={vi.fn()}
      {...props}
    />,
  );
};

describe('AddOnListItem', () => {
  it('shows the name and version in a named details button', () => {
    const onClick = vi.fn();
    render({ version: '1.0.0', onClick });

    const details = getButton('Figma details');
    expect(details?.textContent).toContain('Figma');
    expect(details?.textContent).toContain('1.0.0');

    click(details);
    expect(onClick).toHaveBeenCalledWith('toolsets/public/figma');
  });

  it('describes the details button with the status line', () => {
    render({ statusText: 'Logged out toolset.' });

    const details = getButton('Figma details');
    const describedBy = details?.getAttribute('aria-describedby');
    expect(describedBy).toBeTruthy();
    expect(document.getElementById(describedBy as string)?.textContent).toBe('Logged out toolset.');
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
    click(getButton('Remove Figma'));
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
