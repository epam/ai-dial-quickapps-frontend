## Why

Issue #320: a REST API toolset added through the JSON editor works in chat and is listed in the Add-ons row, but opening its details shows "This toolset is no longer available". The toolset is not a DIAL entity — it only exists as an inline config in `tool_sets` — so the popup finds no catalog entity and reports it as deleted. The Toolsets row already treats such entries as expected (`isMissingDeploymentId`, no error), so the row and the popup contradict each other.

## What Changes

- Add-on entries without a catalog entity are classified into three cases by one shared helper: **Catalog** (entity found), **Inline** (no entity, not a `toolsets/…`/`applications/…` id, and the entry carries its own saved config), **NotFound** (a real id missing from the catalog). The row status and the details popup both use it.
- The toolset details popup receives the entry's saved inline config. For an **Inline** entry it shows the entry name and a **Tools** tab built from the config's `tools[].open_ai_tool.function` (name, description, input parameters) — no chat-api request is made.
- When an inline config has no tools to show (e.g. `dial-deployment-tool-set` with `tools: []`), the popup shows a new message: "This toolset is defined in the application's JSON configuration and has no catalog details."
- "This toolset is no longer available" is shown only for **NotFound** entries.
- Delete still detaches the entry; credentials action and chat-api calls stay off for inline entries.
- The saved `tool_sets` shape and the `addOns` form value do not change.
- The agent details popup was checked: an inline `dial-deployment-simple` tool always carries a `deployment_id`, which is a real application id, so a missing one is genuinely NotFound. No agent-side change is needed beyond using the shared helper's result (verified in tasks).

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `toolsets_selection`: "Toolset details popup" — the unavailable scenario now applies only to NotFound entries; new scenarios for inline toolsets with and without tools. "Toolset entries of the add-ons value" — the classification text references the shared three-way resolution.

## Impact

- `src/utils/get-add-on-kind.ts` (or a new `get-add-on-resolution.ts`) — shared resolution helper; `src/utils/get-entity-status.ts` reuses it.
- `src/components/Toolsets/ToolsetsList/ToolsetsList.tsx` — passes the entry's inline config to the popup.
- `src/components/Toolsets/ToolsetDetailsPopup/ToolsetDetailsPopup.tsx` — Inline branch.
- `src/utils/map-inline-toolset-to-catalog-item.ts` (new) — inline config → `CatalogItem` with `details.tools`.
- `src/constants/translation-keys.ts`, `src/i18n/locales/en.json` — `ToolsetsInlineNoDetails`.
- Tests: popup, mapper, helper, list.
- `openspec/specs/toolsets_selection/spec.md` (via delta).
