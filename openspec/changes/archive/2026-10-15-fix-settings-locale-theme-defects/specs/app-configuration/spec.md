## MODIFIED Requirements

### Requirement: Runtime client configuration source

The editor SHALL read its runtime configuration only from chat-api's client config: `GET /api/v1/client-config?appId=chat-ui`, called through `@epam/ai-dial-chat-api-client` as `appConfigApi.getClientConfig({ appId: 'chat-ui' })`, which returns a `ClientConfigResponseDto` whose `config` is a `ClientConfigDto`. The call SHALL be made by `fetchAppSettings` in `src/utils/dial-client.ts`, which SHALL map the response onto `AppSettings` (`src/types/dial-entities.ts`) as follows:

| `AppSettings` key          | Source in the response                          |
| -------------------------- | ----------------------------------------------- |
| `dialCoreExternalUrl`      | `config.dialCoreExternalUrl` (`null` → absent)  |
| `defaultModelId`           | `config.defaultDeploymentId` (`null` → absent)  |
| `allowedOrigins`           | `config.customVariables.allowedOrigin`          |
| `dialAdminHost`            | `config.customVariables.dialAdminHost`          |
| `dialChatHost`             | `config.customVariables.dialChatHost`           |
| `isCodeInterpreterEnabled` | `config.customVariables.codeInterpreterEnabled` |
| `isWebFetchEnabled`        | `config.customVariables.webFetchEnabled`        |
| `isAddAttachmentEnabled`   | `config.customVariables.addAttachmentEnabled`   |

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

State ownership: the root route (`src/App.tsx`) SHALL be the only caller of `fetchAppSettings` and SHALL hold the settings in its local state. It SHALL use them for host-origin resolution and SHALL pass them to `EditorClient` (`src/components/EditorClient/EditorClient.tsx`) as its `settings` prop. `EditorClient` SHALL expose them to the editor tree as `AppContext.settings`. No other component, context or hook SHALL request the client config. chat-api resolves role-restricted values for the session user, so the root route SHALL request the client config once the auth status is known (not `Loading`), and again only when the signed-in user's `sub` changes, including signing in or out. A session revalidation for the same user SHALL NOT request it again. This requirement has no user-visible strings and no RTL impact (none).

#### Scenario: Client config is mapped onto the settings

- **WHEN** the client-config request returns the example response above
- **THEN** `AppContext.settings` SHALL be `{ dialCoreExternalUrl: "https://core.example.com", defaultModelId: "gpt-4o", allowedOrigins: ["https://chat.example.com", "https://admin.example.com"], dialAdminHost: "https://admin.example.com", dialChatHost: "https://chat.example.com", isCodeInterpreterEnabled: true, isWebFetchEnabled: false, isAddAttachmentEnabled: true }`

#### Scenario: Null core fields

- **WHEN** the client config returns `dialCoreExternalUrl: null` and `defaultDeploymentId: null`
- **THEN** `dialCoreExternalUrl` and `defaultModelId` SHALL be absent from the settings

#### Scenario: One client-config request per session user

- **WHEN** a signed-in user opens the editor and the session is later revalidated for the same user (for example when the tab regains focus)
- **THEN** exactly one `GET /api/v1/client-config?appId=chat-ui` request SHALL be made
- **AND** the host handshake and `AppContext.settings` SHALL use the result of that one request

#### Scenario: Signing in loads the user's config

- **WHEN** the page loads signed out, and the user then signs in
- **THEN** the client config SHALL be requested once while signed out and once more after sign-in
- **AND** the editor SHALL render with the settings from the request made after sign-in

### Requirement: Settings are loaded before the editor renders

The root route SHALL render `EditorClient` only when the user is signed in and the settings it holds were loaded for that user. Until then it SHALL show the full-screen spinner. `EditorClient` SHALL load the application (`fetchDialApp`) and SHALL provide `AppContext`, with the `settings` prop it received, only once the application has resolved. Until then it SHALL show the full-screen spinner. Settings SHALL be read once per editor initialization and SHALL NOT be refreshed while the editor stays mounted. `DataContext` SHALL start loading catalog data only once `AppContext.isReady` is set by this initialization. RTL impact: none (the spinner is direction-agnostic).

#### Scenario: Settings still loading

- **WHEN** the user is signed in, the entry URL carries an application `id` and the client-config request has not resolved yet
- **THEN** the full-screen spinner SHALL be shown and no editor content SHALL be rendered

#### Scenario: Settings and application resolved

- **WHEN** both the client-config request and the application load have resolved
- **THEN** the editor SHALL render inside `AppContext` with those settings

### Requirement: Host keys configure the host handshake target

`dialAdminHost` and `dialChatHost` SHALL be read only by the root route (`src/App.tsx`) from the settings it holds, to choose the host origin for the ready handshake and the `readyToSave` and `loggedOut` messages, as specified in `host-integration` ("Host origin resolution", "Host handshake on load"). An empty-string `dialAdminHost` SHALL be treated as not configured, so `dialChatHost` is used. Reloading the settings for another user SHALL NOT repeat the handshake unless the resolved host keys change. RTL impact: none.

#### Scenario: Empty admin host falls through to the chat host

- **WHEN** `customVariables` is `{ "dialAdminHost": "", "dialChatHost": "https://chat.example.com" }`
- **AND** the entry URL supplies an `applicationName`
- **THEN** the handshake SHALL target `https://chat.example.com`

#### Scenario: No host key configured

- **WHEN** neither `dialAdminHost` nor `dialChatHost` is set
- **THEN** no handshake SHALL be sent, as specified in `host-integration`

#### Scenario: Sign-in with the same host keys

- **WHEN** the handshake was sent while signed out, and the user signs in and the reloaded settings carry the same host keys
- **THEN** the handshake SHALL NOT be sent again
