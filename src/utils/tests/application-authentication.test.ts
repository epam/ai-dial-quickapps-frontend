import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchApplicationRequiresAuthentication } from '../dialClient';

vi.mock('../handle-unauthorized-response', () => ({ handleUnauthorizedResponse: () => false }));
afterEach(() => vi.unstubAllGlobals());
describe('application authentication metadata', () => {
  it.each(['API_KEY', 'OAUTH', 'DIAL_NATIVE'])(
    'recognizes %s from the selected application',
    async (authenticationType) => {
      const fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          external_services: {
            service: { auth_settings: { authentication_type: authenticationType } },
          },
        }),
      });
      vi.stubGlobal('fetch', fetch);
      expect(await fetchApplicationRequiresAuthentication('applications/public/My agent')).toBe(
        true,
      );
      expect(fetch).toHaveBeenCalledWith(
        '/api/dial/openai/applications/applications/public/My%20agent',
      );
    },
  );
  it.each([
    {},
    { external_services: { public: { auth_settings: { authentication_type: 'NONE' } } } },
  ])('does not require credentials for unauthenticated applications', async (application) => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => application }));
    expect(await fetchApplicationRequiresAuthentication('agent')).toBe(false);
  });
});
