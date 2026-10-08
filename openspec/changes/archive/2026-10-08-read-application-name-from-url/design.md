# Design

## Context

See proposal.md — Why. Today `src/App.tsx` waits for `fetchAppSettings()` (client-config
`customVariables`) and only then builds `ChatVisualizerConnector` from
`settings.dialAdminHost || settings.dialChatHost` plus `settings.applicationName`
(`App.tsx:41-71`). `readyToSave`/`loggedOut` re-use that target via `connectorTargetRef`
(`App.tsx:82-102`). Query params are read through `useSearchParams`
(`src/hooks/use-search-params.ts`), a one-time snapshot — fine, since the host sets the query
once when loading the iframe. `App.tsx` has no existing test file.

## Goals / Non-Goals

**Goals**
- `applicationName` comes only from the entry URL; env key and all related code are deleted.
- Behavior otherwise identical (host resolution, handshake, message shapes).

**Non-Goals**
- No env fallback, no change to `allowedOrigin`/host settings, no new chat-api field.

## Decisions

1. **Read the param in `App.tsx` via the existing `useSearchParams`**, next to `authProvider`.
   Normalize with `searchParams.get('applicationName') || undefined` so empty is treated as
   missing. Alternative: a dedicated hook/context — rejected, one consumer and one line.
2. **Connector effect keeps its structure**: guard on `settings`, host and `applicationName`;
   `applicationName` joins the guard and the dependency list (it is stable per load).
   `connectorTargetRef` is unchanged, so `readyToSave`/`loggedOut` need no further edits.
3. **Remove, don't deprecate**: delete the field from `CustomVariables`, `readCustomVariables`,
   `fetchAppSettings`, `AppSettings`. A stale env value is just an unread key in an opaque JSON
   object, so nothing breaks at runtime.
4. **Name is URL-decoded by `URLSearchParams`** — the host encodes with `URLSearchParams`
   (`Quick app 2.0` → `Quick+app+2.0`), so no manual decoding.
5. **Tests**: add `src/tests/App.test.tsx` (or beside App) mocking the connector, auth context
   and `fetchAppSettings`; set `window.location` search per case. Cover: param present →
   connector constructed with that name and host; param absent/empty → not constructed;
   `readyToSave`/`loggedOut` posted with the name prefix.

## Risks / Trade-offs

- Old chat (no param) + new QuickApps → handshake never sent; host Save/Preview stay disabled
  until its readiness timeout → deploy chat first (documented in proposal and CHANGELOG).
- Other embedders (admin host) not updated → same symptom → CHANGELOG calls out the new
  contract; confirm no other embedder before release.
- Operators' stale env value is silently ignored → CHANGELOG breaking-change note.

## Migration Plan

1. Release `ai-dial-chat` with `pass-application-name-to-quickapps`.
2. Release QuickApps with this change; operators may drop `applicationName` from
   `CUSTOM_CLIENT_VARIABLES`.
3. Rollback: revert this change and restore the env key; chat's extra param is harmless.
