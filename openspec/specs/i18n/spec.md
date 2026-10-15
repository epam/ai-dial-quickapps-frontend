# Internationalisation Specification

## Purpose

How the editor's UI text is localised and how localized entity text (`LocalizedText`) is
resolved. Only English ships today, so the document direction is always `ltr`; the RTL coding rules
in `.claude/rules/rtl.md` keep the UI ready for an RTL locale.

## Requirements

### Requirement: Editor UI text ships in English only

QuickApps SHALL initialise a single i18next instance once per page in `src/i18n/config.ts`,
imported for its side effects by `src/main.tsx` before the app renders. The setup SHALL match
ai-dial-chat's `apps/chat/src/i18n/config.ts`:

- `i18next-browser-languagedetector` with detection order `['localStorage', 'navigator']`,
  caching to `localStorage`;
- `initReactI18next`;
- `fallbackLng: 'en'`;
- interpolation escaping disabled, because React escapes output;
- resources for one language, `en`, in the default `translation` namespace, loaded
  statically from `src/i18n/locales/en.json`.

QuickApps SHALL NOT take the UI language from the host, a URL query parameter or a
`postMessage` payload. It SHALL NOT render a language selector, and no code path calls
`changeLanguage`. Only `en` ships, so whatever language is detected, every string SHALL
resolve through the `en` fallback, and `i18n.resolvedLanguage` SHALL be `en`. No
right-to-left locale is available to users today.

`react-i18next` (`initReactI18next`) provides the i18next instance to the React tree. No
provider component or context of this repo holds the language, so the root editor route and
the `/signin/complete` page both see the same instance.

#### Scenario: Editor opened by a host

- **WHEN** a host embeds QuickApps with any query parameters
- **THEN** `i18n.resolvedLanguage` SHALL be `en`
- **AND** every user-visible string SHALL render in English

#### Scenario: Browser language without resources

- **WHEN** the browser language is `uk` and localStorage has no `i18nextLng`
- **THEN** each translation SHALL resolve to its `en` value
- **AND** `i18n.resolvedLanguage` SHALL be `en`

#### Scenario: Stored language without resources

- **WHEN** localStorage `i18nextLng` is `ar` at start-up
- **THEN** each translation SHALL resolve to its `en` value

### Requirement: Translation keys are semantic, grouped and typed

`src/i18n/locales/en.json` SHALL be the only locale file. Its top-level properties SHALL be
feature groups, and each group SHALL hold camelCase keys. Deeper nesting is allowed. A key is
addressed by its dot-separated path, such as `buttons.cancel` or
`dialFileManager.transferQueue.close`. Interpolation SHALL use `{{name}}` placeholders.

When the same string exists in ai-dial-chat's `en.json`, QuickApps SHALL use chat's group,
key path and English value for it. Generic strings such as Cancel, Save or Close SHALL live
once, in `buttons` or `basic`, and SHALL NOT be duplicated per feature.

Each group SHALL have a string enum in `src/constants/translation-keys.ts`, named
`<Group>I18nKeys` (for example `ButtonsI18nKeys`), whose values are the full key paths.
Components SHALL pass enum members to `t()` and to `<Trans i18nKey>`, never string literals.
A JSON key and its enum member SHALL be added in the same change.

`src/i18n/i18next.d.ts` SHALL declare `CustomTypeOptions` with `defaultNS: 'translation'` and
`resources: { translation: typeof en }`, so that `npm run typecheck` rejects a key that is not
in `en.json`.

#### Scenario: Key referenced through its enum

- **WHEN** a component renders the Cancel button
- **THEN** it SHALL call `t(ButtonsI18nKeys.Cancel)`, whose value is `buttons.cancel`
- **AND** the rendered text SHALL be "Cancel"

#### Scenario: Unknown key

- **WHEN** source code passes a key path that is not in `en.json` to `t()`
- **THEN** `npm run typecheck` SHALL fail

#### Scenario: Key has no translation at runtime

- **WHEN** i18next cannot resolve a key at runtime
- **THEN** the key path SHALL be rendered

### Requirement: Components translate through react-i18next directly

Components and hooks SHALL read translations with `useTranslation()` from `react-i18next`,
called without a namespace argument, and SHALL use `<Trans>` to put markup inside a
translated sentence. QuickApps SHALL NOT wrap `useTranslation` in a hook of its own. Code that
needs the language SHALL read `i18n.resolvedLanguage` from the hook's `i18n`.

#### Scenario: Interpolated message

- **WHEN** a component calls `t(ApplicationEditorI18nKeys.StartersRemove, { name: 'Hi' })`
- **THEN** i18next SHALL receive the key together with those options and render "Remove starter Hi"

### Requirement: Tests mock translations once

`src/test-utils/setup.ts` SHALL mock `react-i18next` for every test file, mirroring
ai-dial-chat's `test-setup.ts`:

- `useTranslation()` SHALL return one module-level object whose `t` returns the key it is
  given, and whose `i18n` has `language: 'en'`, `resolvedLanguage: 'en'` and a mocked
  `changeLanguage`;
- `Trans` SHALL render its `i18nKey`.

Individual test files SHALL NOT mock `react-i18next` again, and SHALL assert translated text
by key. Tests of `src/i18n/config.ts` itself SHALL use the real i18next, mocking only
`initReactI18next`.

#### Scenario: Component under test

- **WHEN** a test renders a component that shows `t(ButtonsI18nKeys.Cancel)`
- **THEN** the DOM SHALL contain the text `buttons.cancel`

#### Scenario: Stable translation function

- **WHEN** a component under test re-renders
- **THEN** `useTranslation().t` SHALL be the same function as on the previous render

### Requirement: Document language and direction follow the active language

`src/i18n/config.ts` SHALL set `document.documentElement.lang` to `i18n.resolvedLanguage`
(`en` when it is unset). It SHALL set `document.documentElement.dir` to `rtl` when the base
code of that language (the part before `-`) is in the set `ar`, `he`, `fa`, `ur`, and to
`ltr` otherwise. It SHALL do this once at initialisation and again on every i18next
`languageChanged` event. Because only `en` has resources, every shipped build SHALL be
`lang="en"` and `dir="ltr"`, even when the detected language is right-to-left. The static
`<html lang="en">` in `index.html` applies only until the config module runs.

#### Scenario: Start-up

- **WHEN** the config module initialises with no stored language and an English browser
- **THEN** `<html>` SHALL have `lang="en"` and `dir="ltr"`

#### Scenario: Right-to-left language without resources

- **WHEN** the detected language is `ar` and no `ar` resources exist
- **THEN** `<html>` SHALL have `lang="en"` and `dir="ltr"`

#### Scenario: Right-to-left language with resources

- **WHEN** `ar` resources are registered and the language changes to `ar`
- **THEN** `<html>` SHALL have `lang="ar"` and `dir="rtl"`

#### Scenario: Regional right-to-left code

- **WHEN** `ar` resources are registered and the resolved language is `ar-EG`
- **THEN** `<html dir>` SHALL be `rtl`

#### Scenario: Language changes back to a left-to-right language

- **WHEN** the language changes from `ar` (with resources) to `en`
- **THEN** `<html>` SHALL have `lang="en"` and `dir="ltr"`

### Requirement: Resolving localized entity text

QuickApps SHALL turn a `LocalizedText` value (a plain string or a per-language dictionary)
into one display string with `getLocalizedText(value, language, fallback)` in
`src/utils/get-localized-text.ts`. It SHALL return, in order: the value itself when it is a
non-blank string; the entry for `language` when it is non-blank; the `en` entry when it is
non-blank; the first non-blank entry in the dictionary's own order; otherwise `fallback`. A
blank (empty or whitespace-only) string SHALL count as missing at every step.

#### Scenario: Plain string

- **WHEN** the value is the non-blank string `"Hello"`
- **THEN** the result SHALL be `"Hello"` for any language

#### Scenario: Requested language present

- **WHEN** the value is `{ en: "Hello", fr: "Bonjour" }` and the language is `fr`
- **THEN** the result SHALL be `"Bonjour"`

#### Scenario: Requested language missing

- **WHEN** the value is `{ en: "Hello", fr: "Bonjour" }` and the language is `de`
- **THEN** the result SHALL be `"Hello"`

#### Scenario: Only a non-English translation is usable

- **WHEN** the value is `{ en: " ", fr: "", de: "Hallo" }` and the language is `es`
- **THEN** the result SHALL be `"Hallo"`

#### Scenario: No usable text

- **WHEN** the value is `undefined`, an empty string, or a dictionary of blank entries
- **THEN** the result SHALL be the `fallback`

### Requirement: Entity names shown in the editor

When QuickApps maps chat-api entities on load (`src/utils/dial-client.ts`), it SHALL flatten
the `displayName` of models, toolsets and the edited application with `getLocalizedText` in
`en`, falling back to the entity id. It SHALL flatten model and toolset descriptions the same
way, leaving them unset when no text is usable.

Several editor surfaces display an add-on or model name: the selected model card, add-on
lists, add-on details, catalog pickers, and the `name` of agent (DIAL app) toolset entries
written by `buildQuickApp2Config`. These surfaces SHALL pass the name through
`getLocalizedText` with `i18n.resolvedLanguage` (from `react-i18next`'s `useTranslation()`)
and the entity id as the fallback. Entity text is therefore shown in the same language as
the UI, never in a detected language that has no UI resources.

#### Scenario: Model with a translated name

- **WHEN** chat-api returns a model whose `displayName` is `{ en: "GPT", fr: "GPT FR" }`
- **THEN** the editor SHALL show `"GPT"`

#### Scenario: Browser language matches an entity translation but not the UI

- **WHEN** the browser language is `fr` and a model's `displayName` is `{ en: "GPT", fr: "GPT FR" }`
- **THEN** the editor SHALL show `"GPT"`, because the resolved UI language is `en`

#### Scenario: Model without a usable name

- **WHEN** chat-api returns a model with no usable `displayName`
- **THEN** the editor SHALL show the model id

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
