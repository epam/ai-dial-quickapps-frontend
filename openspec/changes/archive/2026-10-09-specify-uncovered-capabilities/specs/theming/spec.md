## ADDED Requirements

### Requirement: Theme configuration is loaded once from chat-api

`ThemeProvider` (`src/context/ThemeContext.tsx`) SHALL request the theme configuration exactly
once per mount with `GET /api/themes` (the provider is mounted at the root of the app, above
every route), sent through `chatApiFetch` (`src/utils/chat-api-fetch.ts`) so the request
carries the session cookie (`credentials: 'include'`). This is a raw call, not the typed
`ThemesApi` of `@epam/ai-dial-chat-api-client`. The response body SHALL be read as a theme
configuration: a `themes` array, each entry with an `id`, a `displayName`, a `colors` map of
CSS custom-property names (without the leading `--`) to values, and an `app-logo`, plus an
`images` object. Example response:

```json
{
  "themes": [
    {
      "id": "light",
      "displayName": "Light",
      "app-logo": "logo-light.svg",
      "colors": { "bg-layer-base": "#F5F7FA", "text-primary": "#141A23" }
    },
    {
      "id": "dark",
      "displayName": "Dark",
      "app-logo": "logo-dark.svg",
      "colors": { "bg-layer-base": "#0E1117", "text-primary": "#F3F4F6" }
    }
  ],
  "images": {
    "default-addon": "default-addon.svg",
    "default-model": "default-model.svg",
    "favicon": "favicon.png"
  }
}
```

The context SHALL report `isLoading: true` until the request settles and `isLoading: false`
afterwards, whether it succeeded or failed.

#### Scenario: Themes load on start

- **WHEN** the app mounts
- **THEN** `ThemeProvider` SHALL send one `GET /api/themes` request with credentials included
- **AND** once the response body has been parsed, `isLoading` SHALL become `false` and
  `themes` SHALL expose the returned `themes` array

### Requirement: Theme falls back to the built-in CSS defaults when no configuration is available

`ThemeProvider` SHALL fall back to the stylesheet defaults when `GET /api/themes` fails (network
error or a body that is not JSON) or the parsed body has no non-empty `themes` array: it SHALL NOT
set any CSS custom property, SHALL NOT
surface an error to the user, and SHALL leave the page rendering with the fallback values built
into its stylesheets (the `var(--<name>, <default>)` fallbacks in `tailwind.config.js`). The
context SHALL then expose `themes: []` and `currentTheme: undefined`.

#### Scenario: Themes endpoint is unreachable

- **WHEN** `GET /api/themes` rejects or returns a body that cannot be parsed as JSON
- **THEN** no `--*` custom property SHALL be written to `document.documentElement`
- **AND** `isLoading` SHALL become `false`, `themes` SHALL be `[]` and `currentTheme` SHALL be
  `undefined`
- **AND** no error message SHALL be shown

#### Scenario: Themes configuration has no themes

- **WHEN** `GET /api/themes` returns a JSON body whose `themes` is missing or empty
- **THEN** `currentTheme` SHALL be `undefined` and no `--*` custom property SHALL be written

### Requirement: Active theme id is chosen from the URL, then the stored choice, then light

`ThemeProvider` SHALL pick the active theme id in this order:

1. the `theme` query parameter of the current URL (the entry-URL parameter defined by the
   `host-integration` capability), when present;
2. otherwise the value stored in `localStorage` under the key `dial-theme`, when present;
3. otherwise `light`.

The context SHALL expose this unresolved id as `selectedThemeId` (so it can be `system`).

#### Scenario: Host passes a theme in the URL

- **WHEN** the app is loaded with `?theme=dark` and `localStorage["dial-theme"]` is `light`
- **THEN** the active theme id SHALL be `dark`

#### Scenario: No theme in the URL, a stored choice exists

- **WHEN** the app is loaded without a `theme` query parameter and
  `localStorage["dial-theme"]` is `dark`
- **THEN** the active theme id SHALL be `dark`

#### Scenario: No theme in the URL and nothing stored

- **WHEN** the app is loaded without a `theme` query parameter and `dial-theme` is absent from
  `localStorage`
- **THEN** the active theme id SHALL be `light`

### Requirement: The `system` theme follows the OS colour-scheme preference

When the active theme id is `system`, `ThemeProvider` SHALL resolve it to `dark` if
`window.matchMedia('(prefers-color-scheme: dark)')` matches and to `light` otherwise
(`getOsPreferredTheme`, `src/utils/apply-theme-colors.ts`). It SHALL subscribe to that media
query's `change` event for the lifetime of the provider and re-resolve the theme when the OS
preference changes, and SHALL remove the listener on unmount.

#### Scenario: System theme with a dark OS preference

- **WHEN** the active theme id is `system` and the OS prefers a dark colour scheme
- **THEN** the theme resolved for display SHALL be `dark`

#### Scenario: OS preference changes while the app is open

- **WHEN** the active theme id is `system` and the OS preference changes from dark to light
- **THEN** the resolved theme SHALL switch to `light` without a reload

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
- **THEN** the active theme id SHALL fall back to the stored choice, or `light` when none is
  stored

### Requirement: The resolved theme's colours are applied as CSS custom properties

Once a theme configuration with a non-empty `themes` array is loaded, `ThemeProvider` SHALL
select as `currentTheme` the entry whose `id` equals the resolved theme id, or the first entry
of `themes` when none matches. Whenever `currentTheme` changes, it SHALL write every entry of
`currentTheme.colors` onto `document.documentElement` as an inline CSS custom property named
`--<key>` with the entry's value (`applyThemeColors`, `src/utils/apply-theme-colors.ts`).

#### Scenario: Matching theme is applied

- **WHEN** the resolved theme id is `dark` and the configuration contains a `dark` theme with
  `colors: { "bg-layer-base": "#0E1117" }`
- **THEN** `document.documentElement.style.getPropertyValue('--bg-layer-base')` SHALL be
  `#0E1117`

#### Scenario: Unknown theme id falls back to the first configured theme

- **WHEN** the resolved theme id is `high-contrast` and the configuration contains only
  `light` and `dark`, in that order
- **THEN** `currentTheme` SHALL be the `light` theme and its colours SHALL be applied

### Requirement: ThemeContext exposes a memoised value and an explicit theme setter

`ThemeContext` SHALL be consumed only through `useThemeContext()`, which SHALL throw
`useThemeContext must be used inside ThemeProvider` when called outside a `ThemeProvider`. The
provider value `{ themes, selectedThemeId, currentTheme, isLoading, setTheme }` SHALL be wrapped
in `useMemo`, `currentTheme` SHALL be derived with `useMemo`, `setTheme` SHALL be a stable
`useCallback`, and the provider component SHALL be wrapped in `React.memo`. Calling
`setTheme(id)` SHALL store `id` in `localStorage` under `dial-theme`, make it the active theme
id, and drop the current URL-supplied override until the next `popstate`. Theming renders no UI
of its own: it adds no user-visible strings or i18n keys, and its effect on layout is
direction-agnostic (no RTL impact).

#### Scenario: Hook used outside the provider

- **WHEN** a component calls `useThemeContext()` with no `ThemeProvider` above it
- **THEN** the call SHALL throw `useThemeContext must be used inside ThemeProvider`

#### Scenario: Explicit choice overrides the URL theme

- **WHEN** the app was loaded with `?theme=light` and `setTheme('dark')` is called
- **THEN** `localStorage["dial-theme"]` SHALL be `dark`
- **AND** the active theme id SHALL be `dark` even though the URL still carries `theme=light`

### Requirement: Entity icon references are resolved to chat-api URLs

`resolveIconUrl` (`src/utils/resolve-icon-url.ts`) SHALL turn an `iconUrl` from a model,
toolset or add-on into the URL used to render it:

- an absolute `http://` or `https://` URL (case-insensitive) SHALL be returned unchanged;
- a DIAL file reference `files/<bucket>/<path...>` SHALL become
  `GET /api/v1/files/download?bucket=<bucket>&path=<path>`, with the path re-joined by `/` and
  both values URL-encoded as query parameters;
- any other value SHALL be treated as a theme icon name and become
  `GET /api/themes/icon?iconName=<percent-encoded name>`.

Callers SHALL only call it for a non-empty `iconUrl` and SHALL leave the icon `undefined`
otherwise.

#### Scenario: Absolute icon URL

- **WHEN** `resolveIconUrl('https://cdn.example.com/icon.svg')` is called
- **THEN** it SHALL return `https://cdn.example.com/icon.svg`

#### Scenario: DIAL file icon

- **WHEN** `resolveIconUrl('files/my-bucket/icons/app.svg')` is called
- **THEN** it SHALL return `/api/v1/files/download?bucket=my-bucket&path=icons%2Fapp.svg`

#### Scenario: Theme icon name

- **WHEN** `resolveIconUrl('dial-icon')` is called
- **THEN** it SHALL return `/api/themes/icon?iconName=dial-icon`
