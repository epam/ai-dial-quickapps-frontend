## Why

`docs/TECH_DEBT.md` ("Themes") says `setTheme` has no caller. QuickApps has no theme picker. The
host, ai-dial-chat's `AppEditorIframe`, always passes its current theme in the iframe URL
(`AppsEditorIframeQuery.Theme`). QuickApps runs on its own origin, so nothing else ever writes
`localStorage["dial-theme"]`. The stored-choice step in theme selection and the setter are
therefore dead code that a spec keeps describing.

## What Changes

- Remove `setTheme` from `ThemeContext`, along with the `localStorage` read and write.
- The active theme id becomes the `theme` URL parameter, or `light`. `system` and the `popstate`
  re-read are unchanged.

## Capabilities

### Modified Capabilities

- `theming`:
  - "Active theme id is chosen from the URL, then the stored choice, then light" is renamed to
    "… from the URL, then light";
  - "The `theme` query parameter is re-read on history navigation";
  - "ThemeContext exposes a memoised value and an explicit theme setter" is renamed to
    "ThemeContext exposes a memoised value".

## Impact

- **Code:** `src/context/ThemeContext.tsx` and its tests. `setTheme` has no other consumers.
- **Behaviour:** the only change is that a `dial-theme` value that some earlier tool left in this
  origin's storage no longer applies when the URL has no `theme`. In that case the theme is
  `light`.
- **Host integration, i18n, RTL:** none.
- **Rollback:** revert the commit.
