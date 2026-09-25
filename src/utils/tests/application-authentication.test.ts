import { describe, expect, it } from 'vitest';
import { fetchApplicationRequiresAuthentication } from '../dialClient';

describe('application authentication metadata', () => {
  // chat-api's typed ApplicationDetailsDto has no equivalent of DIAL Core's
  // raw `external_services` map (see dialClient.ts), so there is currently no
  // typed way to answer this question — the function is a deliberate stub
  // until chat-api exposes it. This test guards against that stub silently
  // reintroducing the old "assume auth required" behavior instead.
  it('returns false until chat-api exposes external-service auth metadata', async () => {
    expect(await fetchApplicationRequiresAuthentication('applications/public/My agent')).toBe(
      false,
    );
  });
});
