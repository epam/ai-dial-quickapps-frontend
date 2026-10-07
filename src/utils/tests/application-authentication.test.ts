import { describe, expect, it, vi } from 'vitest';

import { fetchApplicationRequiresAuthentication } from '@/utils/dial-client';

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
    // Re-encoded to chat-api's canonical id form (space -> %20) before being
    // used as a path parameter — confirmed against a real working
    // PATCH /applications/{applicationName} request/response pair whose
    // response `id` field itself contains a literal `%20`, not a real space.
    expect(listExternalServices).toHaveBeenCalledWith({
      appId: 'applications/public/My%20agent',
    });
  });

  it('returns true when the application has at least one external service', async () => {
    listExternalServices.mockResolvedValueOnce([{ id: 'finhub-api', authenticationType: 'OAUTH' }]);
    expect(await fetchApplicationRequiresAuthentication('applications/public/My agent')).toBe(true);
  });
});
