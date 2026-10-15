## MODIFIED Requirements

### Requirement: Theme falls back to the built-in CSS defaults when no configuration is available

`ThemeProvider` SHALL fall back to the stylesheet defaults when `GET /api/themes` fails (network
error, a non-2xx response, or a body that is not JSON) or the parsed body has no non-empty
`themes` array: it SHALL NOT set any CSS custom property, SHALL NOT surface an error to the user,
and SHALL leave the page rendering with the fallback values built into its stylesheets (the
`var(--<name>, <default>)` fallbacks in `tailwind.config.js`). The context SHALL then expose
`themes: []` and `currentTheme: undefined`. A non-2xx response's body SHALL NOT be read as a theme
configuration. A response that settles after the provider has unmounted SHALL be discarded
without updating state.

The stylesheet defaults are the light palette, so components that pick their own light or dark
variant SHALL pick light while `currentTheme` is `undefined`. The Instructions Markdown editor
(`src/components/InstructionsSection/InstructionsSection.tsx`) SHALL use the ui-kit
`EditorThemes.dark` only when `currentTheme` is defined and its `id` is not `light`. In every
other case, including `currentTheme: undefined`, it SHALL use `EditorThemes.light`.

#### Scenario: Themes endpoint is unreachable

- **WHEN** `GET /api/themes` rejects or returns a body that cannot be parsed as JSON
- **THEN** no `--*` custom property SHALL be written to `document.documentElement`
- **AND** `isLoading` SHALL become `false`, `themes` SHALL be `[]` and `currentTheme` SHALL be
  `undefined`
- **AND** no error message SHALL be shown

#### Scenario: Themes endpoint answers with an error status

- **WHEN** `GET /api/themes` returns a non-2xx status (for example `503`), whatever its body
- **THEN** the body SHALL NOT be stored as the configuration
- **AND** `isLoading` SHALL become `false`, `themes` SHALL be `[]` and `currentTheme` SHALL be
  `undefined`

#### Scenario: Themes configuration has no themes

- **WHEN** `GET /api/themes` returns a JSON body whose `themes` is missing or empty
- **THEN** `currentTheme` SHALL be `undefined` and no `--*` custom property SHALL be written

#### Scenario: Provider unmounts before the response

- **WHEN** the provider unmounts while `GET /api/themes` is still pending
- **THEN** the response SHALL be discarded and no state update SHALL happen after unmount

#### Scenario: Markdown editor matches the fallback page

- **WHEN** no theme configuration is available, so `currentTheme` is `undefined`, and the
  resolved theme id is `dark`
- **THEN** the Instructions Markdown editor SHALL use `EditorThemes.light`

#### Scenario: Markdown editor follows a loaded dark theme

- **WHEN** `currentTheme` is the loaded `dark` theme
- **THEN** the Instructions Markdown editor SHALL use `EditorThemes.dark`
