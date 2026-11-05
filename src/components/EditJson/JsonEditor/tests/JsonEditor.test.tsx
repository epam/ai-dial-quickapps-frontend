import { act } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { setupTestRoot } from '@/test-utils/test-root';

import JsonEditor from '../JsonEditor';

vi.mock('@/monaco-setup', () => ({}));
vi.mock('@epam/ai-dial-ui-kit', () => ({
  mergeClasses: (...classes: (string | false | undefined)[]) => classes.filter(Boolean).join(' '),
  Spinner: () => <span>loading</span>,
}));
vi.mock('@monaco-editor/react', () => ({
  Editor: ({ onMount }: { onMount: () => void }) => (
    <button type="button" data-testid="editor" onClick={onMount} />
  ),
}));

describe('JsonEditor', () => {
  const testRoot = setupTestRoot();

  it('keeps the editor invisible behind a spinner until it is mounted and painted', async () => {
    vi.useFakeTimers();
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) =>
      setTimeout(() => cb(0), 0),
    );
    const { container } = testRoot;
    testRoot.render(
      <JsonEditor currentTheme={'light' as never} themesConfig={{} as never} onChange={vi.fn()} />,
    );
    expect(container.textContent).toContain('loading');
    expect(container.querySelector('.invisible')).not.toBeNull();

    await act(async () => {
      container.querySelector<HTMLButtonElement>('[data-testid="editor"]')?.click();
      await vi.runAllTimersAsync();
    });

    expect(container.textContent).not.toContain('loading');
    expect(container.querySelector('.invisible')).toBeNull();
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });
});
