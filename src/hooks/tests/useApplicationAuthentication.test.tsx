import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useApplicationAuthentication } from '../useApplicationAuthentication';
import { fetchApplicationRequiresAuthentication } from '@/utils/dialClient';

vi.mock('@/utils/dialClient', () => ({ fetchApplicationRequiresAuthentication: vi.fn() }));
const fetchAuthentication = vi.mocked(fetchApplicationRequiresAuthentication);
const Probe = ({ appId }: { appId?: string }) => (
  <output>{String(useApplicationAuthentication(appId))}</output>
);
let root: Root;
let container: HTMLDivElement;
beforeEach(() => {
  vi.resetAllMocks();
  (globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
});
afterEach(() => {
  act(() => root.unmount());
  container.remove();
});
const render = async (appId?: string) => {
  await act(async () => root.render(<Probe appId={appId} />));
};
describe('selected application authentication', () => {
  it('does not fetch for models, readonly chips or unsupported hosts', async () => {
    await render();
    expect(fetchAuthentication).not.toHaveBeenCalled();
    expect(container.textContent).toBe('false');
  });
  it.each([true, false])('exposes the application metadata result: %s', async (required) => {
    fetchAuthentication.mockResolvedValue(required);
    await render('agent');
    expect(fetchAuthentication).toHaveBeenCalledWith('agent');
    expect(container.textContent).toBe(String(required));
  });
  it('keeps the host retry action available after metadata failure', async () => {
    fetchAuthentication.mockRejectedValue(new Error('Unavailable'));
    await render('agent');
    expect(container.textContent).toBe('true');
  });
  it('ignores metadata for an application that is no longer selected', async () => {
    let resolveFirst!: (required: boolean) => void;
    fetchAuthentication.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveFirst = resolve;
      }),
    );
    fetchAuthentication.mockResolvedValueOnce(false);
    await render('first');
    await render('second');
    await act(async () => resolveFirst(true));
    expect(container.textContent).toBe('false');
  });
});
