## Why

`redesign-login-prompt` gave the logged-out state a designed, translated screen (`LoginScreen`). The other two full-page auth states still use the old look and hardcoded English strings. This is tracked in `docs/TECH_DEBT.md`, under "Auth screens other than the sign-in prompt":

- **`ForbiddenPage`** ([ForbiddenPage.tsx:11-15](../../../src/components/ForbiddenPage/ForbiddenPage.tsx)) is rendered by `EditorClient` when the user lacks permission. It shows "Access Denied", a permission sentence, and a 1.0 `DialNeutralButton` labelled "Sign out".
- **`AuthError`** ([AuthError.tsx:7-11](../../../src/components/AuthError/AuthError.tsx)) is rendered by `App.tsx` when no `authProvider` is given, or the given provider isn't configured. It shows a single grey line. The English sentence is built in `App.tsx` ([App.tsx:119](../../../src/App.tsx), [App.tsx:127](../../../src/App.tsx)) and passed in as `message`, so it can't be translated.

As a result, a user can move from a polished login screen to a bare, English-only error or forbidden page.

## What Changes

- **Shared layout.** Add `src/components/common/AuthStateScreen/AuthStateScreen.tsx`: the centred icon badge, `<h1>` title, description, and an optional action slot, taken out of `LoginScreen`. `LoginScreen` is refactored to use it, with no visual change.
- **`ForbiddenPage`:**
  - Rebuilt on `AuthStateScreen`, with an `IconLockX` badge, a translated title and description, and a 2.0 `NeutralButton` "Log out" action.
  - The action is disabled and shows "Logging out…" while sign-out is in flight.
  - A failed sign-out no longer becomes an unhandled promise rejection (today it's `void logout()`). The button goes back to enabled so the user can retry.
- **`AuthError`:**
  - Rebuilt on `AuthStateScreen`, with an `IconAlertTriangle` badge, a translated title, and a translated, reason-specific description. It has no action, because there's nothing the user can do; it's a host or deployment configuration problem.
  - **API:** the `message: string` prop is replaced by `reason: AuthErrorReason` (a new string enum in `src/types/auth.ts`) plus an optional `provider`. `App.tsx` passes the reason, not English text.
- **Copy:** "Sign out" becomes "Log out", to match "Log in". "Access Denied" becomes "Access denied" (sentence case, like the login title). The two configuration-error sentences keep their wording but go through i18n (`{{provider}}` is interpolated).
- **i18n:** new `CommonI18nKeys` entries and matching `common.json` values.
- **Docs:** tick off the TECH_DEBT item.

**Non-goals**

- No change to when each state is shown. The `isForbidden` logic, the `authProvider` checks and `AuthStatus` handling stay the same.
- No change to `logout()` in `AuthContext` or to the `loggedOut` host message.
- `LoadingScreen` stays as it is (it has no text).
- The "Host entry and authentication contract" and "Authentication error coverage" TECH_DEBT items are separate and stay open.

**Alternatives considered:** copying the badge, title and description markup into each of the three screens. That's three components with the same 15 lines, which will drift apart. A shared presentational component in `components/common/` is the smallest abstraction that keeps them aligned.

**Assumptions (no design provided for these two screens)**

- Visual treatment matches `LoginScreen`: same badge size and type scale, different icon.
- Copy for the new titles is my proposal, listed in the spec. Confirm or replace it during review.

**Acceptance criteria**

- `ForbiddenPage` and both `AuthError` reasons render the shared layout, with every string coming from `common` i18n keys and no hardcoded English left in either component or in `App.tsx`'s `AuthError` call sites.
- `LoginScreen` looks and behaves exactly as before. Its existing test still passes.
- "Log out" signs out without a full page redirect, shows a pending state, and recovers from a failed request.
- New component tests for `AuthStateScreen`, `ForbiddenPage` and `AuthError` pass, and `npm run lint` and `npm run typecheck` are clean.

## Capabilities

### New Capabilities

_None._

### Modified Capabilities

- `auth`:
  - **Modified:** "Denied-access presentation" now specifies its content, i18n keys, and the pending and failed sign-out behaviour.
  - **Added:** a requirement for the auth configuration error screen.
  - **Added:** a shared accessibility and direction requirement for the forbidden and configuration-error screens.

## Impact

- **Code:**
  - new `src/components/common/AuthStateScreen/AuthStateScreen.tsx` and its tests
  - `src/components/LoginScreen/LoginScreen.tsx` (refactor only)
  - `src/components/ForbiddenPage/ForbiddenPage.tsx`
  - `src/components/AuthError/AuthError.tsx`
  - `src/App.tsx` (two call sites)
  - `src/types/auth.ts` (new enum)
  - `src/constants/i18n.ts`
  - `src/i18n/locales/common.json`
  - `docs/TECH_DEBT.md`
- **Cross-cutting:** auth area, presentation only. The `ForbiddenPage` sign-out handling becomes error-safe, but it still calls the same `AuthContext.logout`. No changes to the API layer or host messages.
- **i18n:** about eight new `common` strings (see spec).
- **RTL:** same as `LoginScreen`. It's a centred column with `text-center`, so it doesn't depend on direction. `IconLockX` and `IconAlertTriangle` are symmetric and are not mirrored. The "Log out" button has no icon.
- **Rollback:** not breaking for hosts. `AuthError`'s prop change is internal (one caller). Revert the commit to restore the old screens.
