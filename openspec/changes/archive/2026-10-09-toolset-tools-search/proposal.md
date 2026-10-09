## Why

Issue #231: in a toolset's details popup, the Tools tab has no tool count and no search field, though the design shows both. The tab is the catalog's `ToolsTab`, and `@epam/ai-dial-catalog` 1.2.0-dev.337 adds both (epam/ai-dial-chat#9344). This app only needs the new version and translated strings for it.

## What Changes

- Bump the chat libs (`ai-dial-attachment-input`, `ai-dial-catalog`, `ai-dial-chat-hooks`, `ai-dial-chat-shared`, `ai-dial-skill-editor`) from `1.2.0-dev.328` to `1.2.0-dev.337`.
- `useCatalogDetailsLabels` passes `searchPlaceholder`, `searchClearLabel`, `toolCount` and `noResults` in `labels.tools`. Two new `quickAppEditor` keys: `Search tools...` and `{{count}} tools`. The other two reuse `common`'s `Clear search` and `quickAppEditor`'s `No results found`.
- `toolsets_selection`: the Tools tab shows the catalog's search field and tool count.

## Impact

- `package.json`, `package-lock.json`, `src/hooks/use-catalog-details-labels.ts`, `src/constants/i18n.ts`, `src/i18n/locales/quick-app-editor.json`.
