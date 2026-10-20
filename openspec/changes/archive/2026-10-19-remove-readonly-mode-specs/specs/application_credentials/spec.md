# Spec Delta

## MODIFIED Requirements

### Requirement: Authentication-required detection

The hook `useApplicationAuthentication(appId?)` (`src/hooks/use-application-authentication.ts`) SHALL decide whether an attached application needs the user to authenticate. The hook owns this state in its own local `useState`. No context holds it. `AgentDetailsPopup` SHALL pass an `appId` only when all of these hold:

- the application is editable;
- credentials mode is on;
- the attached agent is in the catalog with `type` `DialEntityType.Application`. MCP-only agents from `DataContext.mcpAgentsMap` count as applications.

In every other case it SHALL pass `undefined`: models and agents no longer in the catalog. Without an `appId`, the hook SHALL make no request and SHALL return `false`.

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

- **WHEN** the details popup opens for a model, or for an agent no longer in the catalog
- **THEN** no external-services request SHALL be made and no Credentials action SHALL be rendered

#### Scenario: Detection runs again when the popup reopens

- **WHEN** the user closes the details popup of an application and then opens it again
- **THEN** the hook SHALL request `GET /api/v1/external-services/{appId}` again rather than reuse the earlier result
