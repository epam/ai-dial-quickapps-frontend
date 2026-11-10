# Tasks

## 1. Shared resolution

- [x] 1.1 Add `AddOnResolution` enum (`src/types/add-on-kind.ts`) and `getAddOnResolution(entry, entity, isCatalogReady)` in `src/utils/get-add-on-kind.ts` (Catalog / Inline / NotFound; catalog readiness stays with `getEntityStatus`)
- [x] 1.2 Re-implement `getEntityStatus` on top of it without changing its output; keep existing tests green
- [x] 1.3 Unit tests for the helper: found entity, inline REST config, `toolsets/…` missing, `applications/…` missing, (readiness stays in `getEntityStatus`, covered by its existing tests)

## 2. Inline details mapper

- [x] 2.1 Add `mapInlineToolsetToCatalogItem` (`src/utils/map-inline-toolset-to-catalog-item.ts`): `open_ai_tool.function` → `ToolDefinition` (name, description, `inputParams` from `parameters.properties` / `required`, `const` params skipped)
- [x] 2.2 Unit tests: the Weather REST sample, tool without function name, empty `tools`, non-object config

## 3. Popup and list

- [x] 3.1 `ToolsetsList`: find the open entry's saved `tool` config and pass `inlineConfig` to `ToolsetDetailsPopup`
- [x] 3.2 `ToolsetDetailsPopup`: branch on resolution — Inline with tools → local item with Tools tab, no fetch, no credentials; Inline without tools → `ToolsetsInlineNoDetails`; NotFound → `ToolsetsUnavailable`
- [x] 3.3 Confirm no About tab appears for an inline item with empty description/topics (hide it if the catalog adds it)
- [x] 3.4 Add `ApplicationEditorI18nKeys.ToolsetsInlineNoDetails` and the `en.json` string

## 4. Tests

- [x] 4.1 `ToolsetDetailsPopup.test.tsx`: inline with tools, inline without tools, real missing `toolsets/…` id, no chat-api request for inline
- [x] 4.2 `ToolsetsList.test.tsx`: opening an inline item hands its saved config to the popup and shows no error status
- [x] 4.3 `AgentDetailsPopup` test: a missing `deployment_id` application still shows the agent unavailable message
- [x] 4.4 RTL check: no new physical-direction classes

## 5. Specs and docs

- [x] 5.1 Update the "removed JSON editor" wording in "Toolset entries of the add-ons value" and in `get-add-on-kind.ts` comments (the JSON editor exists, see `application_json-editor`)
- [x] 5.3 Sync/archive the delta into `openspec/specs/toolsets_selection/spec.md` (`openspec-sync-specs` / `openspec-archive-change`) after review
- [x] 5.2 Run `npm run lint` and `npm run build`
