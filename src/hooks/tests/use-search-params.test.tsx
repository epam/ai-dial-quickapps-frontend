import { act, type FC } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { useSearchParams } from '@/hooks/use-search-params';

const results: URLSearchParams[] = [];

const Probe: FC = () => {
  results.push(useSearchParams());
  return null;
};

let root: Root;
let container: HTMLDivElement;

beforeEach(() => {
  (globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;
  results.length = 0;
  window.history.replaceState(null, '', '/?provider=azure&theme=dark');
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  window.history.replaceState(null, '', '/');
});

describe('useSearchParams', () => {
  it('reads the current query string', () => {
    act(() => root.render(<Probe />));

    expect(results[0].get('provider')).toBe('azure');
    expect(results[0].get('theme')).toBe('dark');
  });

  it('keeps the first-render snapshot across re-renders', () => {
    act(() => root.render(<Probe />));
    window.history.replaceState(null, '', '/?provider=other');
    act(() => root.render(<Probe />));

    expect(results[1]).toBe(results[0]);
    expect(results[1].get('provider')).toBe('azure');
  });
});
