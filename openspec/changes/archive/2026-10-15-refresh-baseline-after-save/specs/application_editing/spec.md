## MODIFIED Requirements

### Requirement: Editor form state and dirty tracking

The editor's Settings-step values SHALL be owned by `useQuickApp2Form`
(`src/hooks/use-quick-app2-form.ts`), a reducer hook used only by `QuickApp2Form`
(`src/components/QuickApp2Form/QuickApp2Form.tsx`). Its initial values and its dirty
baseline SHALL be built by `getQuickApp2FormData` (`src/form/quickApp2Form.ts`) from the
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
- `applicationProperties` built by `buildQuickApp2Config` (`src/form/quickApp2Form.ts`)
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
