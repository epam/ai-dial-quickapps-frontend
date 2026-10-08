# Proposal

## Why

QuickApps learns the visualizer/application name it uses to address its host
(`ChatVisualizerConnector`, `{applicationName}/readyToSave`, `{applicationName}/loggedOut`)
from `CUSTOM_CLIENT_VARIABLES.applicationName` — an env var (`src/utils/dial-client.ts:293`,
read in `src/App.tsx:42`). One deployed instance can therefore serve only one application,
and operators must hand-copy the value that ai-dial-chat already knows (`schema.displayName`,
the prefix chat matches incoming messages against). Letting the host pass it per-load, like
`id`, `authProvider` and `theme`, removes that limit and the duplicated configuration.

## What Changes

- QuickApps reads a new `applicationName` query parameter from its entry URL
  (`useSearchParams`, as `authProvider` already is at `src/App.tsx:17`) and uses it for the
  `ChatVisualizerConnector` appName and the `{applicationName}/readyToSave` and
  `{applicationName}/loggedOut` messages.
- The connector is activated only when `applicationName` is present in the URL and a host
  origin is configured. Missing param → no handshake (same outcome as an unset env value today).
- **BREAKING**: `applicationName` is removed from `CUSTOM_CLIENT_VARIABLES`. A value left in
  the env is silently ignored; there is no env fallback.
- Delete outdated code and docs: `applicationName` from `CustomVariables`,
  `readCustomVariables`, `fetchAppSettings` (`src/utils/dial-client.ts`) and `AppSettings`
  (`src/types/dial-entities.ts:121`); the key in `.env.template` and `.env.local`; the README
  table row and example; add a breaking-change CHANGELOG entry.
- Host origin still comes from `dialChatHost` / `dialAdminHost` (unchanged).
- Sibling change in `ai-dial-chat` (`pass-application-name-to-quickapps`) adds the param to the
  iframe URL as `schema.displayName`, URL-encoded. **Deploy chat before QuickApps.**

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `host-integration`: "Entry URL query parameters" gains `applicationName`; "Host handshake
  on load", "Host origin resolution" and "Outbound message contract" source the application
  name from the entry URL rather than configuration, with a missing-param scenario.

## Impact

- **Code**: `src/App.tsx`, `src/utils/dial-client.ts`, `src/types/dial-entities.ts`.
- **Config/docs**: `.env.template`, `.env.local`, `README.md`, `CHANGELOG.md`.
- **Tests**: `App.tsx` has no test file today; add coverage for URL param → connector/messages
  and the missing-param case.
- **Cross-repo**: depends on the `ai-dial-chat` change above. Newer chat + old QuickApps is
  harmless (extra param ignored). Old chat + new QuickApps never sends `readyToSave`, so the
  host's Save/Preview stay disabled until its readiness timeout — hence the deploy order.
  Any other embedder (e.g. the admin host) must also start sending the param.
- **i18n**: none (no user-visible strings). **RTL**: none (no UI change).

## Problem / Solution / Non-goals

- **Problem**: one instance ↔ one application name, via env.
- **Solution**: host-supplied `applicationName` query param; env key removed.
- **Non-goals**: changing host-origin resolution, `allowedOrigin`, message shapes, or adding a
  new schema field in chat-api; any env fallback.

## Alternatives considered

- *Keep env as fallback*: conservative, but keeps dead config and ambiguity about which wins;
  rejected per requirement to delete outdated code.
- *Derive from a new chat-api schema field*: needs a backend change for no gain — chat already
  uses `schema.displayName`.

## Acceptance criteria

- With `?applicationName=X` and a configured host, the connector is created with appName `X`
  and `X/readyToSave` / `X/loggedOut` are posted.
- Without the param, no connector and no handshake; page otherwise renders normally.
- `applicationName` appears nowhere in settings types, env templates or README.
- Two loads with different values in one deployment address their hosts with their own names.

## Rollback / backward compatibility

Breaking for operators who relied on env (ignored after upgrade; CHANGELOG notes it). Revert by
restoring the env key and reading it in `fetchAppSettings`; no data migration involved.
