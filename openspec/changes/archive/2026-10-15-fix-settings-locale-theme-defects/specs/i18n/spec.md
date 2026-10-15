## MODIFIED Requirements

### Requirement: Recombining host locale entries

When a TriggerSave carries a `general` payload, `EditorClient` SHALL rebuild the full
`LocalizedText` for `name` and `description` with
`buildLocalizedText(primaryValue, primaryLocale, locales, field)` before comparing the save
against the stored values (`hasQuickAppChanges`). The result SHALL be the value chat-api stores
for the same request (`composeLocalizedFields` in ai-dial-chat's chat-api):

- When `locales` is absent or empty, the function SHALL return the primary value unchanged,
  which is a plain string or `undefined`, whether or not `primaryLocale` is present.
- Otherwise it SHALL build a dictionary. The primary value, when present, goes under
  `primaryLocale`, or under `en` when `primaryLocale` is absent. Then each `locales` entry's
  value for `field` goes under its `language`, but only when that value is a non-empty string.
- It SHALL return the dictionary when it has at least one entry, and `undefined` otherwise.

This recombination is used only for change detection. What the save request sends is specified
in `application_editing` ("Save persists host-supplied General-step fields").

#### Scenario: Primary value with other locales

- **WHEN** `name` is `"Hello"`, `primaryLocale` is `en`, and `locales` holds `fr` → `"Bonjour"`
  and `de` → `"Hallo"`
- **THEN** the rebuilt name SHALL be `{ en: "Hello", fr: "Bonjour", de: "Hallo" }`

#### Scenario: Other locales without a primary locale

- **WHEN** `name` is `"Hello"`, `primaryLocale` is absent, and `locales` holds `fr` → `"Bonjour"`
- **THEN** the rebuilt name SHALL be `{ en: "Hello", fr: "Bonjour" }`

#### Scenario: Primary locale without other locales

- **WHEN** `name` is `"Hello"`, `primaryLocale` is `en`, and `locales` is `[]` or absent
- **THEN** the rebuilt name SHALL be the plain string `"Hello"`

#### Scenario: Locale entry without the field

- **WHEN** rebuilding `description` and one `locales` entry has no `description`, or an empty one
- **THEN** that entry's language SHALL NOT appear in the result

#### Scenario: No description in any locale

- **WHEN** rebuilding `description`, the primary value is `undefined` and no `locales` entry has
  a non-empty `description`
- **THEN** the result SHALL be `undefined`

#### Scenario: Untranslated app

- **WHEN** neither `primaryLocale` nor `locales` is present
- **THEN** the result SHALL be the primary value as given
