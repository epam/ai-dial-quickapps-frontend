## MODIFIED Requirements

### Requirement: Application load on open

QuickApps SHALL load the application named by the entry URL's `id` (see `host-integration`,
"Entry URL query parameters") once per mount and SHALL show the full-screen loading
spinner, labelled with the key `BasicI18nKeys.Loading` ("Loading…"),
until the load settles. The state is owned by `EditorClient`
(`src/components/EditorClient/EditorClient.tsx`) as `appState`; it is passed to the form
through `AppContextProvider`. No other context or hook owns it.

The `id` value SHALL be decoded per path segment (`decodeDialPath`) and held decoded; every
chat-api path parameter built from it SHALL be re-encoded per segment (`encodeDialPath`) to
chat-api's canonical id form, which the generated client then wraps once more for transport.

`EditorClient` SHALL load the application with `fetchDialApp` (`src/utils/dial-client.ts`). It
SHALL NOT request the client config itself. It receives the settings from the root route, which
loads them before rendering it (`app-configuration`, "Settings are loaded before the editor
renders"). The application load calls:

- `GET /api/v1/deployments/{deployment}/details` — `deploymentsApi.getDeploymentDetails`,
  response `DeploymentDetailsDto`. Its `applicationDetails` (`ApplicationDetailsDto`)
  supplies `displayName`, `applicationProperties`, `inputAttachmentTypes`,
  `maxInputAttachments` and `applicationTypeSchemaId`.

A failed `GET /api/v1/client-config?appId=chat-ui` SHALL NOT fail the load; the editor opens
with empty settings (`app-configuration`, "Client config failure fallback").

After the details call succeeds, QuickApps SHALL call
`GET /api/v1/deployments?interface_type=chat` (`deploymentsApi.listDeployments`, response
`DeploymentsResponseDto`) to read the application's General-step display fields
(`description`, `iconUrl`, `topics`, `displayVersion`) from its listing entry. A failure of
this call SHALL NOT fail the load. When `applicationDetails.displayName` is present it SHALL
be used as the application's name in preference to the listing entry's.

On load, `application_properties` SHALL be normalised for the form: every `contexts[].url`
and `skills[].url` is decoded per path segment, and a legacy
`orchestrator.deployment.name` is copied into `orchestrator.deployment.deployment_id` when
`deployment_id` is absent.

Example request and response:

```
GET /api/v1/deployments/applications%2F<bucket>%2Fsupport-bot__1.0.0/details
```

```json
{
  "id": "applications/<bucket>/support-bot__1.0.0",
  "type": "application",
  "applicationDetails": {
    "displayName": "Support bot",
    "applicationTypeSchemaId": "<quick-app-2-schema-id>",
    "inputAttachmentTypes": ["application/pdf"],
    "maxInputAttachments": 3,
    "applicationProperties": {
      "orchestrator": {
        "deployment": { "deployment_id": "gpt-4o" },
        "system_prompt": { "type": "custom", "variables": {}, "content": "Be helpful" }
      },
      "contexts": [{ "type": "file", "url": "files/<bucket>/docs/a%20b.pdf" }]
    }
  }
}
```

The form then sees the context file as `files/<bucket>/docs/a b.pdf`.

The loading spinner is direction-agnostic; RTL impact: none.

#### Scenario: Existing application opens

- **WHEN** QuickApps is loaded with `id=applications%2F<bucket>%2Fsupport-bot__1.0.0` and
  the details call returns the application
- **THEN** QuickApps SHALL show the loading spinner until both the client-config call and the
  details call have settled
- **AND** it SHALL then render the editor initialised from the loaded application

#### Scenario: Editor does not request the client config

- **WHEN** `EditorClient` initializes
- **THEN** it SHALL NOT call `fetchAppSettings`, and `AppContext.settings` SHALL be the
  `settings` prop it received

#### Scenario: Deployments listing fails

- **WHEN** the details call succeeds but `GET /api/v1/deployments?interface_type=chat`
  fails
- **THEN** the editor SHALL still open, using `applicationDetails.displayName` as the
  application's name

#### Scenario: Client config fails

- **WHEN** the details call succeeds but `GET /api/v1/client-config?appId=chat-ui` fails
- **THEN** the editor SHALL still open, with no configured default model and every feature-flagged
  control disabled

#### Scenario: Stored application uses the legacy orchestrator name

- **WHEN** the loaded `application_properties.orchestrator.deployment` has `name: "gpt-4o"`
  and no `deployment_id`
- **THEN** the editor SHALL treat `gpt-4o` as the stored orchestrator model
