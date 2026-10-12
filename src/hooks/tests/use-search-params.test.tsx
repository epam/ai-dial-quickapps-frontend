import type { FC } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { useSearchParams } from '@/hooks/use-search-params';
import { setupTestRoot } from '@/test-utils/test-root';

const results: URLSearchParams[] = [];

const Probe: FC = () => {
  results.push(useSearchParams());
  return null;
};

const dom = setupTestRoot();

beforeEach(() => {
  results.length = 0;
  window.history.replaceState(null, '', '/?provider=azure&theme=dark');
});

afterEach(() => {
  window.history.replaceState(null, '', '/');
});

describe('useSearchParams', () => {
  it('reads the current query string', () => {
    dom.render(<Probe />);

    expect(results[0].get('provider')).toBe('azure');
    expect(results[0].get('theme')).toBe('dark');
  });

  it('keeps the first-render snapshot across re-renders', () => {
    dom.render(<Probe />);
    window.history.replaceState(null, '', '/?provider=other');
    dom.render(<Probe />);

    expect(results[1]).toBe(results[0]);
    expect(results[1].get('provider')).toBe('azure');
  });
});
