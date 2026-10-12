import { act } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useApplicationAuthentication } from '@/hooks/use-application-authentication';
import { setupTestRoot } from '@/test-utils/test-root';
import { fetchApplicationRequiresAuthentication } from '@/utils/dial-client';

vi.mock('@/utils/dial-client', () => ({ fetchApplicationRequiresAuthentication: vi.fn() }));
const fetchAuthentication = vi.mocked(fetchApplicationRequiresAuthentication);
const Probe = ({ appId }: { appId?: string }) => (
  <output>{String(useApplicationAuthentication(appId))}</output>
);
const dom = setupTestRoot();
beforeEach(() => {
  vi.resetAllMocks();
});
const render = async (appId?: string) => {
  await act(async () => dom.root.render(<Probe appId={appId} />));
};
describe('selected application authentication', () => {
  it('does not fetch for models, readonly chips or unsupported hosts', async () => {
    await render();
    expect(fetchAuthentication).not.toHaveBeenCalled();
    expect(dom.container.textContent).toBe('false');
  });
  it.each([true, false])('exposes the application metadata result: %s', async (required) => {
    fetchAuthentication.mockResolvedValue(required);
    await render('agent');
    expect(fetchAuthentication).toHaveBeenCalledWith('agent');
    expect(dom.container.textContent).toBe(String(required));
  });
  it('keeps the host retry action available after metadata failure', async () => {
    fetchAuthentication.mockRejectedValue(new Error('Unavailable'));
    await render('agent');
    expect(dom.container.textContent).toBe('true');
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
    expect(dom.container.textContent).toBe('false');
  });
});
