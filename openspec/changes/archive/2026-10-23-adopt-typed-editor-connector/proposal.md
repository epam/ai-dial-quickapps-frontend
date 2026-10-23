## Why

### Problem

QuickApps uses `@epam/ai-dial-chat-visualizer-connector` and manually sends editor lifecycle messages. The legacy connector's uppercase `READY_TO_INTERACT` is not the Chat editor's camelcase `readyToInteract` event. Three inbound listeners also trust unchecked payload casts and validate origin without checking the sender window. `App` retains model readiness across authenticated editor unmounts, allowing a replacement session to inherit readiness.

Evidence: `package.json:28`, `src/App.tsx:28`, `src/App.tsx:92`, `src/App.tsx:112`, `src/components/EditorClient/EditorClient.tsx:151`, `src/context/DataContext.tsx:258`, `src/hooks/use-toolset-credentials.ts:64`. Existing origin fan-out and wildcard behavior live in `src/utils/allowed-origins.ts:23` and `src/utils/allowed-origins.ts:32`; existing domain types live in `src/types/editor-messages.ts:7`.

## What Changes

### Solution

- Replace the old dependency with exact `@epam/ai-dial-visualizer-connector@1.3.0-dev.163`.
- Use `AppsEditorClient` for camelcase editor lifecycle messages. Retain the new package's `ChatVisualizerConnector` for namespaced uppercase `READY` and `READY_TO_INTERACT` compatibility with Admin.
- Centralize inbound parent-window, allowed-origin, shared-protocol and app-domain validation in `readHostEditorMessage`; migrate all three listeners.
- Share protocol enums/types and use a typed `postEditorMessage` adapter while preserving legacy outbound envelopes, including `SAVE_SUCCESS.payload.updatedApp` and `SAVE_ERROR.payload.error`.
- Scope readiness to the currently mounted authenticated editor generation; retain current origin configuration semantics without adding a context or message bus.

### Non-goals

No visual, API endpoint, authentication-flow, form-save, locale, or RTL changes; no new handshake version/session identifiers, cross-origin policy defaults, or host-side rollout. No changes to Admin extensions `TRIGGER_AUTO_SAVE`, `RESET`, `AUTO_SAVE_COMPLETE`, or `HEIGHT_CHANGE` beyond typed validation/transport.

### Acceptance criteria

- Each resolved connection emits legacy `{applicationName}/READY`, legacy `{applicationName}/READY_TO_INTERACT`, and typed `{applicationName}/readyToInteract` once each.
- Only the active authenticated editor may report `readyToSave`; logout/relogin, user changes, or retired callbacks cannot reuse prior readiness.
- Save/reset/toolset results require the parent source, an allowed origin, and valid known fields. Empty/wildcard and multiple allowed-origin configurations retain their current meaning.
- Existing outbound save, dirty, validity, credentials, toolset, and Admin message envelopes remain compatible.
- Tests exercise the real published connector and cover valid, malformed, foreign-source, and session-transition cases; lint, typecheck, tests, and build pass.

### Alternatives considered

Keeping manual lifecycle strings leaves duplicate contracts and the missing Chat readiness event. Replacing all transport with a single `AppsEditorClient` would discard multi-origin/wildcard targeting and legacy save payloads. The selected bounded adapter reuses the published protocol while retaining those compatibility requirements, without adding a React provider or bus.

### Compatibility and rollback

This adds the missing camelcase lifecycle event while preserving uppercase Admin events and existing outbound wire shapes. Rejecting foreign windows and malformed known fields intentionally tightens inbound acceptance. Reverting the dependency/lockfile and bridge migration restores the old implementation; no persisted data migration is involved.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `host-integration`: shared typed protocol, dual handshake compatibility, inbound validation, and session-scoped readiness.
- `toolsets_login`: common validated parent-message acceptance before pending-request correlation or unsolicited status updates.

## Impact

Changes `src/App.tsx`, `src/types/editor-messages.ts`, bridge utilities, `EditorClient`, `DataContext`, `use-toolset-credentials`, credential requests, and focused tests. Host integration is cross-cutting; authentication state is observed only to delimit editor readiness. Existing chat-api endpoints, payloads, and ownership remain unchanged. The user has authorized implementation and the design already resolves state ownership in `App`; no additional context is needed. i18n: no new strings or keys. RTL/accessibility: none, because the bridge introduces no rendered surface.
