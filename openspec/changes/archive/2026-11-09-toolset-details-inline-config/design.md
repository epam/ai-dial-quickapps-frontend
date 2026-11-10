## Context

`ToolsetsList` resolves each id through `useAddOnEntityMap` and passes the popup only `toolsetId` and the catalog entity. `ToolsetDetailsPopup` treats `toolset == null` as "no longer available". The row status uses `getEntityStatus`, which already separates `isMissingDeploymentId` (inline, no error) from `isNotFoundInCatalog` (real id, error). Inline configs live in `AddOnEntry[AddOnSchemaKeys.tool]` (from `getAddOnsFormValue`), keyed by the toolset `name`.

The inline REST config has `type: "rest-api"`, which falls into `UnknownToolset`, with `tools[].open_ai_tool.function` carrying `name`, `description` and a JSON-schema `parameters` object (`properties`, `required`). Constant parameters (`const`, `type: null`) are fixed by the config and not chosen by the model.

## Goals / Non-Goals

**Goals:** one source of truth for "inline vs not found"; a useful details view for inline toolsets; an accurate message otherwise.
**Non-Goals:** editing inline configs, showing auth or Overview data for them, changing the saved shape, resolving details from the REST endpoint.

## Decisions

1. **Shared resolution helper** `getAddOnResolution(entity, id)` in `src/utils/get-add-on-kind.ts` returning an `AddOnResolution` string enum (`Catalog`, `Inline`, `NotFound`; no Pending case — catalog readiness stays in `getEntityStatus`). `getEntityStatus` keeps its signature but is implemented on top of it, so the row and popup cannot diverge. `Inline` = no entity and not a `toolsets/…`/`applications/…` id; the popup then uses the entry's saved config if any.
2. **Pass the entry, not the id, to the popup.** `ToolsetsList` looks up the `AddOnEntry` for the open id and passes `inlineConfig?: Record<string, unknown>` (the saved `tool`). The popup computes the resolution itself from `toolset` and `inlineConfig`; no new context.
3. **Mapper** `mapInlineToolsetToCatalogItem(config, name)` in `src/utils/map-inline-toolset-to-catalog-item.ts`: returns a `CatalogItem` (type Toolset, empty description/topics, `lastUsed: ''`) with `details.tools.tools` mapped to `ToolDefinition[]`. Parameters come from `open_ai_tool.function.parameters.properties`, skipping properties with a `const` (fixed by the config), `isRequired` from `required`, `type` from the schema (`'string'` fallback). Tools without a function name are skipped. Returns no `details` when no tool survives.
4. **No fetch for inline.** `useEntityDetails` is called with `undefined` for inline entries so no request is made; the item is built locally with `details` attached.
5. **Message vs tabs.** Inline with tools renders the item through the existing `AddOnDetailsPopup` (catalog tab rules show only Tools when only `details.tools` exists and About is empty — to confirm: if the catalog always adds About, pass an `appTabs`-only layout or hide About when description and topics are empty). Inline without tools passes `unavailableText = ToolsetsInlineNoDetails`. NotFound keeps `ToolsetsUnavailable`.
6. **i18n.** New enum member `ApplicationEditorI18nKeys.ToolsetsInlineNoDetails` and an `en.json` string beside `toolsets.unavailable`. No duplicate of an existing string.
7. **Agent popup.** Inline `dial-deployment-simple` tools always have a `deployment_id`, i.e. a real application id, so a missing one is NotFound — unchanged. Only a test asserting that is added.

## Risks / Trade-offs

- `getCatalogDetailsTabs` may add an About tab for an item with empty description; if so the popup hides it for inline items (decision 5). Verify during implementation.
- A hosted toolset id that no longer exists but matches an entry with saved config could classify as Inline only if it is not a `toolsets/…` id — by design, ids of that form stay NotFound.
- A parallel change, `toolset-picker-lists-mcp-agents`, edits `get-add-on-kind.ts` row membership; rebase conflicts are likely in the same file but touch different functions.

## Open Questions

- Should the Tools tab also show constant (`const`) parameters, marked as fixed? Defaulting to hidden.
