## ADDED Requirements

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
(`src/utils/dialClient.ts`). No new context or hook is introduced. There is no UI change,
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
