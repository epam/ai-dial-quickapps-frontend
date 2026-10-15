## Why

Three findings from `specify-uncovered-capabilities`, recorded in `docs/TECH_DEBT.md`, have a
clear fix and need no product decision.

## Problem

- **Client config fetched twice.** `App.tsx:46` loads it for the host handshake and
  `EditorClient.tsx:115` loads it again with the application. If one call fails and the other
  succeeds, the handshake and the editor run on different settings. chat-api's
  `GET /api/v1/client-config` is public, but it resolves role-restricted values for the session
  user (`OptionalSessionGuard`), so a copy fetched before sign-in can differ from one fetched
  after it.
- **`buildLocalizedText` drops the primary value.** When `primaryLocale` is missing but
  `locales` has entries (`get-localized-text.ts:47-55`), the rebuilt dictionary holds only the
  other locales. chat-api stores the primary value under `en` in that case
  (`composeLocalizedFields`, `DEFAULT_PRIMARY_LOCALE`). The function also builds a dictionary
  when `locales` is empty, and keeps empty locale strings. chat-api does neither. So change
  detection (`hasQuickAppChanges`) compares against a value chat-api never stores.
- **Dark Markdown editor on a light page.** When no theme configuration loads, the page keeps
  the light stylesheet defaults, but `InstructionsSection.tsx:28` picks the dark editor theme
  for anything that is not `currentTheme.id === 'light'`, including `undefined`.

## Solution

1. The root route (`App.tsx`) becomes the single owner of the settings. It calls
   `fetchAppSettings` once the auth status is known, and again only when the signed-in user
   (`user.sub`) changes. It passes the settings to `EditorClient` as a prop, and renders the editor
   only when those settings were loaded for the current user. `EditorClient` loads only the
   application. The handshake effect depends on the host keys rather than the settings object, so
   a reload after sign-in does not repeat the handshake.
2. `buildLocalizedText` mirrors chat-api's `composeLocalizedFields`. It returns the primary value
   unchanged when `locales` is absent or empty. Otherwise it puts the primary value under
   `primaryLocale`, or `en` when that is missing, and adds each locale's non-empty value for the
   field. For `description`, an empty dictionary yields `undefined`.
3. `InstructionsSection` uses the dark editor theme only when a theme is loaded and its id is not
   `light`. With no loaded theme it uses the light editor theme, which matches the stylesheet
   defaults.

## Alternatives considered

- Cache `fetchAppSettings`'s promise at module level. Rejected because the first call can run
  before sign-in and would then serve the anonymous, role-less config to the editor.
- Keep both calls and merge them. Rejected because it keeps two owners for one value.
- Fall back to the OS colour scheme for the editor when no theme loads. Rejected because the
  page itself stays light, and the point is that the two match.

## Non-goals

- The other findings, such as stale baseline after save or toolset login timeouts.
- Refreshing settings while the editor stays mounted for the same user.
- Switching to the typed `ThemesApi`.

## Acceptance criteria

- `openspec validate fix-settings-locale-theme-defects --strict` passes.
- New tests pin each modified scenario. `npm test`, `npm run lint` and `npm run typecheck` pass.

## What Changes

- `app-configuration`: MODIFIED "Runtime client configuration source" (state ownership),
  "Settings are loaded before the editor renders" and "Host keys configure the host handshake
  target".
- `application_editing`: MODIFIED "Application load on open". The editor loads the application
  only, and the settings come from the root route.
- `i18n`: MODIFIED "Recombining host locale entries".
- `theming`: MODIFIED "Theme falls back to the built-in CSS defaults when no configuration is
  available". It adds the Markdown editor theme.

## Capabilities

### Modified Capabilities

- `app-configuration`: one client-config call per session user, owned by the root route.
- `application_editing`: the application load no longer fetches the client config itself.
- `i18n`: locale recombination matches what chat-api stores.
- `theming`: the Instructions Markdown editor is light when no theme configuration loads.

## Impact

- **Code:** `src/App.tsx`, `src/components/EditorClient/EditorClient.tsx`,
  `src/utils/get-localized-text.ts`, `src/components/InstructionsSection/InstructionsSection.tsx`,
  and their tests.
- **Host integration:** the handshake now waits until the auth status is known (one
  `GET /api/v1/auth/me`). `READY` from the editor is posted to the configured allowed origins from
  the start, instead of to `*` before settings load. Both follow from the existing
  `host-integration` requirements, which do not change.
- **API / chat-api:** one `GET /api/v1/client-config` per session user instead of two.
- **i18n:** no new strings. **RTL:** none.
- **Rollback:** revert the commit; no data or config migration.
