## Context

QuickApps supports Chat and Admin hosts. Its current connector emits namespaced uppercase visualizer events, while Chat's editor protocol recognizes camelcase lifecycle events. Save and toolset traffic uses unprefixed messages and configurable origin fan-out. The new published package supplies both the legacy connector and typed editor protocol without requiring a coordinated host upgrade.

## Goals / Non-Goals

Goals: adopt exact `@epam/ai-dial-visualizer-connector@1.3.0-dev.163`, report lifecycle through its client, preserve Admin compatibility, validate incoming messages once, and bind save readiness to the active authenticated editor.

Non-goals: a new React Context/event bus, changing auth or API flows, new protocol negotiation/session IDs, changing allowed-origin defaults, or changing UI/i18n/RTL/accessibility. No new HTTP endpoint or request/response shape is introduced.

## Decisions

### Two existing protocol channels, one published package

`App` owns an `AppsEditorClient` configured with the existing resolved host and URL application name, and uses its `sendReadyToInteract`, `sendReadyToSave`, and `sendLoggedOut` methods. A `ChatVisualizerConnector` imported from the same package retains the uppercase `sendReady`/`sendReadyToInteract` handshake for Admin. A resolved connection emits one message of each handshake type: `{name}/READY`, `{name}/READY_TO_INTERACT`, `{name}/readyToInteract`. Cleanup destroys both connectors. An unchanged host/name must not replay the handshake on ordinary settings revalidation.

Using only the legacy connector would retain the Chat mismatch. Using only the typed client would remove the Admin handshake. The dual handshake is deliberate; uppercase events do not substitute for editor readiness.

### Shared validation at the window boundary

Add `src/utils/read-host-editor-message.ts` exporting `readHostEditorMessage(event, allowedOrigins)`. It first requires `event.source === window.parent`, then the existing `isOriginAllowed` check. It uses the package host-message parser for `TRIGGER_SAVE`, `TOOLSET_LOGIN_RESULT`, and `TOOLSET_LOGOUT_RESULT`; app-owned validation narrows opaque `general` and credentials into existing domain types. Known optional fields must have their declared primitive/array/object/enum shape when present; unknown fields do not become trusted domain values. Missing `general` remains valid for preview saves. The helper also validates app-only `TRIGGER_AUTO_SAVE` (`payload.ignoreDirty`, if present, boolean) and `RESET`. Malformed values return no accepted message.

`EditorClient`, `DataContext`, and `use-toolset-credentials` keep their existing listener lifetimes and responsibilities but consume this reader instead of casting event data. This avoids a new bus/provider and ensures a malformed or foreign-window toolset result cannot complete a pending request or alter shared state.

### Typed outgoing adapter preserves established wire shapes

Keep shared message types/enums in `src/types/editor-messages.ts` alongside explicitly app-owned Admin extensions. Add `src/utils/post-editor-message.ts` as a typed wrapper over existing `postToHost`. It preserves multiple specific origins and empty/wildcard configuration; the single-origin `AppsEditorClient` is used only for the lifecycle target.

Preserve `SAVE_SUCCESS` with `payload.updatedApp` and top-level `hasChanges`, nested `SAVE_ERROR.payload.error`, existing dirty/validity payloads, application/toolset ids, unprefixed `READY`, `AUTO_SAVE_COMPLETE`, and `HEIGHT_CHANGE`. Calling the new client's save helpers would change legacy payload shapes, so these messages continue through the typed app adapter. Shared enum values are reused rather than independently redefined.

### Readiness belongs to an editor generation

`App` owns the connection lifetime and the currently mounted authenticated editor generation. A generation identifies the mounted editor for the current authenticated session, not merely a `userSub` value. Logout, replacement user, auth gating that unmounts the editor, or replacement editor invalidates its readiness. A callback from a retired generation must do nothing. Logging back in as the same user still requires the new editor's own model-ready callback.

If the active editor becomes ready before host configuration resolves, remember readiness only for that generation and send it once the connection is available. Emit readiness at most once per active generation/connection. Ordinary revalidation that keeps the same editor mounted must not reset its readiness or replay a handshake. Keep domain helpers outside component files; keep callback identities stable where they govern effect lifetimes.

## Risks / Trade-offs

- Legacy and editor lifecycle events coexist → assert exact case, namespace, recipient, and counts using the real published library.
- Shared parsing intentionally leaves domain data opaque → validate known general/credential fields locally before listeners use them.
- Parent-source validation rejects synthetic/forwarded traffic previously accepted by origin alone → update tests to supply parent source; retain the documented direct iframe-parent contract.
- A user id alone cannot distinguish logout/relogin → cover same-user reauthentication and delayed callbacks from retired editors.
- Single-origin typed transport cannot represent existing wildcard/fan-out policy → keep lifecycle target and typed app-message posting separate.

## Migration Plan

Complete this proposal/design/spec/task set before source changes. Pin the new dependency and remove the old package from the manifest/lockfile; implement the shared adapter and migrate its consumers in verifiable slices; then update current documentation/specs and run the full checks. Deployment needs no data migration. Revert the dependency and source migration together to roll back.

## Open Questions

None blocking. Existing configured host resolution, allowed-origin defaults, and Admin envelope compatibility are explicit constraints of the authorized integration.
