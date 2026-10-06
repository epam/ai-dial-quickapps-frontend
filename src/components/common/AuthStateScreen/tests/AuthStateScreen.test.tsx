import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import AuthStateScreen from '../AuthStateScreen';

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

describe('AuthStateScreen', () => {
  it('shows the title as a heading and the description', () => {
    act(() =>
      root.render(<AuthStateScreen icon={<svg />} title="Title" description="Description" />),
    );

    expect(container.querySelector('h1')?.textContent).toBe('Title');
    expect(container.querySelector('p')?.textContent).toBe('Description');
  });

  it('hides the badge icon from assistive technology', () => {
    act(() =>
      root.render(<AuthStateScreen icon={<svg />} title="Title" description="Description" />),
    );

    expect(container.querySelector('svg')?.closest('[aria-hidden="true"]')).not.toBeNull();
  });

  it('renders the action only when one is given', () => {
    act(() =>
      root.render(<AuthStateScreen icon={<svg />} title="Title" description="Description" />),
    );
    expect(container.querySelector('button, a, [tabindex]')).toBeNull();

    act(() =>
      root.render(
        <AuthStateScreen
          icon={<svg />}
          title="Title"
          description="Description"
          action={<button type="button">Act</button>}
        />,
      ),
    );
    expect(container.querySelector('button')?.textContent).toBe('Act');
  });
});
