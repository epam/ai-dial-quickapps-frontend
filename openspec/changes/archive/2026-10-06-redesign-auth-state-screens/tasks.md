Slicing strategy: vertical. Each step can be verified on its own:

1. Extract the shared layout and keep `LoginScreen` identical, guarded by its existing test.
2. Move `ForbiddenPage` onto it.
3. Move `AuthError` onto it.

Strings and the enum come first in each slice that needs them.

## 1. Shared layout

- [x] 1.1 Create `src/components/common/AuthStateScreen/AuthStateScreen.tsx` with an `AuthStateScreenProps` interface (`icon`, `title`, `description`, optional `action`) and a `memo` export. Move the layout markup out of `src/components/LoginScreen/LoginScreen.tsx` verbatim, with `aria-hidden` on the badge (design.md Decision 1).
- [x] 1.2 Refactor `src/components/LoginScreen/LoginScreen.tsx` to render `AuthStateScreen`, passing `IconLock`, its translated title and description, and its existing `NeutralButton` as `action`. Its behaviour must not change.
- [x] 1.3 Add `src/components/common/AuthStateScreen/tests/AuthStateScreen.test.tsx`. It should check that the title renders as a heading, the description renders, the badge is hidden from assistive technology, the action renders only when given, and there are no focusable controls without one.
  - Verification: `npx vitest run src/components/common/AuthStateScreen src/components/LoginScreen`, `npm run lint`, `npm run typecheck`

## 2. Forbidden screen

- [x] 2.1 Add `ForbiddenTitle`, `ForbiddenDescription`, `ForbiddenAction` and `ForbiddenActionPending` to `CommonI18nKeys` in `src/constants/i18n.ts`, and the matching entries to `src/i18n/locales/common.json` (design.md Decision 5).
- [x] 2.2 Rewrite `src/components/ForbiddenPage/ForbiddenPage.tsx` on `AuthStateScreen`:
  - `IconLockX` badge
  - a 2.0 `NeutralButton` action, with an `isLoggingOut` pending state and the `handleLogout` try/catch/finally from design.md Decision 4
  - the label switches to `ForbiddenActionPending` while signing out
- [x] 2.3 Add `src/components/ForbiddenPage/tests/ForbiddenPage.test.tsx`, mocking `@/context/AuthContext` and `@/hooks/useTranslation`. It should check that:
  - the title, description and "Log out" render
  - clicking calls `logout` once
  - the button is disabled with the pending label while `logout` is unresolved
  - a rejected `logout` re-enables the button without an unhandled rejection
  - Verification: `npx vitest run src/components/ForbiddenPage`, `npm run lint`, `npm run typecheck`

## 3. Configuration-error screen

- [x] 3.1 Add `AuthErrorReason` (`NoProvider = 'no-provider'`, `ProviderNotConfigured = 'provider-not-configured'`) to `src/types/auth.ts`.
- [x] 3.2 Add `AuthErrorTitle`, `AuthErrorNoProvider` and `AuthErrorProviderNotConfigured` to `CommonI18nKeys` and `common.json`.
- [x] 3.3 Rewrite `src/components/AuthError/AuthError.tsx`:
  - props `AuthErrorProps { reason: AuthErrorReason; provider?: string }`
  - a `switch` from reason to description key, with `{ provider }` interpolation
  - `IconAlertTriangle` badge, no action
- [x] 3.4 Update both `AuthError` call sites in `src/App.tsx` to pass `reason` (and `provider`) instead of English `message` strings.
- [x] 3.5 Add `src/components/AuthError/tests/AuthError.test.tsx`. It should check that each reason shows the title and its own description, the provider-not-configured text includes the provider id, and the screen has no focusable controls.
  - Verification: `npx vitest run src/components/AuthError`, `npm run lint`, `npm run typecheck`
- [x] 3.6 Run the full `npm test` once all three slices are done.

## 4. Docs

- [x] 4.1 Tick off the "Auth screens other than the sign-in prompt" item in `docs/TECH_DEBT.md`, pointing at this change. Leave the "Host entry and authentication contract" and "Authentication error coverage" items untouched.
