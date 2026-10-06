## Why

The unauthenticated screen ([LoginScreen.tsx:13-21](../../../src/components/LoginScreen/LoginScreen.tsx)) is a single grey line ("Sign in to access the editor.") and a neutral button. It doesn't say what the user is signing in to, and its strings are hardcoded English that bypass i18n. The new design replaces it with a centred empty-state card: a lock icon in a circle, the title "Log in to configure your QuickApp", the description "Set up instructions, add-ons and settings.", and a "Log in" button with an external-link icon that shows the sign-in opens in a new window. The new layout matches the redesigned editor and uses the same "Log in" wording as the toolset login flow (`QuickAppEditorI18nKeys.LoginToolsetAction`, [i18n.ts:125](../../../src/constants/i18n.ts)).

## What Changes

- Restyle `src/components/LoginScreen/LoginScreen.tsx` to match the design:
  - a decorative lock icon (`IconLock`, `@tabler/icons-react`) inside a round bordered badge
  - a title, a description line, and a "Log in" button with a trailing `IconExternalLink`
  - everything centred in the viewport
- Replace the 1.0 `DialNeutralButton` with the UI kit's 2.0 `Button` (`iconAfter` slot). It is exported by the installed `@epam/ai-dial-ui-kit@0.14.2`.
- Change the copy from "Sign in" to "Log in". The pending label changes from "Sign-in window is open…" to "Log-in window is open…".
- Move all of the prompt's strings into the `common` i18n namespace (new `CommonI18nKeys` entries and `common.json` values).
- Keep the behaviour of the popup sign-in flow as it is: the `useAuth(provider)` hook, the disabled state while the popup is open, polling, and auto-close.

**Non-goals**

- No changes to the auth flow, `useAuth`, `AuthContext`, the chat-api calls, or the `loggedOut` host message.
- No restyle of `ForbiddenPage`, `AuthError` or `LoadingScreen`. Their hardcoded strings are recorded as a follow-up instead.
- No new locale files. Only the existing English `common.json` gets the new keys.

**Alternatives considered:** I looked at the UI kit's `NoDataContent` (2.0). It centres an icon, a title and a description, but it has no action slot and is meant for empty lists, so the button would have to sit outside it awkwardly. A small hand-composed layout in `LoginScreen` is simpler, and it keeps the button inside the same visual group.

**Acceptance criteria**

- An unauthenticated user with a configured provider sees the lock badge, the title, the description and the "Log in" button, centred, matching the design.
- Clicking "Log in" opens the provider popup, exactly as today. While the popup is open, the button is disabled and shows the pending label.
- Every string in the prompt comes from `common` i18n keys.
- The layout and icons follow the RTL rules (see Impact).
- A new `LoginScreen` component test passes, and `npm run lint` and `npm run typecheck` are clean.

## Capabilities

### New Capabilities

_None._

### Modified Capabilities

- `auth`: adds a requirement for how the unauthenticated sign-in prompt is presented: content, the action that starts the popup sign-in, the pending state, and accessibility. The current spec defines the forbidden state but not the unauthenticated prompt.

## Impact

- **Code:** `src/components/LoginScreen/LoginScreen.tsx`, `src/constants/i18n.ts`, `src/i18n/locales/common.json`, and a new test at `src/components/LoginScreen/tests/LoginScreen.test.tsx`. The call site in `App.tsx` (`<LoginScreen provider={provider} />`, [App.tsx:130](../../../src/App.tsx)) does not change.
- **Cross-cutting:** the change touches the auth area, but only how the prompt looks. There are no changes to the API layer or host integration.
- **i18n:** four new user-visible strings in the `common` namespace (title, description, action label, pending label).
- **RTL:** the layout is a centred column, so it doesn't depend on text direction. Text is centred. The lock icon is symmetric and is not mirrored. `IconExternalLink`'s arrow points toward the inline end, so it is mirrored with `rtl:scale-x-[-1]`. The gap between label and icon comes from the button's own `iconAfter` slot, not from physical margins.
- **Dependencies:** none new. `@tabler/icons-react` and the 2.0 `Button` are already available.
- **Rollback:** this is not a breaking change. Reverting the commit restores the old prompt, and no data or contract changes.
