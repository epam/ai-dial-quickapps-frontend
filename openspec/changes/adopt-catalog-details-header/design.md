# Design

## Decisions

1. **Header in the popup header slot.** `DetailsHeader` is passed as `Popup`'s `header`; the popup header loses its own padding (`DetailsHeader` brings `px-6 py-4`) and the close control aligns to the top.
2. **Only credentials.** Passed: `texts.hasPrimaryAction: false`, `isShareVisible`, `isPublishVisible`, `isDownloadVisible` returning `false`; the item is passed with `isMyApp: false` and `isEditable: false`, because the Manage menu's Delete is gated on `isMyApp` alone. `onRequestLogout` runs the logout directly (the catalog starts an OAuth Log out only through it), with no confirmation step, as today.
3. **`useToolsetCredentials(toolset)`** returns `onLogin`, `onLogout` and `error`. OAuth posts the host request and resolves when the matching result message arrives. The promises never reject — the catalog fires OAuth login without awaiting it and its API-key popover has no error state — so failures surface through `error`, shown by the popup. API key calls `toolsetsApi` at `credentialsLevelFor(toolsetId)` (the catalog's `level` is ignored: the host app decides the level from the toolset id, as before), then `refreshToolsets`.
4. **Caption.** `texts.entityTypeLabels` maps `CatalogEntityType` to the app's translated captions. The object is built outside the JSX literal, so it type-checks against catalog 1.2.0-dev.325 (no `entityTypeLabels` yet) and takes effect from the release with #9343.
5. **Labels.** The header's credentials texts (`loginActionLabel`, `logoutActionLabel`, `apiKeyActionLabel`, `changeApiKeyActionLabel`, the popover's title, field, hint, add / delete, status and validation texts) come from `quickAppEditor`.
