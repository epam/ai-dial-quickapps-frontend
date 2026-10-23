## MODIFIED Requirements

### Requirement: OAuth request to the host

For an OAuth toolset, `onLogin` SHALL post `REQUEST_TOOLSET_LOGIN` (using the shared editor message enum) and `onLogout` SHALL post `REQUEST_TOOLSET_LOGOUT` (using the shared editor message enum), each with the toolset's id (as held in `DataContext`, path segments decoded) and no other field, through the typed `postEditorMessage` adapter with `AppContext` `settings.allowedOrigins`, so the targeting rules of `host-integration` ("Origin validation") apply. Logout SHALL be posted at once, with no confirmation step of this app's own. No chat-api request SHALL be made by this app for an OAuth sign-in or sign-out: the host runs the flow and answers with a result message.

Example outbound message:

```json
{ "type": "REQUEST_TOOLSET_LOGIN", "toolsetId": "toolsets/public/figma" }
```

Before posting, the hook SHALL record the result type it waits for (`TOOLSET_LOGIN_RESULT` for a login, `TOOLSET_LOGOUT_RESULT` for a logout), and the returned promise SHALL stay pending until that result arrives (see "Host result correlation").

#### Scenario: OAuth login request

- **WHEN** `onLogin({})` is called for OAuth toolset `toolsets/public/figma` with `allowedOrigins` `["https://host"]`
- **THEN** exactly `{ "type": "REQUEST_TOOLSET_LOGIN", "toolsetId": "toolsets/public/figma" }` SHALL be posted to `https://host`
- **AND** the returned promise SHALL NOT have settled before the host answers

#### Scenario: OAuth logout request

- **WHEN** `onLogout()` is called for the same toolset
- **THEN** `{ "type": "REQUEST_TOOLSET_LOGOUT", "toolsetId": "toolsets/public/figma" }` SHALL be posted to the host

### Requirement: Host result correlation

While its toolset is OAuth, `useToolsetCredentials` SHALL listen to `window` `message` events and SHALL act on a message only when all of the following hold:

- `readHostEditorMessage` accepts it as a valid result from `window.parent`, with an origin allowed by `settings.allowedOrigins` and valid protocol/domain fields (`host-integration`, "Inbound message contract" and "Origin validation");
- a host request is waiting;
- its `type` is the result type that request waits for — a `TOOLSET_LOGOUT_RESULT` SHALL NOT answer a pending login, nor the reverse;
- its `toolsetId` equals this hook's toolset id.

Any other message SHALL be ignored and SHALL leave the request waiting. On a matching message the hook SHALL clear the waiting request and resolve its promise. When the message has `success: true`, it SHALL first call `DataContext.applyToolsetAuthResult(message, fallbackStatus)`, with `fallbackStatus` `SIGNED_IN` for a login result and `SIGNED_OUT` for a logout result (see "Applying a host auth result"), and SHALL NOT re-fetch the toolsets list. When the message has `success: false`, the toolset SHALL be left unchanged and no error SHALL be surfaced; a `reason` field SHALL be ignored.

Payload (`ToolsetAuthResultPayload`, `src/types/editor-messages.ts`): `toolsetId` and `success` are required; `credentialsLevel` (`GLOBAL` | `USER`), `reason` and `credentials` (`authenticationType`, `userStatus`, `globalStatus`, `isPublic`, `isManageableByAdmin`, `apiKeyHeader`) are optional. Example inbound messages:

```json
{
  "type": "TOOLSET_LOGIN_RESULT",
  "toolsetId": "toolsets/public/figma",
  "success": true,
  "credentials": { "authenticationType": "OAUTH", "isPublic": true, "userStatus": "SIGNED_IN" }
}
```

```json
{
  "type": "TOOLSET_LOGIN_RESULT",
  "toolsetId": "toolsets/public/figma",
  "success": false,
  "reason": "access_denied"
}
```

#### Scenario: Matching success

- **WHEN** a login is waiting for `toolsets/public/figma` and the host posts `{ "type": "TOOLSET_LOGIN_RESULT", "toolsetId": "toolsets/public/figma", "success": true }` from an allowed origin
- **THEN** the `onLogin` promise SHALL resolve
- **AND** `applyToolsetAuthResult` SHALL be called with that payload and `SIGNED_IN`

#### Scenario: Matching failure

- **WHEN** a login is waiting and the host posts the matching result with `success: false`
- **THEN** the `onLogin` promise SHALL resolve without rejecting
- **AND** `applyToolsetAuthResult` SHALL NOT be called by the hook

#### Scenario: Non-matching messages are ignored

- **WHEN** a login is waiting for `toolsets/public/figma` and the window receives, in turn, a matching `TOOLSET_LOGIN_RESULT` from a disallowed origin, a `TOOLSET_LOGIN_RESULT` for `toolsets/x`, and a `TOOLSET_LOGOUT_RESULT` for `toolsets/public/figma`
- **THEN** the `onLogin` promise SHALL still be pending
- **AND** `applyToolsetAuthResult` SHALL NOT have been called by the hook

#### Scenario: Logout success

- **WHEN** a logout is waiting and the host posts the matching `TOOLSET_LOGOUT_RESULT` with `success: true`
- **THEN** `applyToolsetAuthResult` SHALL be called with that payload and `SIGNED_OUT`

#### Scenario: Foreign or malformed result cannot complete a request

- **WHEN** a matching result comes from a different window at an allowed origin, or
  the parent sends a result with a non-boolean `success`, empty `toolsetId`, invalid
  credentials level, or malformed known credential fields
- **THEN** the waiting promise SHALL remain pending and the toolset SHALL be unchanged

### Requirement: Unsolicited host login results

`DataProvider` (`src/context/DataContext.tsx`) SHALL listen to `window` `message` events for its whole lifetime and SHALL apply every `TOOLSET_LOGIN_RESULT` that is accepted by `readHostEditorMessage` from `window.parent` at an allowed origin with valid protocol/domain fields, has `success: true` and carries a non-empty `toolsetId`, with `fallbackStatus` `SIGNED_IN` — whether or not this editor requested it (for example, a sign-in the user completed in the host's own chat-level dialog). It SHALL apply it through the same reducer action as `applyToolsetAuthResult`. A result whose `toolsetId` is not in `toolsetsMap` SHALL be ignored and SHALL leave the state unchanged. A result with `success: false` SHALL be ignored. `TOOLSET_LOGOUT_RESULT` SHALL NOT be applied by this listener; it is applied only as the answer to a request from `useToolsetCredentials`.

When a login result also answers a waiting request from `useToolsetCredentials`, both listeners apply it; applying the same payload twice SHALL yield the same toolset as applying it once.

#### Scenario: Host-initiated login updates the status

- **WHEN** toolset `toolsets/public/figma` is in `toolsetsMap` signed out, no request is waiting, and the host posts `{ "type": "TOOLSET_LOGIN_RESULT", "toolsetId": "toolsets/public/figma", "success": true }` from an allowed origin
- **THEN** that toolset's `authSettings.authStatus` SHALL become `SIGNED_IN` in both `toolsets` and `toolsetsMap`
- **AND** no chat-api request SHALL be made

#### Scenario: Result for an unknown toolset

- **WHEN** the host posts a successful `TOOLSET_LOGIN_RESULT` for a toolset id not in `toolsetsMap`
- **THEN** `DataContext` state SHALL be unchanged

#### Scenario: Unsolicited logout result

- **WHEN** no logout is waiting and the host posts a successful `TOOLSET_LOGOUT_RESULT` for a known toolset
- **THEN** that toolset's status SHALL be unchanged

#### Scenario: Foreign or malformed unsolicited login is ignored

- **WHEN** a successful login result comes from another window at an allowed origin,
  or the parent sends a login result with malformed known fields
- **THEN** `DataContext` SHALL leave both `toolsets` and `toolsetsMap` unchanged
