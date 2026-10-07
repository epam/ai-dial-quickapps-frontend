## Context

The Agents & Toolsets row used to offer two editing modes, tracked in form state:

- chip view — `agentsAndToolsets` (array of `{ id, tool, isDialDeploymentTool }`), serialized by `getQuickApp2Toolsets` (`src/form/quickApp2Form.ts:357`);
- JSON view — `isJsonView` + `agentsAndToolsetsJson` (raw `tool_sets` text), validated in the schema `superRefine` (`src/form/quickApp2Form.ts:103`) and serialized by `getJsonViewToolsets` (`src/form/quickApp2Form.ts:265`).

`buildQuickApp2Config` picks one of the two based on `isJsonView` (`src/form/quickApp2Form.ts:298`). Switching between modes lived in `QuickApp2Form.tsx` (`handleSwitchToJsonView`, `handleSwitchToSimpleView`, `handleDiscardJson`) and the editor UI in `AgentsAndToolsetsField.tsx`.

After the Add-ons header redesign (Add button in `AddOnRow`, selectors driven by controlled modal state), the JSON toggle was dropped from the UI, leaving the JSON view unreachable.

## Goals / Non-Goals

**Goals:**
- Remove the JSON view and all state, validation, handlers, and strings that only exist for it.
- Keep the saved `tool_sets` content identical for apps loaded and re-saved through the chip view.
- Keep the description-only-when-empty and Add-in-header behavior covered by tests.

**Non-Goals:**
- Changing chip rendering, selection modals, agent transport configuration, or toolset sign-in.
- Changing the persisted `application_properties` shape.
- Removing the shared `LazyDialJsonEditor` usage in `MarkdownEditorContainer` (unrelated).

## Decisions

1. **Always serialize through `getQuickApp2Toolsets`.** `buildQuickApp2Config` drops the `isJsonView` branch and `getJsonViewToolsets` is deleted. This path already handles every toolset kind: MCP, DIAL app, DIAL deployment, unknown/inline (`otherToolsets`, `src/form/quickApp2Form.ts:402`) and the code interpreter flag. Alternative — keep `getJsonViewToolsets` as a raw passthrough of the loaded config — rejected: nothing could ever set the flag, so it would be dead code.

2. **Remove `isJsonView` and `agentsAndToolsetsJson` from `QuickApp2Schema` and `getQuickApp2FormData`.** No other code reads them once the UI and serializer branch are gone. Their `superRefine` JSON checks go too. Alternative — keep the fields at fixed defaults — rejected: it keeps a misleading form contract.

3. **`AgentsAndToolsetsField` keeps only chip-view concerns:** selector, entity info modal and the agent configuration modal. JSON editor, fullscreen, discard confirmation, and the `ShouldBeAnArray`/`ShouldBeAValidJSON` errors are removed, along with `AddOnsSection` props that only fed them (`agentsAndToolsetsJson`, `isJsonView`, `onJsonChange`, `onSwitchToJsonView`, `onSwitchToSimpleView`, `onDiscardJson`, and the `errors` prop if it becomes unused). The display-name indexing in `allItemsMap` (comment at `AgentsAndToolsetsField.tsx` about JSON-added toolsets) stays, because existing apps may already contain inline toolsets.

4. **i18n cleanup** removes keys from `src/constants/i18n.ts` and the locale JSON files only after a repo-wide check shows no remaining usage. No new strings are added.

## Risks / Trade-offs

- [Users lose a way to hand-edit `tool_sets` or add inline toolsets that have no catalog entry] → This is the accepted product decision. Existing inline toolsets stay visible, removable and preserved on save.
- [Round-trip differences between the old JSON passthrough and `getQuickApp2Toolsets`, e.g. ordering or the always-emitted `dial-deployment-tool-set` group] → Already the behavior of every chip-view save today, so it is not a regression. A focused unit test covers load → save for mixed `tool_sets`.
- [The form module has no tests yet] → Add `src/form/tests/quickApp2Form.test.ts` covering the round-trip and code-interpreter scenarios from the delta spec.

## Migration Plan

No data migration: the persisted format is unchanged. Ship in PR #184 together with the Add-ons header change. Rollback is a plain revert of the change commits.

## Open Questions

None.
