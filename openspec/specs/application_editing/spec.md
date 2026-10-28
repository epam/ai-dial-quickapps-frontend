# Application Editing Specification

## Purpose

QuickApps is the editor for a Quick App 2.0's Settings step, and it persists the whole
application to chat-api in one update request on save. This capability defines what that
save writes, including the General-step (Metadata) values the host owns and sends with its
save trigger. See `host-integration` for the TriggerSave message itself.

It also defines the editor lifecycle: loading the application, the form state and dirty
tracking, when a save trigger is skipped, the auto-save interval, the save request and its outcome
messages, `RESET`, and the top-level shape of `application_properties`.

## Requirements

### Requirement: Save persists host-supplied General-step fields

QuickApps SHALL persist the General-step values from a TriggerSave message's `general`
payload, when one is present, in the same
`PATCH /api/v1/applications/{applicationName}` request (chat-api,
`applicationsApi.updateApplication`, body `UpdateApplicationBodyDto`) that persists
the editor's own configuration. The host does not issue a second write for these fields.

The payload fields map to the request body as follows:

| `TriggerSaveGeneralPayload` field    | `UpdateApplicationBodyDto` field   |
| ------------------------------------ | ---------------------------------- |
| `name` + `locales` + `primaryLocale` | `name`, `locales`, `primaryLocale` |
| `description` + `locales`            | `description`                      |
| `iconUrl`                            | `iconUrl`                          |
| `topics`                             | `topics`                           |
| `display_version`                    | `version`                          |

QuickApps SHALL send `version` only when `general.display_version` is a non-blank
string. Otherwise it SHALL omit `version`, so chat-api leaves the stored
`displayVersion` unchanged. QuickApps SHALL NOT fill `version` from the values it
loaded when the editor opened. QuickApps SHALL NOT validate the version format: if
chat-api rejects it (for example, the value is not SemVer), the save SHALL be reported
as SaveError.

The state lives in `EditorClient` (`src/components/EditorClient/EditorClient.tsx`),
which receives `general` from the TriggerSave message and passes it to `saveDialApp`
(`src/utils/dial-client.ts`). No new context or hook is introduced. There is no UI change,
so there are no i18n, RTL, accessibility or memoisation requirements.

Example. The host posts:

```json
{
  "type": "TRIGGER_SAVE",
  "general": {
    "name": "qa-quickapp-version-check",
    "description": "Edited in the editor",
    "primaryLocale": "en",
    "display_version": "1.0.1"
  }
}
```

QuickApps sends
`PATCH /api/v1/applications/applications%2F<bucket>%2Fqa-quickapp-version-check__1.0.0`:

```json
{
  "name": "qa-quickapp-version-check",
  "description": "Edited in the editor",
  "version": "1.0.1",
  "primaryLocale": "en",
  "applicationProperties": { "...": "..." }
}
```

chat-api responds `200` with the updated application, including
`"displayVersion": "1.0.1"`. The id keeps its `__1.0.0` suffix.

#### Scenario: Host changes the version and saves

- **WHEN** QuickApps receives a TriggerSave whose `general.display_version` is `"1.0.1"`
  for an app whose stored display version is `"1.0.0"`
- **THEN** the update request body SHALL contain `version: "1.0.1"`, and QuickApps
  SHALL post SaveSuccess with `hasChanges: true` once chat-api accepts it

#### Scenario: Save without a general payload

- **WHEN** a save runs without a `general` payload (an auto-save, or a TriggerSave
  with no `general`)
- **THEN** the update request body SHALL NOT contain a `version` field

#### Scenario: General payload without a display version

- **WHEN** QuickApps receives a TriggerSave whose `general` has no `display_version`,
  or a blank one
- **THEN** the update request body SHALL NOT contain a `version` field, and the other
  General-step fields SHALL still be persisted

#### Scenario: chat-api rejects the version

- **WHEN** chat-api answers the update request with a validation error for `version`
- **THEN** QuickApps SHALL post SaveError carrying the error description

### Requirement: Saved entity references use the canonical id

QuickApps SHALL persist every referenced entity id — `tool_sets[].deployment_id` for
toolsets, agents and DIAL deployment tools — in chat-api's canonical form: each path
segment percent-encoded exactly once, identical to the `id` returned by
`GET /api/v1/toolsets` and `GET /api/v1/deployments`. Inside the editor ids are held
decoded and encoded once when written.

#### Scenario: Toolset name contains a space

- **WHEN** chat-api lists a toolset with id `toolsets/<bucket>/QA%20enc%20check__1.0.0`
  and the user adds it in Agents & Toolsets and saves
- **THEN** the saved `tool_sets[].deployment_id` SHALL be
  `toolsets/<bucket>/QA%20enc%20check__1.0.0`, not `QA%2520enc%2520check__1.0.0`

#### Scenario: Reopening and saving an app keeps the id unchanged

- **WHEN** an app whose `tool_sets[].deployment_id` is
  `toolsets/<bucket>/QA%20enc%20check__1.0.0` is opened and saved again
- **THEN** the saved `deployment_id` SHALL be unchanged

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
(`description`, `iconUrl`, `topics`, `displayVersion`) from its listing entry. The listing entry
SHALL be the one whose `id`, decoded per path segment (`decodeDialPath`), equals the editor's
decoded id: chat-api returns listing ids percent-encoded, while the editor holds the id decoded. A failure of
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

#### Scenario: Id with special characters

- **WHEN** the editor opens `applications/<bucket>/My agent__1.0.0` and the listing has an
  entry with `id` `applications/<bucket>/My%20agent__1.0.0` and `iconUrl`
  `"https://example.com/icon.png"`
- **THEN** the loaded application's icon URL SHALL be `"https://example.com/icon.png"`

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

### Requirement: Editor form state and dirty tracking

The editor's Settings-step values SHALL be owned by `useQuickApp2Form`
(`src/hooks/use-quick-app2-form.ts`), a reducer hook used only by `QuickApp2Form`
(`src/components/QuickApp2Form/QuickApp2Form.tsx`). Its initial values and its dirty
baseline SHALL be built by `getQuickApp2FormData` (`src/form/quick-app-form-data.ts`) from the
loaded application when the form mounts. The hook's result SHALL be memoised (`useMemo`)
and its actions SHALL be stable (`useCallback`), so that consumers' effects keyed on them
do not re-run on unrelated renders.

After every successful save, the form values that were submitted for that save SHALL become
the baseline. The hook exposes this as a stable `markSaved(values)` action, which
`QuickApp2Form` calls once its `onSave` resolves to `true`. A failed save SHALL leave the
baseline unchanged. Values changed while a save is in flight are not part of the submitted
values, so they SHALL keep the form dirty after that save.

The form SHALL be dirty exactly when its current values are not deeply equal to its
baseline. Values the editor resolves for itself rather than the user — the resolved model
when none is stored, the available and tool-supporting model lists, and switching off
`codeInterpreter`, `webFetch` or `addAttachment` when their feature flag is off — SHALL be
applied to both the values and the baseline, so they SHALL NOT make the form dirty.

QuickApps SHALL post DIRTY_STATE `{ isDirty }` (see `host-integration`, "Outbound message
contract") only when the dirty state changes. It SHALL NOT post DIRTY_STATE for the initial
clean state.

#### Scenario: User edits a field

- **WHEN** the user changes the instructions of a freshly opened application
- **THEN** QuickApps SHALL post DIRTY_STATE with `isDirty: true` once

#### Scenario: User restores the original value

- **WHEN** the user changes the instructions and then types back the loaded text
- **THEN** QuickApps SHALL post DIRTY_STATE with `isDirty: false`

#### Scenario: Editor resolves the model itself

- **WHEN** an application without a stored model opens and the editor assigns the default
  model once the models load
- **THEN** the form SHALL stay clean and QuickApps SHALL NOT post DIRTY_STATE

#### Scenario: Successful save cleans the form

- **WHEN** the user changes the instructions and a save of those values succeeds
- **THEN** QuickApps SHALL post DIRTY_STATE with `isDirty: false`
- **AND** a later TriggerAutoSave without `ignoreDirty` SHALL NOT send an update request

#### Scenario: Edit during an in-flight save

- **WHEN** a save is in flight and the user changes the instructions again before it succeeds
- **THEN** the form SHALL still be dirty after the save succeeds

#### Scenario: Failed save keeps the form dirty

- **WHEN** the user changes the instructions and chat-api rejects the save
- **THEN** the form SHALL stay dirty

### Requirement: Save trigger gating

QuickApps SHALL route every save through one window-level event
(`DIAL_EDITOR_TRIGGER_SAVE_EVENT`, `src/constants/editor.ts`, detail
`TriggerSaveEventDetail`) that the mounted `QuickApp2Form` handles. A save is a manual save
when it comes from a TriggerSave message, and an auto-save when it comes from a
TriggerAutoSave message or the editor's own interval (see "Auto-save interval").

QuickApps SHALL ignore a save trigger, without a chat-api request and without posting a
save-outcome message, when:

- it is a TriggerAutoSave and the application has not been saved yet — the load answered
  `404` and no save has succeeded in this session (`hasSavedOnce` in `EditorClient`);
- it is an auto-save, the form is not dirty, and the trigger did not ask to ignore the dirty
  state — only a TriggerAutoSave with `payload.ignoreDirty: true` does
  (`shouldIgnoreDirty`); the interval never does;
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

#### Scenario: Invalid form

- **WHEN** QuickApps receives a TriggerSave or a dirty TriggerAutoSave while the
  instructions are blank
- **THEN** QuickApps SHALL show the error `ApplicationEditorI18nKeys.InstructionsRequired`
  ("Instructions are required") on the instructions field
- **AND** it SHALL NOT call chat-api and SHALL NOT post SaveSuccess or AutoSaveComplete
- **AND** for a TriggerSave it SHALL post SaveError with `error` "Instructions are required";
  for a TriggerAutoSave it SHALL post nothing

### Requirement: Auto-save interval

`EditorClient` SHALL dispatch an auto-save, once the application has loaded and has been
saved at least once — it existed on load, or a save has succeeded in this session — every
`AUTO_SAVE_INTERVAL_MS` (30 000 ms, `src/constants/editor.ts`) while it is mounted. The
interval auto-save SHALL NOT ignore the dirty state, so it SHALL save only a dirty form (see
"Save trigger gating"). For an application that did not exist on load, the interval SHALL
start after the first successful save.

#### Scenario: Dirty form is auto-saved

- **WHEN** an existing application is open and the form is dirty when a 30-second interval tick fires
- **THEN** QuickApps SHALL save it as an auto-save and post AutoSaveComplete on success

#### Scenario: New application is not auto-saved before its first save

- **WHEN** the load answered `404` and the user edits the form without a manual save
- **THEN** QuickApps SHALL NOT start the auto-save interval

#### Scenario: Interval starts after the first save

- **WHEN** the load answered `404` and a manual save succeeds
- **THEN** QuickApps SHALL dispatch an auto-save every 30 seconds from then on

### Requirement: Save request

Every save that passes the gating SHALL send exactly one
`PATCH /api/v1/applications/{applicationName}` request (`applicationsApi.updateApplication`,
body `UpdateApplicationBodyDto`), with `applicationName` being the editor's id re-encoded
per segment, carrying:

- the General-step fields (`name`, `description`, `iconUrl`, `topics`, `version`,
  `locales`, `primaryLocale`) as defined by "Save persists host-supplied General-step
  fields" when a `general` payload is present;
- `inputAttachmentTypes` and `maxInputAttachments` from the validated form values (owned by
  `application_user-attachments` and `application_advanced-settings`);
- `applicationProperties` built by `buildQuickApp2Config` (`src/form/build-quick-app-config.ts`)
  from the validated form values, as described in "Application properties written on save",
  with every `contexts[].url` and `skills[].url` re-encoded per path segment.

The save is performed by `EditorClient`'s `handleSave`, which calls `saveDialApp`
(`src/utils/dial-client.ts`). The request does not depend on whether the save is manual or
an auto-save, apart from the `general` payload an auto-save never has.

Without a `general` payload, `name`, `description`, `iconUrl` and `topics` SHALL come from the
saved application `EditorClient` holds: the values loaded when the editor opened, replaced after
each successful save. `handleSave` SHALL resolve to `true` once the update request succeeds,
and to `false` when it fails. After a success it SHALL replace `appState.app` with the saved
state, built from what it sent, not from chat-api's response:

- `applicationProperties`: the built configuration;
- `inputAttachmentTypes` and `maxInputAttachments`: the validated form values;
- the General-step fields: `name` and `description`, recombined as in `i18n` ("Recombining host
  locale entries"), plus `iconUrl` and `topics`. These are the values sent with this save, or
  the held ones for a save without `general`;
- the display version: `general.display_version` when it was a non-blank string, otherwise the
  held one.

This state is owned by `EditorClient` as `appState` and passed to the form through
`AppContextProvider`, as described in "Application load on open". No other context or hook
owns it.

Example request (manual save with `general`):

```
PATCH /api/v1/applications/applications%2F<bucket>%2Fsupport-bot__1.0.0
```

```json
{
  "name": "Support bot",
  "description": "Answers support questions",
  "primaryLocale": "en",
  "inputAttachmentTypes": ["application/pdf"],
  "maxInputAttachments": 3,
  "applicationProperties": {
    "orchestrator": {
      "deployment": { "deployment_id": "gpt-4o", "parameters": { "temperature": 0.5 } },
      "system_prompt": { "type": "custom", "variables": {}, "content": "Be helpful" }
    },
    "contexts": [{ "url": "files/<bucket>/docs/a%20b.pdf", "type": "file" }],
    "tool_sets": [{ "name": "dial-deployment-tool-set", "type": "dial-deployment", "tools": [] }],
    "conversation_starters": null,
    "features": {
      "timestamp": { "injection_strategy": "tool_call" },
      "dial_files": null,
      "representation_tooling": null,
      "web_fetch": null
    }
  }
}
```

chat-api responds `200` with the updated application (`id`, `name`, `description`,
`displayVersion`, `applicationProperties`, …).

#### Scenario: Context file with a space is saved

- **WHEN** the form holds the context file `files/<bucket>/docs/a b.pdf` and a save runs
- **THEN** the request's `applicationProperties.contexts[0].url` SHALL be
  `files/<bucket>/docs/a%20b.pdf`

#### Scenario: Attachment settings are sent at the top level

- **WHEN** the form holds `inputAttachmentTypes: ["application/pdf"]` and
  `maxInputAttachments: 3` and a save runs
- **THEN** the request body SHALL carry `inputAttachmentTypes: ["application/pdf"]` and
  `maxInputAttachments: 3` beside `applicationProperties`, not inside it

#### Scenario: Auto-save after a General-step save

- **WHEN** a TriggerSave with `general.iconUrl` `"https://example.com/new.png"` succeeds, the
  user then changes the instructions, and a TriggerAutoSave runs
- **THEN** the auto-save's update request SHALL carry `iconUrl: "https://example.com/new.png"`,
  not the icon URL loaded when the editor opened

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

### Requirement: Meaning of SaveSuccess hasChanges

`SaveSuccess.hasChanges` SHALL be computed by `hasQuickAppChanges`
(`src/utils/has-quick-app-changes.ts`) before the update request is sent. It SHALL be
`true` when either:

- some top-level key of the `application_properties` built for this save is not deeply equal
  to the same key of the held saved application's `application_properties`; or
- the TriggerSave carried a `general` payload and at least one of `name`, `description`
  (each recombined with `general.locales` into a localized-text dictionary), `iconUrl`,
  `topics` or `display_version` differs from the held saved value.

Otherwise it SHALL be `false`. `locales` and `primaryLocale` SHALL NOT be compared on their
own. The comparison baseline SHALL be the saved application `EditorClient` holds ("Save
request"). That is the application loaded when the editor opened (after the load
normalisation in "Application load on open"), replaced after each successful save in the
session. `hasChanges` does not say whether unsaved changes remain after the save.

#### Scenario: Settings change

- **WHEN** the user changes the instructions and the host sends a TriggerSave
- **THEN** SaveSuccess SHALL carry `hasChanges: true`

#### Scenario: Only a General-step field changes

- **WHEN** the built `application_properties` equals the loaded one key by key and the
  TriggerSave's `general.iconUrl` differs from the loaded icon URL
- **THEN** SaveSuccess SHALL carry `hasChanges: true`

#### Scenario: Nothing differs

- **WHEN** the built `application_properties` equals the loaded one key by key and the
  TriggerSave carries no `general` payload
- **THEN** SaveSuccess SHALL carry `hasChanges: false`

#### Scenario: Second save without new edits

- **WHEN** the user changes the instructions, a TriggerSave succeeds, and the host sends another
  TriggerSave without further edits and without a `general` payload
- **THEN** the second SaveSuccess SHALL carry `hasChanges: false`

### Requirement: Reset remounts the editor form

On a Reset message (see `host-integration`, "Inbound message contract"), QuickApps SHALL
discard in-progress edits by remounting `QuickApp2Form` (a new React `key` held in
`EditorClient` as `resetKey`), which rebuilds its values and dirty baseline from the saved
application `EditorClient` holds ("Save request"). That is the application loaded when the
editor opened, or the state of the last successful save. Reset SHALL NOT make a chat-api request and
SHALL NOT refetch the application. It SHALL NOT post a save-outcome message and SHALL NOT
change whether the application counts as saved.

#### Scenario: Host resets a dirty form

- **WHEN** the user has changed the instructions and QuickApps receives a Reset
- **THEN** the instructions SHALL show the loaded text again
- **AND** QuickApps SHALL post DIRTY_STATE with `isDirty: false`
- **AND** it SHALL NOT call chat-api

#### Scenario: Reset after a save

- **WHEN** the user changes the instructions to `"Be brief"`, a save succeeds, the user changes
  them again, and QuickApps receives a Reset
- **THEN** the instructions SHALL show `"Be brief"`

### Requirement: Application properties written on save

`buildQuickApp2Config` (`src/form/build-quick-app-config.ts`) SHALL build `application_properties`
with these top-level keys. Each section's values are owned by the capability named; this
requirement fixes only the top-level shape and what is carried over from the loaded
configuration.

| Key                     | Content                                                                                                                                                                                                                                     | Owner                                                                                                      |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `orchestrator`          | the loaded `orchestrator` object with `deployment` replaced by `{ deployment_id, parameters }`, `system_prompt` replaced by `{ type: "custom", variables, content }`, and `attachment_strategy` set only when the model accepts attachments | `orchestrator_model-selection` (model), `application_advanced-settings` (temperature, attachment strategy) |
| `contexts`              | `[{ url, type: "file" }]`, one per knowledge-base item, always present                                                                                                                                                                      | `application_knowledge-base`                                                                               |
| `tool_sets`             | MCP toolsets, then agents, then one `dial-deployment-tool-set` entry (always present, possibly with no tools), then inline toolsets, then the code interpreter when on                                                                      | `toolsets_selection`, `agents_selection`, `application_advanced-settings` (code interpreter)               |
| `conversation_starters` | the starters object, or `null` when there are no non-blank starters                                                                                                                                                                         | `application_conversation-starters`                                                                        |
| `skills`                | `[{ type: "dial-skill", url }]` in attached order; the key SHALL be omitted when no skill is attached                                                                                                                                       | `skills_catalog`                                                                                           |
| `features`              | the loaded `features` object with `timestamp`, `dial_files`, `representation_tooling` and `web_fetch` set                                                                                                                                   | `application_advanced-settings`                                                                            |

`orchestrator.system_prompt.content` SHALL be the instructions exactly as typed, whitespace
included, and `orchestrator.system_prompt.variables` SHALL be the loaded
`system_prompt.variables`, or `{}` when none were loaded. Keys inside the loaded
`orchestrator` and `features` objects that the editor does not set SHALL be kept, including
keys nested inside `orchestrator.deployment` (such as `name`, and `parameters` keys other than
`temperature`) and inside `orchestrator.system_prompt`.
Top-level keys of the loaded `application_properties` other than the six in the table (and
other than `input_attachment_types` and `max_input_attachments`, which the editor owns)
SHALL be kept as loaded. Keys of array items that the editor does not own SHALL be kept too:
extra keys on a starter, on a skill or on a context, and `skills` and `contexts` entries of a
`type` the editor does not manage, are saved as loaded.

#### Scenario: Unknown orchestrator and feature keys are kept

- **WHEN** the loaded `application_properties` has `orchestrator.custom_flag: true` and
  `features.beta: {}` and the user saves
- **THEN** the saved `orchestrator.custom_flag` SHALL be `true` and `features.beta` SHALL be
  `{}`

#### Scenario: No skills attached

- **WHEN** the user saves an application with no attached skills
- **THEN** the saved `application_properties` SHALL have no `skills` key

#### Scenario: System prompt variables are kept

- **WHEN** the loaded `orchestrator.system_prompt.variables` is `{ "team": "support" }` and
  the user changes the instructions to `"  Be brief  "` and saves
- **THEN** the saved `system_prompt` SHALL be
  `{ "type": "custom", "variables": { "team": "support" }, "content": "  Be brief  " }`

#### Scenario: Unknown top-level keys are kept

- **WHEN** the loaded `application_properties` has `my_section: { "a": 1 }` and the user
  changes the instructions and saves
- **THEN** the saved `application_properties.my_section` SHALL be `{ "a": 1 }`

#### Scenario: Unknown nested orchestrator keys are kept

- **WHEN** the loaded `orchestrator` has `max_iterations: 25`, `deployment.name: "Main"` and
  `tool_discovery: { "enabled": true }` and the user changes the model and saves
- **THEN** the saved `orchestrator` SHALL keep `max_iterations`, `tool_discovery` and
  `deployment.name`, with `deployment.deployment_id` set to the new model

#### Scenario: Deployment parameters other than temperature are kept

- **WHEN** the loaded `orchestrator.deployment.parameters` has `top_p` and `seed` and the user saves
- **THEN** the saved `parameters` SHALL still contain `top_p` and `seed` (see `application_advanced-settings` for `temperature`)

#### Scenario: Unknown skill type and item keys are kept

- **WHEN** the loaded `skills` has `{ "type": "dial-skill", "url": "skills/a", "note": "x" }` and
  `{ "type": "other-skill", "ref": "r" }`, the loaded starters have a starter with `"tag": "t"`,
  and the user saves
- **THEN** the saved `skills` SHALL contain both entries with their extra keys, and the saved
  starter SHALL still have `"tag": "t"`

### Requirement: Application type schema defaults

When the loaded application has an `applicationTypeSchemaId`, QuickApps SHALL request the schema with
`GET /api/v1/application-schemas/{id}` (`applicationsApi.getApplicationSchema({ id })`) as part of the
application load. A missing id or a failed call SHALL NOT fail the load, and the editor SHALL then behave as if
the schema had no defaults.

Schema nodes SHALL be read the standard JSON Schema way, so that a default is found wherever the schema puts it:

- a local `$ref` (`#/$defs/<name>`, a JSON Pointer into the same schema) SHALL be resolved, and the keywords
  written next to the `$ref`, `default` included, SHALL take precedence over the referenced definition;
- an `anyOf` / `oneOf` that has exactly one non-`null` branch (the way an optional object is declared, for
  example `features`) SHALL be read as that branch;
- a reference that cannot be resolved, or that is circular, SHALL be treated as a node with no default.

The editor SHALL use a schema default only for a form value the application has not stored, and only for
properties the form edits. It SHALL NOT write schema-only properties (such as `max_iterations` or
`propagate_stages`) into the saved `application_properties`. A schema default SHALL NOT mark the form dirty, and
it SHALL be persisted only when the application is saved. A default of the wrong type SHALL be ignored.

The supported properties are:

| Schema property (after resolution) | Form value |
|---|---|
| `orchestrator.deployment.default.deployment_id` | `model` |
| `orchestrator.deployment` → `parameters` → `temperature.default` | `temperature` |
| `conversation_starters` → `intro_text.default` | `introText` |
| `conversation_starters` → `auto_submit.default` | `autoSubmit` |
| `conversation_starters` → `chat_message_input_disabled.default` | `chatMessageInputDisabled` |
| `features.representation_tooling` → `add_attachment.default` | `addAttachment` |
| `features.web_fetch` → `enabled.default` | `webFetch` |

Conversation starters defaults SHALL apply only when the application has no stored `conversation_starters`
object: an object that is stored without `intro_text` means the intro text was left empty, and SHALL be read as
stored. A schema default SHALL take precedence over the editor's own fallback for the same value, and the
editor's own fallback SHALL apply for a value the schema does not provide.

#### Scenario: New app takes the schema default

- **WHEN** the application has no stored orchestrator model
- **AND** the schema default for `orchestrator.deployment` is `{ "deployment_id": "model-2" }`
- **AND** `model-2` is loaded and tool-capable
- **THEN** the `model` form value SHALL be `model-2`
- **AND** the form SHALL NOT be dirty
- **AND** a save SHALL send `deployment_id: "model-2"`

#### Scenario: Stored value wins

- **WHEN** the application stores `deployment_id: "model-3"`
- **AND** the schema default is `model-2`
- **THEN** the `model` form value SHALL be `model-3`

#### Scenario: Schema call fails or has no default

- **WHEN** the schema request fails, the application has no `applicationTypeSchemaId`, or the property has no `default`
- **THEN** the load SHALL succeed
- **AND** the form SHALL be pre-filled exactly as it is without this requirement

#### Scenario: Default beside a reference

- **WHEN** `orchestrator.deployment` is `{ "$ref": "#/$defs/DialDeploymentConfig", "default": { "deployment_id": "model-2" } }`
- **THEN** the default SHALL be `model-2`

#### Scenario: Default inside a referenced definition

- **WHEN** `features.web_fetch` is `{ "anyOf": [{ "$ref": "#/$defs/WebFetchConfig" }, { "type": "null" }] }`
- **AND** `#/$defs/WebFetchConfig.properties.enabled.default` is `false`
- **THEN** the default for `webFetch` SHALL be `false`

#### Scenario: Unresolvable or circular reference

- **WHEN** a node references `#/$defs/Missing`, or references itself
- **THEN** that node SHALL yield no default and the load SHALL succeed

#### Scenario: Temperature default

- **WHEN** the application stores no `orchestrator.deployment.parameters.temperature`
- **AND** the schema default of `temperature` is `0.2`
- **THEN** the `temperature` form value SHALL be `0.2`
- **AND** the form SHALL NOT be dirty

#### Scenario: Temperature default that is not a usable number

- **WHEN** the schema default of `temperature` is `null`, a string, or a number outside `0`–`1`
- **THEN** it SHALL be ignored and the `temperature` form value SHALL be the editor's own default

#### Scenario: Conversation starters defaults for an app without them

- **WHEN** the application has no stored `conversation_starters`
- **AND** the schema defaults are `intro_text: "Select an action"`, `auto_submit: true`, `chat_message_input_disabled: false`
- **THEN** the form values SHALL be `introText: "Select an action"`, `autoSubmit: true`, `chatMessageInputDisabled: false`
- **AND** the form SHALL NOT be dirty

#### Scenario: Stored conversation starters are not overridden

- **WHEN** the application stores `conversation_starters` without `intro_text`
- **AND** the schema default for `intro_text` is `"Select an action"`
- **THEN** the form value `introText` SHALL stay empty

#### Scenario: Schema-only properties are not saved

- **WHEN** the schema declares defaults for `max_iterations` and `propagate_stages`
- **THEN** a save SHALL NOT contain them unless the application already stored them

### Requirement: Quick app is the single writer of a save

A save SHALL send exactly one update request to chat-api per save trigger that passes the gating
(see "Save request"), carrying both the General-step fields (when `general` is present) and the
configuration. QuickApps SHALL NOT rely on a second write by the host to persist either.

After a successful save with a `general` payload, the General-step values held by `EditorClient`
SHALL be those the payload carried, so that a later save without `general` (every auto-save)
sends them and not the values loaded when the editor opened. This holds for a save the host
triggered for any reason, including a preview.

#### Scenario: Save with general sends one request

- **WHEN** a TriggerSave with `general` passes the gating
- **THEN** QuickApps SHALL send one update request containing the General-step fields and
  `applicationProperties`, and no other write for this save

#### Scenario: Auto-save after a save with general

- **WHEN** a TriggerSave with `general.name` `"Renamed"` and `general.description` `"New text"`
  succeeds, the user then changes the instructions, and a TriggerAutoSave runs
- **THEN** the auto-save's update request SHALL carry `name` `"Renamed"` and `description`
  `"New text"`, not the values loaded when the editor opened

#### Scenario: Save without general keeps stored General values

- **WHEN** a save without `general` runs after the application was loaded and not yet saved
- **THEN** the update request SHALL carry the loaded General-step values unchanged
