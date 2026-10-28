## MODIFIED Requirements

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
each successful save.

chat-api requires `name` and replaces the stored `displayName` with what the request composes
(`composeLocalizedFields`): a plain string unless `locales` is sent. So, without a `general` payload,
QuickApps SHALL send the held translations back:

- `name` and `description`: the `en` text of the held values, falling back as
  `getLocalizedText` does;
- `locales`: one entry per other language in the held `displayName` or `description`
  dictionaries, built with `decomposeLocalizedFields` and `composeLocalePayload` from
  `@epam/ai-dial-chat-hooks/utils` (the helpers the host uses for its own saves), with `en` as
  the primary locale;
- `primaryLocale: "en"` only when `locales` is sent. `en` is the host's `PRIMARY_LOCALE` and
  chat-api's default.

When both held values are plain strings, or absent, QuickApps SHALL send neither `locales` nor
`primaryLocale`.

`handleSave` SHALL resolve to `true` once the update request succeeds,
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

#### Scenario: Auto-save keeps stored translations

- **WHEN** the held `displayName` is `{ "en": "Support bot", "fr": "Bot d'assistance" }` and an
  auto-save runs
- **THEN** the update request SHALL carry `name: "Support bot"`, `primaryLocale: "en"` and
  `locales: [{ "language": "fr", "name": "Bot d'assistance" }]`

#### Scenario: Auto-save of an untranslated app

- **WHEN** the held `displayName` is the plain string `"Support bot"` and an auto-save runs
- **THEN** the update request SHALL carry `name: "Support bot"` and SHALL NOT carry `locales`
  or `primaryLocale`

#### Scenario: Auto-save after a General-step save

- **WHEN** a TriggerSave with `general.iconUrl` `"https://example.com/new.png"` succeeds, the
  user then changes the instructions, and a TriggerAutoSave runs
- **THEN** the auto-save's update request SHALL carry `iconUrl: "https://example.com/new.png"`,
  not the icon URL loaded when the editor opened
