## ADDED Requirements

### Requirement: Runtime client configuration source

The editor SHALL read its runtime configuration only from chat-api's client config: `GET /api/v1/client-config?appId=chat-ui`, called through `@epam/ai-dial-chat-api-client` as `appConfigApi.getClientConfig({ appId: 'chat-ui' })`, which returns a `ClientConfigResponseDto` whose `config` is a `ClientConfigDto`. The call SHALL be made by `fetchAppSettings` in `src/utils/dial-client.ts`, which SHALL map the response onto `AppSettings` (`src/types/dial-entities.ts`) as follows:

| `AppSettings` key          | Source in the response                                  |
| -------------------------- | ------------------------------------------------------- |
| `dialCoreExternalUrl`      | `config.dialCoreExternalUrl` (`null` → absent)          |
| `defaultModelId`           | `config.defaultDeploymentId` (`null` → absent)          |
| `allowedOrigins`           | `config.customVariables.allowedOrigin`                  |
| `dialAdminHost`            | `config.customVariables.dialAdminHost`                  |
| `dialChatHost`             | `config.customVariables.dialChatHost`                   |
| `isCodeInterpreterEnabled` | `config.customVariables.codeInterpreterEnabled`         |
| `isWebFetchEnabled`        | `config.customVariables.webFetchEnabled`                |
| `isAddAttachmentEnabled`   | `config.customVariables.addAttachmentEnabled`           |

No other field of the client config SHALL affect the editor. The SPA SHALL NOT read these values from build-time environment variables, query parameters or a hardcoded default.

Example response (relevant part only):

```json
{
  "appId": "chat-ui",
  "config": {
    "dialCoreExternalUrl": "https://core.example.com",
    "defaultDeploymentId": "gpt-4o",
    "customVariables": {
      "allowedOrigin": "https://chat.example.com,https://admin.example.com",
      "dialAdminHost": "https://admin.example.com",
      "dialChatHost": "https://chat.example.com",
      "codeInterpreterEnabled": true,
      "webFetchEnabled": false,
      "addAttachmentEnabled": true
    }
  }
}
```

State ownership: the editor's settings are loaded by `EditorClient` (`src/components/EditorClient/EditorClient.tsx`) together with the application and exposed to the editor tree as `AppContext.settings`; the root route (`src/App.tsx`) loads its own copy into local state for host-origin resolution only. This requirement has no user-visible strings and no RTL impact (none).

#### Scenario: Client config is mapped onto the settings

- **WHEN** the client-config request returns the example response above
- **THEN** `AppContext.settings` SHALL be `{ dialCoreExternalUrl: "https://core.example.com", defaultModelId: "gpt-4o", allowedOrigins: ["https://chat.example.com", "https://admin.example.com"], dialAdminHost: "https://admin.example.com", dialChatHost: "https://chat.example.com", isCodeInterpreterEnabled: true, isWebFetchEnabled: false, isAddAttachmentEnabled: true }`

#### Scenario: Null core fields

- **WHEN** the client config returns `dialCoreExternalUrl: null` and `defaultDeploymentId: null`
- **THEN** `dialCoreExternalUrl` and `defaultModelId` SHALL be absent from the settings

### Requirement: Custom variable value types

`fetchAppSettings` SHALL accept a custom variable only in its expected type and SHALL treat any other value as not set:

- `codeInterpreterEnabled`, `webFetchEnabled` and `addAttachmentEnabled` SHALL turn their feature on only when the value is the JSON boolean `true`; any other value, including the string `"true"`, or a missing key SHALL resolve to `false`.
- `dialAdminHost` and `dialChatHost` SHALL be used only when the value is a string.
- `allowedOrigin` SHALL be accepted either as a single string of origins separated by commas and/or whitespace, or as an array of strings. Each entry SHALL be trimmed and stripped of trailing `/`; empty and non-string entries SHALL be dropped; any other value SHALL resolve to an empty list.
- When `customVariables` is missing or not an object, all three feature flags SHALL be `false`, both host keys absent and `allowedOrigins` an empty list.

The parsing lives in `readCustomVariables` (`src/utils/dial-client.ts`) and `parseAllowedOrigins` (`src/utils/allowed-origins.ts`). RTL impact: none.

#### Scenario: Feature flag given as a string

- **WHEN** `customVariables` is `{ "webFetchEnabled": "true" }`
- **THEN** `isWebFetchEnabled` SHALL be `false`

#### Scenario: Host given as a non-string

- **WHEN** `customVariables` is `{ "dialAdminHost": 42 }`
- **THEN** `dialAdminHost` SHALL be absent from the settings

#### Scenario: Allowed origins as a separated string

- **WHEN** `customVariables.allowedOrigin` is `"https://chat.example.com https://admin.example.com/"`
- **THEN** `allowedOrigins` SHALL be `["https://chat.example.com", "https://admin.example.com"]`

#### Scenario: Allowed origins as an array

- **WHEN** `customVariables.allowedOrigin` is `["https://chat.example.com", " https://admin.example.com ", 1, ""]`
- **THEN** `allowedOrigins` SHALL be `["https://chat.example.com", "https://admin.example.com"]`

#### Scenario: Custom variables missing

- **WHEN** the client config has no `customVariables` object
- **THEN** `isCodeInterpreterEnabled`, `isWebFetchEnabled` and `isAddAttachmentEnabled` SHALL be `false`
- **AND** `dialAdminHost` and `dialChatHost` SHALL be absent
- **AND** `allowedOrigins` SHALL be `[]`

### Requirement: Client config failure fallback

`fetchAppSettings` SHALL NOT reject. When the client-config request fails for any reason, it SHALL resolve to empty settings (`{}`): every feature flag off, no `dialCoreExternalUrl`, no `defaultModelId`, no host keys and no `allowedOrigins`. A failed client-config request SHALL NOT by itself block the editor from loading or show an error to the user. The consequences of each absent key are those stated in the per-key requirements below and in the specs they reference. RTL impact: none.

#### Scenario: Client config request fails

- **WHEN** `GET /api/v1/client-config?appId=chat-ui` fails (network error or non-2xx response)
- **AND** the application loads successfully
- **THEN** the editor SHALL render with `AppContext.settings` equal to `{}`
- **AND** no error screen SHALL be shown for the settings failure

### Requirement: Settings are loaded before the editor renders

`EditorClient` SHALL load the settings in parallel with the application (`fetchDialApp`) and SHALL provide `AppContext` only once both have resolved; until then it SHALL show the full-screen spinner. Settings SHALL be read once per editor initialization and SHALL NOT be refreshed while the editor stays mounted. `DataContext` SHALL start loading catalog data only once `AppContext.isReady` is set by this initialization. RTL impact: none (the spinner is direction-agnostic).

#### Scenario: Settings still loading

- **WHEN** the entry URL carries an application `id` and the client-config request has not resolved yet
- **THEN** the full-screen spinner SHALL be shown and no editor content SHALL be rendered

#### Scenario: Settings and application resolved

- **WHEN** both the application load and the client-config request have resolved
- **THEN** the editor SHALL render inside `AppContext` with those settings

### Requirement: Feature flags gate the Advanced Settings switches

`isCodeInterpreterEnabled`, `isWebFetchEnabled` and `isAddAttachmentEnabled` SHALL decide whether the Code Interpreter, Web fetch and Add attachment switches are offered, as specified in `application_advanced-settings` ("Feature toggles in the popup"). In addition, when a flag is off, the editor form (`useQuickApp2Form` in `src/hooks/use-quick-app2-form.ts`, fed from `AppContext.settings` by `src/components/QuickApp2Form/QuickApp2Form.tsx`) SHALL set the matching form value (`codeInterpreter`, `webFetch`, `addAttachment`) to `false` in both its current and initial values, so the change does not mark the form dirty. When a flag is on, the form value SHALL be the one read from the stored application. RTL impact: covered by `application_advanced-settings`.

#### Scenario: Flag off clears the stored value without dirtying the form

- **WHEN** the stored application has web fetch enabled (`application_properties.features.web_fetch.enabled: true`)
- **AND** the settings have `isWebFetchEnabled: false`
- **THEN** the form value `webFetch` SHALL be `false`
- **AND** the form SHALL NOT be dirty
- **AND** the Web fetch switch SHALL NOT be rendered in the Advanced Settings popup

#### Scenario: Flag on keeps the stored value

- **WHEN** the stored application has web fetch enabled
- **AND** the settings have `isWebFetchEnabled: true`
- **THEN** the form value `webFetch` SHALL be `true`

### Requirement: DIAL Core external URL enables the Connect tab

`dialCoreExternalUrl` SHALL be read from `AppContext.settings` by the add-on details popup (`src/components/common/AddOnDetailsPopup/AddOnDetailsPopup.tsx`) and by `useEntityDetails` (`src/hooks/use-entity-details.ts`, passed to the catalog as `dialCoreExternalUrl`, `null` when absent). Its effect on the Connect tab SHALL be as specified in `catalog-entity-details`: the tab is shown only when the URL is set. RTL impact: covered by `catalog-entity-details`.

#### Scenario: No DIAL Core URL configured

- **WHEN** the settings carry no `dialCoreExternalUrl`
- **THEN** the add-on details popup SHALL NOT show the Connect tab

### Requirement: Default deployment pre-selects the model

`defaultModelId` SHALL be used only to pre-select the orchestrator model for an application without a stored model, as specified in `orchestrator_model-selection` ("Initial model for an application without a stored model"). RTL impact: none.

#### Scenario: Default deployment configured

- **WHEN** the client config returns `defaultDeploymentId: "model-2"`
- **THEN** `AppContext.settings.defaultModelId` SHALL be `"model-2"` and the model pre-selection SHALL follow `orchestrator_model-selection`

### Requirement: Host keys configure the host handshake target

`dialAdminHost` and `dialChatHost` SHALL be read only by the root route (`src/App.tsx`) from its own settings copy, to choose the host origin for the ready handshake and the `readyToSave` and `loggedOut` messages, as specified in `host-integration` ("Host origin resolution", "Host handshake on load"). An empty-string `dialAdminHost` SHALL be treated as not configured, so `dialChatHost` is used. RTL impact: none.

#### Scenario: Empty admin host falls through to the chat host

- **WHEN** `customVariables` is `{ "dialAdminHost": "", "dialChatHost": "https://chat.example.com" }`
- **AND** the entry URL supplies an `applicationName`
- **THEN** the handshake SHALL target `https://chat.example.com`

#### Scenario: No host key configured

- **WHEN** neither `dialAdminHost` nor `dialChatHost` is set
- **THEN** no handshake SHALL be sent, as specified in `host-integration`

### Requirement: Allowed origins configure postMessage validation

`allowedOrigins` (from `customVariables.allowedOrigin`) SHALL be the allowed-origin list that the editor's postMessage handling checks inbound messages against and addresses outbound messages to, as specified in `host-integration` ("Origin validation"). It SHALL be read by `EditorClient` (inbound save/reset messages and outbound editor messages), by `DataContext` (proactive toolset login results), by `useToolsetCredentials` (toolset login requests and results) and by the agent details popup (application credentials requests, via `requestApplicationCredentials`). The root route's handshake messages SHALL NOT use this list; they target the host origin chosen from the host keys. RTL impact: none.

#### Scenario: Configured origins reach the validators

- **WHEN** `customVariables.allowedOrigin` is `"https://chat.example.com"`
- **THEN** `AppContext.settings.allowedOrigins` SHALL be `["https://chat.example.com"]`
- **AND** origin checks for inbound messages SHALL use that list as specified in `host-integration`

### Requirement: Favorites come from the user config

The editor SHALL read the user's favorites, read-only, from chat-api's user config: `GET /api/v1/user-config`, called through `@epam/ai-dial-chat-api-client` as `userConfigApi.getUserConfig()`, which returns a `UserConfigDto`. `fetchFavoriteIds` (`src/utils/user-config.ts`) SHALL return the union of `deployments.installed`, `toolsets.installed` and `skills.installed`, treating a missing section as empty. Other sections of the user config SHALL be ignored, and the editor SHALL NOT write the user config.

Example response (relevant part only):

```json
{
  "version": 1,
  "deployments": { "installed": ["gpt-4o", "applications/bucket/my-app"] },
  "toolsets": { "installed": ["toolsets/public/search"] },
  "skills": { "installed": [] }
}
```

State ownership: `DataContext` loads the favorites together with the catalog data and holds them as `favoriteIds`; it SHALL stamp `isUserFavorite` and `isStarred` on each model, toolset, MCP agent and skill whose id is in that set, in memoised (`useMemo`) derived lists. A `404` SHALL mean "no favorites yet" and resolve to an empty set. Any other failure SHALL NOT fail the catalog load: `favoriteIds` SHALL be empty and `DataContext` SHALL hold the error message as `favoritesError`. This requirement adds no user-visible strings; RTL impact: none.

#### Scenario: Favorites loaded

- **WHEN** the user-config request returns the example response above
- **THEN** `DataContext.favoriteIds` SHALL contain `gpt-4o`, `applications/bucket/my-app` and `toolsets/public/search`
- **AND** a loaded model with id `gpt-4o` SHALL carry `isUserFavorite: true` and `isStarred: true`

#### Scenario: Missing sections

- **WHEN** the user config returns only `{ "version": 1, "deployments": { "installed": ["gpt-4o"] } }`
- **THEN** `favoriteIds` SHALL contain only `gpt-4o`

#### Scenario: No user config yet

- **WHEN** `GET /api/v1/user-config` returns `404`
- **THEN** `favoriteIds` SHALL be empty
- **AND** `favoritesError` SHALL NOT be set

#### Scenario: User config request fails

- **WHEN** `GET /api/v1/user-config` fails with any error other than `404`
- **AND** the catalog requests succeed
- **THEN** `DataContext` SHALL still become ready with the catalog data
- **AND** `favoriteIds` SHALL be empty and `favoritesError` SHALL hold the error message
