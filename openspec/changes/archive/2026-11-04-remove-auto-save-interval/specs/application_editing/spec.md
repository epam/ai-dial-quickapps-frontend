# Spec Delta

## REMOVED Requirements

### Requirement: Auto-save interval
**Reason**: QuickApps no longer saves on its own timer. Saves happen only when the host sends
TriggerSave or TriggerAutoSave.
**Migration**: A host that wants periodic saves SHALL send TriggerAutoSave itself.

## MODIFIED Requirements

### Requirement: Save trigger gating

QuickApps SHALL route every save through one window-level event
(`DIAL_EDITOR_TRIGGER_SAVE_EVENT`, `src/constants/editor.ts`, detail
`TriggerSaveEventDetail`) that the mounted `QuickApp2Form` handles. A save is a manual save
when it comes from a TriggerSave message, and an auto-save when it comes from a
TriggerAutoSave message. QuickApps SHALL NOT start a save on its own.

QuickApps SHALL ignore a save trigger, without a chat-api request and without posting a
save-outcome message, when:

- it is a TriggerAutoSave and the application has not been saved yet — the load answered
  `404` and no save has succeeded in this session (`hasSavedOnce` in `EditorClient`);
- it is an auto-save, the form is not dirty, and the trigger did not ask to ignore the dirty
  state — only a TriggerAutoSave with `payload.ignoreDirty: true` does
  (`shouldIgnoreDirty`);
- the form values fail validation (`QuickApp2Schema`). The form SHALL then show the
  validation errors, including deferred ones such as empty instructions. A manual save
  SHALL additionally post SaveError carrying the error messages joined with `; `, so the host
  does not wait for an outcome; an auto-save posts nothing;
- it arrives before the form has mounted (the application is still loading, or the load
  failed).

A manual save SHALL run whether or not the form is dirty. QuickApps SHALL forward a
TriggerSave's `general` payload to the save, and SHALL NOT pass `general` with an auto-save.

#### Scenario: Clean auto-save is skipped

- **WHEN** the form is clean and QuickApps receives a TriggerAutoSave without
  `payload.ignoreDirty`
- **THEN** QuickApps SHALL NOT call chat-api and SHALL NOT post a save-outcome message

#### Scenario: Dirty auto-save runs

- **WHEN** the form is dirty and QuickApps receives a TriggerAutoSave
- **THEN** QuickApps SHALL save the current values without a `general` payload

#### Scenario: Host forces an auto-save

- **WHEN** the form is clean and QuickApps receives a TriggerAutoSave with
  `payload: { ignoreDirty: true }` for an application that has been saved before
- **THEN** QuickApps SHALL save the current values

#### Scenario: Auto-save before the first save of a new application

- **WHEN** the load answered `404`, no save has succeeded yet, and QuickApps receives a
  TriggerAutoSave with `payload: { ignoreDirty: true }`
- **THEN** QuickApps SHALL ignore it

#### Scenario: Manual save of a clean form

- **WHEN** the form is clean and QuickApps receives a TriggerSave
- **THEN** QuickApps SHALL save the current values

#### Scenario: No save without a host trigger

- **WHEN** the form is dirty and the host sends neither TriggerSave nor TriggerAutoSave
- **THEN** QuickApps SHALL NOT call chat-api, however long the form stays dirty

#### Scenario: Invalid form

- **WHEN** QuickApps receives a TriggerSave or a dirty TriggerAutoSave while the
  instructions are blank
- **THEN** QuickApps SHALL show the error `ApplicationEditorI18nKeys.InstructionsRequired`
  ("Instructions are required") on the instructions field
- **AND** it SHALL NOT call chat-api and SHALL NOT post SaveSuccess or AutoSaveComplete
- **AND** for a TriggerSave it SHALL post SaveError with `error` "Instructions are required";
  for a TriggerAutoSave it SHALL post nothing

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
enables TriggerAutoSave for an application that did not exist on load.

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
