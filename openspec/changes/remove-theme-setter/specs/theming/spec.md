## RENAMED Requirements

- FROM: `### Requirement: Active theme id is chosen from the URL, then the stored choice, then light`
- TO: `### Requirement: Active theme id is chosen from the URL, then light`
- FROM: `### Requirement: ThemeContext exposes a memoised value and an explicit theme setter`
- TO: `### Requirement: ThemeContext exposes a memoised value`

## MODIFIED Requirements

### Requirement: Active theme id is chosen from the URL, then light

`ThemeProvider` SHALL pick the active theme id in this order:

1. the `theme` query parameter of the current URL (the entry-URL parameter defined by the
   `host-integration` capability), when present;
2. otherwise `light`.

The editor has no theme picker of its own: the host passes its current theme in the entry URL.
`ThemeProvider` SHALL NOT read or write a stored theme choice (`localStorage`). The context
SHALL expose this unresolved id as `selectedThemeId` (so it can be `system`).

#### Scenario: Host passes a theme in the URL

- **WHEN** the app is loaded with `?theme=dark`
- **THEN** the active theme id SHALL be `dark`

#### Scenario: No theme in the URL

- **WHEN** the app is loaded without a `theme` query parameter, whatever `localStorage` holds
- **THEN** the active theme id SHALL be `light`

### Requirement: The `theme` query parameter is re-read on history navigation

`ThemeProvider` SHALL listen for the window `popstate` event for the lifetime of the provider
and, on each one, re-read the `theme` query parameter of the current URL and use it as the
URL-supplied theme id (clearing the URL override when the parameter is gone). It SHALL remove
the listener on unmount. It SHALL NOT react to URL changes that do not fire `popstate`.

#### Scenario: History navigation changes the theme parameter

- **WHEN** the app is showing `?theme=light` and a history navigation fires `popstate` with the
  URL now carrying `?theme=dark`
- **THEN** the active theme id SHALL become `dark`

#### Scenario: History navigation removes the theme parameter

- **WHEN** a `popstate` fires and the current URL no longer has a `theme` parameter
- **THEN** the active theme id SHALL fall back to `light`

### Requirement: ThemeContext exposes a memoised value

`ThemeContext` SHALL be consumed only through `useThemeContext()`, which SHALL throw
`useThemeContext must be used inside ThemeProvider` when called outside a `ThemeProvider`. The
provider value `{ themes, selectedThemeId, currentTheme, isLoading }` SHALL be wrapped in
`useMemo`, `currentTheme` SHALL be derived with `useMemo`, and the provider component SHALL be
wrapped in `React.memo`. The context SHALL NOT offer a way to set the theme: only the URL picks
it. Theming renders no UI of its own: it adds no user-visible strings or i18n keys, and its
effect on layout is direction-agnostic (no RTL impact).

#### Scenario: Hook used outside the provider

- **WHEN** a component calls `useThemeContext()` with no `ThemeProvider` above it
- **THEN** the call SHALL throw `useThemeContext must be used inside ThemeProvider`
