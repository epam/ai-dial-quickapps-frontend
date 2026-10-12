## ADDED Requirements

### Requirement: Toolset credentials hook

`useToolsetCredentials(toolset)` (`src/hooks/use-toolset-credentials.ts`) SHALL own the sign-in and sign-out flows for one toolset and SHALL return `{ onLogin({ apiKey? }), onLogout() }`, the handlers the toolset details popup passes to the catalog `DetailsHeader` credentials action (the entry point and its labels are specified by `toolsets_selection`, "Toolset login from the details popup"; this capability does not repeat them). The flow SHALL be picked from `toolset.authSettings.authenticationType`: `OAUTH` SHALL go through the host (see "OAuth request to the host"), and any other type SHALL go to chat-api directly (see "API key sign-in through chat-api"). Neither promise SHALL ever reject: each SHALL resolve once its flow is done, on success and on failure alike, and a failure SHALL leave the toolset's status as it was. The only state the hook keeps is the one host request waiting for its result, held in a ref; toolset auth status itself SHALL be owned by `DataContext` (`toolsets` / `toolsetsMap`). `onLogin` and `onLogout` SHALL be wrapped in `useCallback`.

This capability renders no UI and introduces no user-visible string or i18n key of its own; the action labels (`quickAppEditor` `LoginToolsetAction`, `LogoutToolsetAction`, `ApiKeyLabel`, `ToolsetChangeApiKeyAction`) belong to `toolsets_selection`. RTL impact: none — the capability is direction-agnostic. Accessibility: none of its own; the OAuth sign-in window is the host's, and keyboard and ARIA requirements for the action are those of `toolsets_selection`.

#### Scenario: OAuth toolset uses the host

- **WHEN** `onLogin({})` is called for a toolset whose `authSettings.authenticationType` is `OAUTH`
- **THEN** a `REQUEST_TOOLSET_LOGIN` message SHALL be posted to the host
- **AND** no chat-api toolset request SHALL be made

#### Scenario: API-key toolset uses chat-api

- **WHEN** `onLogin({ apiKey: "secret" })` is called for a toolset whose `authSettings.authenticationType` is `API_KEY`
- **THEN** no message SHALL be posted to the host
- **AND** `POST /api/v1/toolsets/{toolsetName}/login` SHALL be called

### Requirement: OAuth request to the host

For an OAuth toolset, `onLogin` SHALL post `REQUEST_TOOLSET_LOGIN` (`OutboundMessageType.RequestToolsetLogin`) and `onLogout` SHALL post `REQUEST_TOOLSET_LOGOUT` (`OutboundMessageType.RequestToolsetLogout`), each with the toolset's id (as held in `DataContext`, path segments decoded) and no other field, through `postToHost` with `AppContext` `settings.allowedOrigins`, so the targeting rules of `host-integration` ("Origin validation") apply. Logout SHALL be posted at once, with no confirmation step of this app's own. No chat-api request SHALL be made by this app for an OAuth sign-in or sign-out: the host runs the flow and answers with a result message.

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

- its origin passes `isOriginAllowed` against `settings.allowedOrigins` (`host-integration`, "Origin validation");
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
{ "type": "TOOLSET_LOGIN_RESULT", "toolsetId": "toolsets/public/figma", "success": false, "reason": "access_denied" }
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

### Requirement: Unsolicited host login results

`DataProvider` (`src/context/DataContext.tsx`) SHALL listen to `window` `message` events for its whole lifetime and SHALL apply every `TOOLSET_LOGIN_RESULT` that comes from an allowed origin (`isOriginAllowed` against `settings.allowedOrigins`), has `success: true` and carries a non-empty `toolsetId`, with `fallbackStatus` `SIGNED_IN` — whether or not this editor requested it (for example, a sign-in the user completed in the host's own chat-level dialog). It SHALL apply it through the same reducer action as `applyToolsetAuthResult`. A result whose `toolsetId` is not in `toolsetsMap` SHALL be ignored and SHALL leave the state unchanged. A result with `success: false` SHALL be ignored. `TOOLSET_LOGOUT_RESULT` SHALL NOT be applied by this listener; it is applied only as the answer to a request from `useToolsetCredentials`.

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

### Requirement: Applying a host auth result

`applyToolsetAuthResult(toolset, payload, fallbackStatus)` (`src/utils/apply-toolset-auth-result.ts`) SHALL return the toolset with new `authSettings`, keeping every other field:

- **Level:** `payload.credentialsLevel` when present; otherwise `USER` for an id under `toolsets/public/` and `GLOBAL` for any other id (`isPublicToolsetId`).
- **`authStatus`:** `credentials.userStatus` at level `USER`, `credentials.globalStatus` at level `GLOBAL`; when that field or `credentials` is absent, `fallbackStatus`.
- **`authenticationType`:** `credentials.authenticationType`, else the toolset's current one, else `OAUTH`.
- **`apiKeyHeader`:** `credentials.apiKeyHeader`, else the toolset's current one.

`credentials.isPublic` and `credentials.isManageableByAdmin` SHALL be ignored. The `DataContext` reducer SHALL replace the toolset with the result in both `toolsets` and `toolsetsMap`, which the row badge and the popup's credentials action read (`toolsets_selection`).

#### Scenario: Public toolset reads the user level

- **WHEN** the result for `toolsets/public/figma` carries `credentials: { "authenticationType": "OAUTH", "userStatus": "SIGNED_IN", "globalStatus": "SIGNED_OUT" }`
- **THEN** the toolset's `authStatus` SHALL be `SIGNED_IN`

#### Scenario: Private toolset reads the global level

- **WHEN** the result for `toolsets/user-bucket/jira` carries `credentials: { "authenticationType": "OAUTH", "userStatus": "SIGNED_OUT", "globalStatus": "SIGNED_IN" }`
- **THEN** the toolset's `authStatus` SHALL be `SIGNED_IN`

#### Scenario: Explicit level wins

- **WHEN** the result for a public toolset carries `credentialsLevel: "GLOBAL"` and `credentials.globalStatus: "SIGNED_IN"`, `userStatus: "SIGNED_OUT"`
- **THEN** the toolset's `authStatus` SHALL be `SIGNED_IN`

#### Scenario: No credentials in the result

- **WHEN** a logout result carries no `credentials` and the toolset is an `OAUTH` toolset with `apiKeyHeader` `X-Key`
- **THEN** `authStatus` SHALL be the fallback `SIGNED_OUT`, and `authenticationType` and `apiKeyHeader` SHALL be kept

#### Scenario: Nothing names the type

- **WHEN** neither the result nor the toolset carries an authentication type
- **THEN** `authenticationType` SHALL be `OAUTH`

### Requirement: API key sign-in through chat-api

For a toolset that is not OAuth, `onLogin({ apiKey })` SHALL call `toolsetsApi.loginToolset` (`POST /api/v1/toolsets/{toolsetName}/login`) and `onLogout()` SHALL call `toolsetsApi.logoutToolset` (`POST /api/v1/toolsets/{toolsetName}/logout`) from `@epam/ai-dial-chat-api-client`, with `toolsetName` the id re-encoded per segment by `encodeDialPath` (the client then URL-encodes it as one path parameter). The body SHALL carry `url` set to the toolset id, `authenticationType: "API_KEY"`, and `credentialsLevel` `USER` for an id under `toolsets/public/` and `GLOBAL` otherwise; the login body SHALL also carry `apiKey`. No host message SHALL be posted.

Example login request and response:

```http
POST /api/v1/toolsets/toolsets%2Fuser-bucket%2Fjira/login
Content-Type: application/json

{ "url": "toolsets/user-bucket/jira", "credentialsLevel": "GLOBAL", "authenticationType": "API_KEY", "apiKey": "secret" }
```

```json
{ "success": true }
```

Example logout body: `{ "url": "toolsets/user-bucket/jira", "credentialsLevel": "GLOBAL", "authenticationType": "API_KEY" }`.

When the call resolves, the hook SHALL call `DataContext.refreshToolsets()` (`GET /api/v1/toolsets`), so the new status comes from the re-fetched list; the response body's `success` is not inspected. When the call or the refresh throws, the error SHALL be swallowed, the promise SHALL resolve, and the toolset's status SHALL be left as it was.

#### Scenario: Private toolset key added

- **WHEN** `onLogin({ apiKey: "secret" })` is called for API-key toolset `toolsets/user-bucket/jira` and chat-api answers 200
- **THEN** `loginToolset` SHALL be called with `toolsetLoginBodyDto` `{ "url": "toolsets/user-bucket/jira", "credentialsLevel": "GLOBAL", "authenticationType": "API_KEY", "apiKey": "secret" }`
- **AND** `refreshToolsets` SHALL be called

#### Scenario: Public toolset key added

- **WHEN** `onLogin({ apiKey: "secret-key" })` is called for an API-key toolset under `toolsets/public/`
- **THEN** the body's `credentialsLevel` SHALL be `USER`

#### Scenario: Key deleted

- **WHEN** `onLogout()` is called for API-key toolset `toolsets/user-bucket/jira`
- **THEN** `logoutToolset` SHALL be called with `toolsetLogoutBodyDto` `{ "url": "toolsets/user-bucket/jira", "credentialsLevel": "GLOBAL", "authenticationType": "API_KEY" }`

#### Scenario: Request fails

- **WHEN** `loginToolset` rejects (for example with a 401)
- **THEN** the `onLogin` promise SHALL resolve without rejecting
- **AND** `refreshToolsets` SHALL NOT be called and the status SHALL be unchanged

### Requirement: Listener lifecycle

The message listener of `useToolsetCredentials` SHALL be registered only while the hook is mounted with an OAuth toolset, and SHALL be removed on unmount and whenever the toolset id, the authentication type, `settings.allowedOrigins` or `applyToolsetAuthResult` change. The `DataProvider` listener SHALL be re-registered only when `settings.allowedOrigins` changes.

#### Scenario: Popup closed before the host answers

- **WHEN** the user starts an OAuth Log in, closes the toolset details popup, and the host then posts a successful `TOOLSET_LOGIN_RESULT` for that toolset from an allowed origin
- **THEN** the hook SHALL no longer react to it
- **AND** `DataContext` SHALL still apply it, so the row badge reflects the new status

#### Scenario: Non-OAuth toolset

- **WHEN** the hook is mounted for an API-key toolset and the host posts a `TOOLSET_LOGOUT_RESULT` for it
- **THEN** the hook SHALL not react to it
