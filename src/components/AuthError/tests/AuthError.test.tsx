import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { CommonI18nKeys } from '@/constants/i18n';
import { AuthErrorReason } from '@/types/auth';

import AuthError from '../AuthError';

// Mimics i18next's `{{name}}` interpolation so the provider id is observable in the output.
vi.mock('@/hooks/use-translation', () => ({
  useTranslation: () => ({
    language: 'en',
    t: (key: string, options?: Record<string, unknown>) =>
      key.replace(/\{\{(\w+)\}\}/g, (_, name: string) => String(options?.[name] ?? '')),
  }),
}));

let root: Root;
let container: HTMLDivElement;

beforeEach(() => {
  (globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

describe('AuthError', () => {
  it('explains that no auth provider was specified', () => {
    act(() => root.render(<AuthError reason={AuthErrorReason.NoProvider} />));

    expect(container.querySelector('h1')?.textContent).toBe(CommonI18nKeys.AuthErrorTitle);
    expect(container.querySelector('p')?.textContent).toBe(CommonI18nKeys.AuthErrorNoProvider);
  });

  it('names the requested provider when it is not configured', () => {
    act(() =>
      root.render(<AuthError reason={AuthErrorReason.ProviderNotConfigured} provider="keycloak" />),
    );

    expect(container.querySelector('h1')?.textContent).toBe(CommonI18nKeys.AuthErrorTitle);
    expect(container.querySelector('p')?.textContent).toBe(
      'Auth provider keycloak is not configured for this app',
    );
  });

  it('offers no focusable controls and hides the badge icon from assistive technology', () => {
    act(() => root.render(<AuthError reason={AuthErrorReason.NoProvider} />));

    expect(container.querySelector('button, a, input, [tabindex]')).toBeNull();
    expect(container.querySelector('svg')?.closest('[aria-hidden="true"]')).not.toBeNull();
  });
});
