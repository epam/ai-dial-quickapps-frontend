import { describe, expect, it, vi } from 'vitest';

import { setupTestRoot } from '@/test-utils/test-root';

import { CommonI18nKeys } from '@/constants/i18n';
import { AuthErrorReason } from '@/types/auth';

import AuthError from '../AuthError';

vi.mock('@/hooks/use-translation', () => import('@/test-utils/mock-translation'));

const dom = setupTestRoot();

describe('AuthError', () => {
  it('explains that no auth provider was specified', () => {
    dom.render(<AuthError reason={AuthErrorReason.NoProvider} />);

    expect(dom.container.querySelector('h1')?.textContent).toBe(CommonI18nKeys.AuthErrorTitle);
    expect(dom.container.querySelector('p')?.textContent).toBe(CommonI18nKeys.AuthErrorNoProvider);
  });

  it('names the requested provider when it is not configured', () => {
    dom.render(<AuthError reason={AuthErrorReason.ProviderNotConfigured} provider="keycloak" />);

    expect(dom.container.querySelector('h1')?.textContent).toBe(CommonI18nKeys.AuthErrorTitle);
    expect(dom.container.querySelector('p')?.textContent).toBe(
      'Auth provider keycloak is not configured for this app',
    );
  });

  it('offers no focusable controls and hides the badge icon from assistive technology', () => {
    dom.render(<AuthError reason={AuthErrorReason.NoProvider} />);

    expect(dom.container.querySelector('button, a, input, [tabindex]')).toBeNull();
    expect(dom.container.querySelector('svg')?.closest('[aria-hidden="true"]')).not.toBeNull();
  });
});
