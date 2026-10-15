// Loaded by vitest before every test file (see `setupFiles` in vitest.config.ts).

import type { ReactNode } from 'react';
import { vi } from 'vitest';

// Tells React that `act()` is available, so it flushes updates inside it and
// warns about state updates that escape it.
(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

/*
 * Same mock as ai-dial-chat's `apps/chat/src/test-setup.ts`. `t` and the returned
 * object are module-level singletons, not recreated per call — real `react-i18next`
 * returns a stable `t` across re-renders, and code under test may rely on that
 * stability for memoization. No locale resources are loaded, so `t` returns the key
 * and tests assert on keys.
 */
const mockT = (key: string) => key;
const mockUseTranslationResult = {
  t: mockT,
  i18n: {
    language: 'en',
    resolvedLanguage: 'en',
    changeLanguage: vi.fn(),
  },
};

// `Trans` mirrors `mockT`: it renders the `i18nKey` itself.
const MockTrans = ({ i18nKey }: { i18nKey?: string }): ReactNode => i18nKey ?? null;

vi.mock('react-i18next', () => ({
  useTranslation: () => mockUseTranslationResult,
  Trans: MockTrans,
  // Lets a test import `@/i18n/config` without a real React binding.
  initReactI18next: { type: '3rdParty', init: () => {} },
}));
