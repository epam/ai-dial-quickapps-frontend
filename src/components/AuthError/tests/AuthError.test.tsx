import { describe, expect, it } from 'vitest';

import { setupTestRoot } from '@/test-utils/test-root';

import { AuthI18nKeys } from '@/constants/translation-keys';
import { AuthErrorReason } from '@/types/auth';

import AuthError from '../AuthError';

const dom = setupTestRoot();

describe('AuthError', () => {
  it('explains that no auth provider was specified', () => {
    dom.render(<AuthError reason={AuthErrorReason.NoProvider} />);

    expect(dom.container.querySelector('h1')?.textContent).toBe(AuthI18nKeys.ErrorTitle);
    expect(dom.container.querySelector('p')?.textContent).toBe(AuthI18nKeys.ErrorNoProvider);
  });

  it('explains that the requested provider is not configured', () => {
    dom.render(<AuthError reason={AuthErrorReason.ProviderNotConfigured} provider="keycloak" />);

    expect(dom.container.querySelector('h1')?.textContent).toBe(AuthI18nKeys.ErrorTitle);
    expect(dom.container.querySelector('p')?.textContent).toBe(
      AuthI18nKeys.ErrorProviderNotConfigured,
    );
  });

  it('offers no focusable controls and hides the badge icon from assistive technology', () => {
    dom.render(<AuthError reason={AuthErrorReason.NoProvider} />);

    expect(dom.container.querySelector('button, a, input, [tabindex]')).toBeNull();
    expect(dom.container.querySelector('svg')?.closest('[aria-hidden="true"]')).not.toBeNull();
  });
});
