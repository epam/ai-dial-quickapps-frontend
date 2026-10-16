## MODIFIED Requirements

### Requirement: Application load outcomes

QuickApps SHALL handle the outcome of the details call
(`GET /api/v1/deployments/{deployment}/details`) as follows:

- `404` — the application SHALL be opened as a new application: id taken from the entry
  URL, empty name, no stored `application_properties`, and auto-save SHALL stay disabled
  until the first successful save (see "Save trigger gating").
- `403` — QuickApps SHALL render the forbidden state defined by `auth`
  ("Denied-access presentation") instead of the editor, and SHALL NOT render the form.
- any other failure — QuickApps SHALL render an error state in place of the editor showing
  `AppsEditorI18nKeys.SchemaFormLoadFailed` (`appsEditor.schemaForm.loadFailed`, "Failed to
  load the application settings. Please try again.", the same key path as ai-dial-chat), and
  SHALL NOT render the form. The raw error message SHALL NOT be shown.

The state is owned by `EditorClient` (`isForbidden`, `hasLoadError`). The forbidden state's strings
and accessibility are specified by `auth`; the error state is a centred text block,
direction-agnostic (RTL impact: none).

#### Scenario: Application does not exist yet

- **WHEN** the details call answers `404`
- **THEN** QuickApps SHALL render the editor for a new application with the entry URL's id
  and default form values
- **AND** a TriggerAutoSave received before the first successful save SHALL be ignored

#### Scenario: User may not open the application

- **WHEN** the details call answers `403`
- **THEN** QuickApps SHALL render the forbidden state and SHALL NOT render the editor form

#### Scenario: Load fails for another reason

- **WHEN** the details call fails with a status other than `403` or `404`, or the request
  itself fails
- **THEN** QuickApps SHALL render the error state with the `SchemaFormLoadFailed` text and
  SHALL NOT render the editor form
- **AND** the generated client's "Response returned an error code" SHALL NOT be shown

### Requirement: Save outcome messages

For a save that passes the gating, QuickApps SHALL post exactly one outcome message to the
host (envelope and targeting per `host-integration`):

- manual save accepted by chat-api — SaveSuccess
  `{ type: "SAVE_SUCCESS", payload: { updatedApp }, hasChanges }`. `updatedApp` SHALL be
  chat-api's response body with `id` replaced by the editor's decoded id and
  `applicationProperties` replaced by the configuration the editor built for this save
  (before URL re-encoding). `hasChanges` is defined by "Meaning of SaveSuccess hasChanges".
- auto-save accepted by chat-api — AutoSaveComplete `{ type: "AUTO_SAVE_COMPLETE" }`, with no
  payload and no `hasChanges`.
- any failure while building the configuration or of the update request, for a manual save
  or an auto-save — SaveError `{ type: "SAVE_ERROR", payload: { error } }`. `error` SHALL
  be the message chat-api put in the error response body (`message`, a `message` array joined
  with line breaks, or `error`), read with `getApiErrorMessage` from
  `@epam/ai-dial-chat-hooks`. When the failure carries no such message — a network error, a
  response without a message body, or an error while building the configuration — `error` SHALL
  be the translation of `AppsEditorI18nKeys.ErrorSaveFailed` (`appsEditor.error.saveFailed`,
  "Failed to save application settings. Please try again.", the same key the host uses for its
  own save failures). The generated client's generic "Response returned an error code" SHALL NOT
  be sent. The resolution lives in `getChatApiErrorMessage` (`src/utils/chat-api-error.ts`).

A successful save of either kind SHALL mark the application as saved (`hasSavedOnce`), which
enables TriggerAutoSave and the auto-save interval for an application that did not exist on
load.

#### Scenario: Manual save succeeds

- **WHEN** a TriggerSave passes the gating and chat-api answers `200`
- **THEN** QuickApps SHALL post SaveSuccess whose `payload.updatedApp.id` is the editor's
  decoded application id and whose `payload.updatedApp.applicationProperties` is the
  configuration it sent, with decoded context and skill URLs

#### Scenario: Auto-save succeeds

- **WHEN** an auto-save passes the gating and chat-api answers `200`
- **THEN** QuickApps SHALL post AutoSaveComplete and SHALL NOT post SaveSuccess

#### Scenario: Auto-save fails

- **WHEN** an auto-save passes the gating and the update request fails
- **THEN** QuickApps SHALL post SaveError and SHALL NOT post AutoSaveComplete

#### Scenario: chat-api explains the failure

- **WHEN** the update request fails with `400` and the body
  `{ "message": ["version must be a valid semantic version"] }`
- **THEN** SaveError SHALL carry `error` "version must be a valid semantic version"

#### Scenario: Failure without a chat-api message

- **WHEN** the update request fails with `500` and an empty body, or the network request fails
- **THEN** SaveError SHALL carry the translation of `AppsEditorI18nKeys.ErrorSaveFailed`
