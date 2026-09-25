import { describe, expect, it, vi } from 'vitest';

import { fetchApplicationRequiresAuthentication } from '../dialClient';

const { listExternalServices } = vi.hoisted(() => ({
  listExternalServices: vi.fn(),
}));

vi.mock('@/utils/chat-api-client', () => ({
  externalServicesApi: { listExternalServices },
}));

describe('application authentication metadata', () => {
  it('returns false when the application has no external services', async () => {
    listExternalServices.mockResolvedValueOnce([]);
    expect(await fetchApplicationRequiresAuthentication('applications/public/My agent')).toBe(
      false,
    );
    expect(listExternalServices).toHaveBeenCalledWith({
      appId: 'applications/public/My agent',
    });
  });

  it('returns true when the application has at least one external service', async () => {
    listExternalServices.mockResolvedValueOnce([{ id: 'finhub-api', authenticationType: 'OAUTH' }]);
    expect(await fetchApplicationRequiresAuthentication('applications/public/My agent')).toBe(true);
  });
});
