## ADDED Requirements

### Requirement: Application credentials mode

The editor SHALL offer application credentials only in **credentials mode**. Credentials mode SHALL be on only when the entry URL's `applicationCredentials` query parameter (`host-integration` "Entry URL parameters") is exactly `true`. Any other value, or no value, SHALL mean credentials mode is off. The editor SHALL read the parameter through `useSearchParams` (`src/hooks/use-search-params.ts`), which takes one snapshot of the query string on first render. The editor SHALL NOT re-read the parameter during the session. Credentials mode SHALL NOT be stored in any context, form value or saved application property.

When credentials mode is off, the editor SHALL make no external-services request ("Authentication-required detection") and SHALL NOT render the Credentials action (`agents_selection` "Agent details popup"). Hosts that do not support credential forms leave out the parameter, so the action stays hidden there.

#### Scenario: Host does not advertise credentials mode

- **WHEN** the entry URL has no `applicationCredentials` parameter and the user opens the details popup of an attached application
- **THEN** no `GET /api/v1/external-services/{appId}` request SHALL be made
- **AND** no Credentials action SHALL be rendered

#### Scenario: Parameter with a value other than `true`

- **WHEN** the entry URL carries `applicationCredentials=1` or `applicationCredentials=TRUE`
- **THEN** credentials mode SHALL be off, as if the parameter were absent

### Requirement: Authentication-required detection

The hook `useApplicationAuthentication(appId?)` (`src/hooks/use-application-authentication.ts`) SHALL decide whether an attached application needs the user to authenticate. The hook owns this state in its own local `useState`. No context holds it. `AgentDetailsPopup` SHALL pass an `appId` only when all of these hold:

- the application is editable;
- credentials mode is on;
- the attached agent is in the catalog with `type` `DialEntityType.Application`. MCP-only agents from `DataContext.mcpAgentsMap` count as applications.

In every other case it SHALL pass `undefined`: models, read-only or shared applications, and agents no longer in the catalog. Without an `appId`, the hook SHALL make no request and SHALL return `false`.

With an `appId`, the hook SHALL call `fetchApplicationRequiresAuthentication(appId)` (`src/utils/dial-client.ts`). That function SHALL:

- re-encode the id with `encodeDialPath`;
- call `externalServicesApi.listExternalServices({ appId })` from `@epam/ai-dial-chat-api-client` (`ExternalServicesApi`, request `ListExternalServicesRequest`, response `ApplicationExternalServiceDto[]`), i.e. `GET /api/v1/external-services/{appId}`, where the generated client applies `encodeURIComponent` to the path parameter once more;
- return `true` when the list is non-empty and `false` when it is empty.

If the request fails, the hook SHALL treat the application as needing authentication. This keeps the host's retry form reachable.

Example: for attached agent `applications/public/My agent`, the client is called with `{ appId: "applications/public/My%20agent" }`, which requests `GET /api/v1/external-services/applications%2Fpublic%2FMy%2520agent`. A response of `[{ "id": "github", "displayName": "GitHub", "authenticationType": "OAUTH" }]` means authentication is required. A response of `[]` means it is not.

The hook SHALL return `true` only when its latest result belongs to the `appId` it currently has and that result says authentication is required. While the request is pending, it SHALL return `false`. Results that arrive after the `appId` changes, or after the hook unmounts, SHALL be discarded: the effect keeps an `isActive` flag that its cleanup clears. The result SHALL NOT be cached. The details popup is mounted only while it is open (`AgentsList` holds `openAgentId`), so each time the popup opens the hook requests again. No memoisation is required beyond the effect's dependency on `appId`.

#### Scenario: Application with external services

- **WHEN** credentials mode is on, the user opens the details popup of an attached application in an editable application, and the external-services list for that application is non-empty
- **THEN** the hook SHALL report that authentication is required

#### Scenario: Application without external services

- **WHEN** the external-services list for the application is `[]`
- **THEN** the hook SHALL report that authentication is not required

#### Scenario: Metadata request fails

- **WHEN** `GET /api/v1/external-services/{appId}` fails
- **THEN** the hook SHALL report that authentication is required, so the Credentials action stays available

#### Scenario: Id is re-encoded for chat-api

- **WHEN** detection runs for `applications/public/My agent`
- **THEN** `externalServicesApi.listExternalServices` SHALL be called with `{ appId: "applications/public/My%20agent" }`

#### Scenario: Result for a previous application arrives late

- **WHEN** the hook's `appId` changes from `first` to `second`, and the request for `first` resolves after the request for `second`
- **THEN** the hook SHALL report the result for `second` and ignore the late result for `first`

#### Scenario: No detection outside an eligible application

- **WHEN** the details popup opens for a model, for an agent no longer in the catalog, or in a read-only or shared application
- **THEN** no external-services request SHALL be made and no Credentials action SHALL be rendered

#### Scenario: Detection runs again when the popup reopens

- **WHEN** the user closes the details popup of an application and then opens it again
- **THEN** the hook SHALL request `GET /api/v1/external-services/{appId}` again rather than reuse the earlier result

### Requirement: Credential hand-over to the host

The editor SHALL NOT collect, show or store application credentials itself. When the user activates the Credentials action (`agents_selection` "Agent details popup"), `AgentDetailsPopup` SHALL first call its `onClose`, which closes the details popup. Then it SHALL call `requestApplicationCredentials(agentId, settings.allowedOrigins)` (`src/utils/request-application-credentials.ts`), with `settings` taken from `AppContext`.

`requestApplicationCredentials` SHALL post exactly one logical message to the parent window through `postToHost` (`src/utils/allowed-origins.ts`). The message SHALL be the plain object `{ type: "REQUEST_APPLICATION_CREDENTIALS", appId }`, where `type` is `OutboundMessageType.RequestApplicationCredentials` (`src/types/editor-messages.ts`) and `appId` is the attached agent's id. The message:

- SHALL carry no other field and no secret;
- SHALL NOT have the `{applicationName}/` prefix;
- SHALL NOT be sent through the `ChatVisualizerConnector`.

Its target origins SHALL follow `host-integration` "Origin validation": one post per configured allowed origin, or a single wildcard post when there are none.

Requesting credentials SHALL NOT change the editor's form state. The `addOns` value, the saved transport and the dirty state SHALL stay as they were, and nothing SHALL be written to the application's configuration.

The click handler SHALL be wrapped in `useCallback` keyed on `onClose`, `agentId` and `settings.allowedOrigins`. The action uses the existing `quickAppEditor` key `ApplicationCredentials` ("Application credentials") and adds no new i18n string. Its accessible name SHALL be that label. It SHALL be a ui-kit `GhostButton` and so can be reached and activated from the keyboard. RTL impact: none of its own. The ui-kit button places its leading key icon at the inline start. The key icon has no navigational direction, so it SHALL NOT be mirrored.

#### Scenario: User hands over to the host

- **WHEN** credentials mode is on, the attached application `applications/public/research-agent` needs authentication, `allowedOrigins` is `["https://chat.example.com"]`, and the user activates Credentials
- **THEN** the details popup SHALL close
- **AND** the editor SHALL post `{ "type": "REQUEST_APPLICATION_CREDENTIALS", "appId": "applications/public/research-agent" }` to `https://chat.example.com`, once

#### Scenario: Several allowed origins

- **WHEN** `allowedOrigins` lists more than one origin and the user activates Credentials
- **THEN** the same message SHALL be posted once to each configured origin, and only the host whose origin matches SHALL receive it

#### Scenario: Form state is untouched

- **WHEN** the user activates Credentials with unsaved transport changes in the form
- **THEN** the `addOns` value and the dirty state SHALL be the same as before the request

### Requirement: No credentials result message

The editor SHALL define no inbound message for the result of an application credentials request. It SHALL NOT wait for, or react to, the host finishing or cancelling its credential forms. `InboundMessageType` has no application-credentials member, unlike `ToolsetLoginResult` / `ToolsetLogoutResult` for toolsets. After the hand-over, the editor's view SHALL change only through the user's next actions. Reopening the agent's details popup runs "Authentication-required detection" again.

#### Scenario: Host closes its credential forms

- **WHEN** the editor has posted `REQUEST_APPLICATION_CREDENTIALS` and the host later closes its credential forms
- **THEN** the editor SHALL NOT reopen the details popup or issue any request on its own
- **AND** when the user next opens that agent's details popup, the editor SHALL fetch the external-services list again and render Credentials based on the new result
