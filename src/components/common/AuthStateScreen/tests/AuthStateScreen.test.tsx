import { describe, expect, it } from 'vitest';

import { setupTestRoot } from '@/test-utils/test-root';

import AuthStateScreen from '../AuthStateScreen';

const dom = setupTestRoot();

describe('AuthStateScreen', () => {
  it('shows the title as a heading and the description', () => {
    dom.render(<AuthStateScreen icon={<svg />} title="Title" description="Description" />);

    expect(dom.container.querySelector('h1')?.textContent).toBe('Title');
    expect(dom.container.querySelector('p')?.textContent).toBe('Description');
  });

  it('hides the badge icon from assistive technology', () => {
    dom.render(<AuthStateScreen icon={<svg />} title="Title" description="Description" />);

    expect(dom.container.querySelector('svg')?.closest('[aria-hidden="true"]')).not.toBeNull();
  });

  it('renders the action only when one is given', () => {
    dom.render(<AuthStateScreen icon={<svg />} title="Title" description="Description" />);
    expect(dom.container.querySelector('button, a, [tabindex]')).toBeNull();

    dom.render(
      <AuthStateScreen
        icon={<svg />}
        title="Title"
        description="Description"
        action={<button type="button">Act</button>}
      />,
    );
    expect(dom.container.querySelector('button')?.textContent).toBe('Act');
  });
});
