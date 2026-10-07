## Context

There are three full-page auth states besides loading:

| State | Rendered by | Today |
|---|---|---|
| Logged out | `App.tsx` → `LoginScreen` | Redesigned in `redesign-login-prompt`: `size-14` round badge with `IconLock`, `<h1 class="dial-body-semi-text">` title, `dial-small-text` description, 2.0 `NeutralButton` |
| Forbidden | `EditorClient` (`isForbidden`) → `ForbiddenPage` | 48px `IconLockX`, "Access Denied", hardcoded sentence, 1.0 `DialNeutralButton` "Sign out" calling `void logout()` |
| Configuration error | `App.tsx` (no provider / provider not configured) → `AuthError` | One `text-secondary` line. The English text is built in `App.tsx` and passed as `message` |

`AuthContext.logout` ([AuthContext.tsx:64-68](../../../src/context/AuthContext.tsx)) awaits the logout request, then sets the status to `Unauthenticated`. If the request throws, nothing catches it today.

## Goals / Non-Goals

**Goals:**

- One shared layout for all three screens.
- No hardcoded English in any of them.
- Error-safe sign-out with a pending state.

**Non-Goals:**

- Changing when any state is shown.
- Changing `AuthContext`.
- Restyling `LoadingScreen`.
- The other auth TECH_DEBT items.

## Decisions

1. **`AuthStateScreen` is a shared presentational component** in `src/components/common/AuthStateScreen/AuthStateScreen.tsx`. It's shared by three screens, so it goes in `components/common/`.

   ```ts
   interface AuthStateScreenProps {
     icon: ReactNode;     // rendered inside the aria-hidden badge
     title: string;
     description: string;
     action?: ReactNode;  // e.g. a NeutralButton; omitted for AuthError
   }
   ```

   - The markup moves out of `LoginScreen` unchanged: `flex h-screen flex-col items-center justify-center px-4 text-center`, the `size-14` badge with `border-secondary text-secondary`, `mt-4` before the title, `mt-2` before the description, and a `mt-4` wrapper around the action.
   - The component holds no state and is wrapped in `memo`. Callers pass translated strings, so the component itself doesn't use i18n.
   - Rejected: a `variant` enum that picks the icon and strings inside the component. It would couple a generic layout to auth domain knowledge.

2. **The badge icon is passed in.** `LoginScreen` passes `IconLock`, `ForbiddenPage` passes `IconLockX`, and `AuthError` passes `IconAlertTriangle`. All use `size={DIAL_ICON_SIZE.LG}` and `stroke={DIAL_KIT_ICON_STROKE}`, matching `LoginScreen`. `AuthStateScreen` applies `aria-hidden` on the badge wrapper, so callers can't forget it.

3. **`AuthError` takes a reason, not a message.**
   - Add `enum AuthErrorReason { NoProvider = 'no-provider', ProviderNotConfigured = 'provider-not-configured' }` to `src/types/auth.ts`, next to `AuthStatus`.
   - The props become `{ reason: AuthErrorReason; provider?: string }`.
   - `AuthError` maps the reason to its key with a `switch`, not a nested ternary. It interpolates `{ provider }` through `t(key, options)`; the repo's `useTranslation` wrapper already accepts `TranslationOptions`.
   - `App.tsx` becomes `<AuthError reason={AuthErrorReason.NoProvider} />` and `<AuthError reason={AuthErrorReason.ProviderNotConfigured} provider={provider} />`.

4. **Sign-out handling in `ForbiddenPage`:**

   ```ts
   const [isLoggingOut, setIsLoggingOut] = useState(false);
   const handleLogout = useCallback(async () => {
     setIsLoggingOut(true);
     try {
       await logout();
     } catch {
       // Session state is unchanged on failure, so the forbidden screen stays and the user can retry.
     } finally {
       setIsLoggingOut(false);
     }
   }, [logout]);
   ```

   - On success, `AuthContext` switches to `Unauthenticated`. `App.tsx` then renders the login screen, which unmounts `ForbiddenPage`. Calling `setIsLoggingOut(false)` after the component has unmounted is a no-op in React 18 and later, so no cancelled flag is needed.
   - The button is `onClick={() => void handleLogout()}`. That's allowed under the repo rule, because errors are handled inside the handler.
   - No error message is shown on failure. `AuthContext` doesn't expose a reason, and adding a toast is out of scope. This is recorded as a trade-off.

5. **i18n keys (`common`):**

   | Member | Value |
   |---|---|
   | `ForbiddenTitle` | `'Access denied'` |
   | `ForbiddenDescription` | `"You don't have permission to access this application."` |
   | `ForbiddenAction` | `'Log out'` |
   | `ForbiddenActionPending` | `'Logging out…'` |
   | `AuthErrorTitle` | `"Log-in isn't available"` |
   | `AuthErrorNoProvider` | `'No auth provider specified for this app'` |
   | `AuthErrorProviderNotConfigured` | `'Auth provider {{provider}} is not configured for this app'` |

   Each gets a matching `common.json` entry where key equals value. The `{{provider}}` placeholder is kept in the key, as with `AddedViaJsonHint`.

6. **RTL.** The column is centred with `text-center`. Both new icons are symmetric and are not mirrored. There are no physical spacing classes.

## States

| Screen | Condition | Rendered |
|---|---|---|
| Forbidden | Idle | `IconLockX` badge, title, description, enabled "Log out" |
| Forbidden | Logging out | Same layout, with the button disabled and labelled "Logging out…" |
| Forbidden | Logout failed | Back to Idle |
| Forbidden | Logout succeeded | Unmounted. `App.tsx` shows `LoginScreen` |
| Config error | `NoProvider` | `IconAlertTriangle` badge, title, "No auth provider specified for this app", no action |
| Config error | `ProviderNotConfigured` | Same, with "Auth provider keycloak is not configured for this app" |
| Login | unchanged | unchanged |

## Risks / Trade-offs

- [The copy changes ("Sign out" → "Log out", the new titles) were not in any design] → They're listed in the spec for review. They're easy to change, because they're only i18n values.
- [A failed sign-out gives no visible feedback beyond re-enabling the button] → Accepted for now. A follow-up can add a notification if product wants one.
- [Refactoring `LoginScreen` right after it shipped could cause a visual regression] → The markup moves verbatim. The existing `LoginScreen` test stays unchanged as a guard, and the screen is re-checked with the dev-only `MOCK_AUTH` preview.

## Migration Plan

This is a presentation-only change and needs no migration. To roll back, revert the commit.

## Open Questions

- Confirm the new titles: "Access denied" and "Log-in isn't available".
