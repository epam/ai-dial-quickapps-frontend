## ADDED Requirements

### Requirement: Editor UI text ships in English only

QuickApps SHALL initialise a single i18next instance (`src/i18n/index.ts`) once per page, with
`lng: 'en'`, `fallbackLng: 'en'`, interpolation escaping disabled (React escapes output), and
resources for one language, `en`, split into two namespaces: `quickAppEditor`
(`src/i18n/locales/quick-app-editor.json`) and `common` (`src/i18n/locales/common.json`).
QuickApps SHALL NOT choose the UI language from the host, a URL query parameter, the browser
language, or a `postMessage` payload: no code path calls `changeLanguage`, so the active
language is always `en`. No other locale file ships, so no right-to-left locale is available
to users today. If the active language is ever changed to one without resources, every string
SHALL resolve through the `en` fallback.

The i18next instance is the state owner. It is provided to the React tree by `I18nProvider`
(`src/components/I18nProvider/I18nProvider.tsx`), mounted in `src/main.tsx` around the router,
so the root editor route and the `/signin/complete` page both have it. No context of this repo
holds the language.

#### Scenario: Editor opened by a host

- **WHEN** a host embeds QuickApps with any query parameters
- **THEN** the active i18next language SHALL be `en`
- **AND** every user-visible string from the `quickAppEditor` and `common` namespaces SHALL
  render in English

#### Scenario: Language without resources

- **WHEN** the active language is changed to a language with no resources, such as `ar`
- **THEN** each translation SHALL resolve to its `en` value

### Requirement: Translation keys are the English source text

Every key in `quick-app-editor.json` and in the top level of `common.json` SHALL equal its
English value. Components SHALL refer to keys through the string enums in
`src/constants/i18n.ts` (`QuickAppEditorI18nKeys`, `CommonI18nKeys`, and
`DialFileManagerI18nKeys`), never through inline literals. The labels passed to the DIAL
file manager SHALL live under the nested `dialFileManager` object of the `common` namespace
and be addressed with dot-separated keys such as `dialFileManager.empty`. The namespace names
SHALL be the `Translation` string enum in `src/types/translation.ts`.

#### Scenario: Key has no translation

- **WHEN** a component asks for a key that i18next cannot resolve
- **THEN** the key text SHALL be rendered, which for a source-text key is the English copy

### Requirement: Translation hook

Components SHALL read translations through `useTranslation(namespace)` in
`src/hooks/use-translation.ts`, which wraps `react-i18next`'s hook for that one namespace and
returns `{ t, language }`. `t(key, options?)` SHALL pass the interpolation options to i18next
only when they are given, and SHALL return the key itself when i18next returns nothing.
`language` SHALL be i18next's active language. The returned object SHALL be memoised
(`useCallback` for `t`, `useMemo` for the result) and SHALL keep its identity across renders
until `t` or the language changes, so consumers can safely list it as a dependency.

#### Scenario: Interpolated message

- **WHEN** a component calls `t(key, { count: 2 })`
- **THEN** i18next SHALL receive the key together with those options

#### Scenario: Plain message

- **WHEN** a component calls `t(key)` without options
- **THEN** i18next SHALL receive only the key

#### Scenario: Re-render with nothing changed

- **WHEN** a component using the hook re-renders and neither the namespace's `t` nor the
  language has changed
- **THEN** the hook SHALL return the same object as on the previous render

### Requirement: Document language and direction follow the active language

`I18nProvider` SHALL set `document.documentElement.lang` to the active i18next language and
`document.documentElement.dir` to `i18n.dir(language)` when it mounts, and again on every
i18next `languageChanged` event. It SHALL stop listening for that event when it unmounts.
Because the active language is always `en` (see "Editor UI text ships in English only"), the
document SHALL be `lang="en"` and `dir="ltr"` in every shipped build. The static
`<html lang="en">` in `index.html` applies only until the provider mounts.

#### Scenario: Editor mounts

- **WHEN** `I18nProvider` mounts with the active language `en`
- **THEN** `<html>` SHALL have `lang="en"` and `dir="ltr"`

#### Scenario: Language changes to a right-to-left language

- **WHEN** the active language changes to `ar` while the provider is mounted
- **THEN** `<html>` SHALL have `lang="ar"` and `dir="rtl"`

#### Scenario: Language changes back to a left-to-right language

- **WHEN** the active language changes from `ar` to `en` while the provider is mounted
- **THEN** `<html>` SHALL have `lang="en"` and `dir="ltr"`

#### Scenario: Provider unmounted

- **WHEN** the language changes after `I18nProvider` has unmounted
- **THEN** `<html dir>` SHALL NOT change

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
`en`, falling back to the entity id, and SHALL flatten model and toolset descriptions the same
way, leaving them unset when no text is usable. Editor surfaces that display an add-on or
model name (selected model card, add-on lists, add-on details, catalog pickers, and the `name`
of agent (DIAL app) toolset entries written by `buildQuickApp2Config`) SHALL pass the name through
`getLocalizedText` with the hook's active `language` and the entity id as the fallback.

#### Scenario: Model with a translated name

- **WHEN** chat-api returns a model whose `displayName` is `{ en: "GPT", fr: "GPT FR" }`
- **THEN** the editor SHALL show `"GPT"`

#### Scenario: Model without a usable name

- **WHEN** chat-api returns a model with no usable `displayName`
- **THEN** the editor SHALL show the model id

### Requirement: Recombining host locale entries

When a TriggerSave carries a `general` payload, `EditorClient` SHALL rebuild the full
`LocalizedText` for `name` and `description` with
`buildLocalizedText(primaryValue, primaryLocale, locales, field)` before comparing the save
against the stored values (`hasQuickAppChanges`). The function SHALL put the primary value
under `primaryLocale` when both are present, then add each `locales` entry's value for `field`
under its `language` when that value is present, and SHALL return the dictionary when it has
at least one entry. Otherwise it SHALL return the primary value unchanged, which is a plain
string or `undefined`. This recombination is used only for change detection. What the save
request sends is specified in `application_editing` ("Save persists host-supplied General-step
fields").

#### Scenario: Primary value with other locales

- **WHEN** `name` is `"Hello"`, `primaryLocale` is `en`, and `locales` holds `fr` → `"Bonjour"`
  and `de` → `"Hallo"`
- **THEN** the rebuilt name SHALL be `{ en: "Hello", fr: "Bonjour", de: "Hallo" }`

#### Scenario: Locale entry without the field

- **WHEN** rebuilding `description` and one `locales` entry has no `description`
- **THEN** that entry's language SHALL NOT appear in the result

#### Scenario: Untranslated app

- **WHEN** neither `primaryLocale` nor `locales` is present
- **THEN** the result SHALL be the primary value as given
