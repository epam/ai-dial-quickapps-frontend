## Why

The Add-ons rows were redesigned so the Add button sits in each row header next to the title. In that redesign the Agents & Toolsets JSON toggle no longer has a place, and the team decided to drop the JSON view entirely rather than keep a hidden, unreachable editor mode. The current spec still requires the "existing JSON-view affordance" and an always-visible row description, so it no longer matches the intended behavior.

## What Changes

- **BREAKING (UX):** Remove the Agents & Toolsets JSON view: the JSON toggle, the JSON editor (incl. fullscreen), the Save JSON / Discard actions, the discard confirmation popup, and JSON validation errors. Users can no longer hand-edit `tool_sets` as JSON in the editor.
- Each Add-ons row (Skills, Agents & Toolsets) shows its Add button in the row header, aligned with the row title.
- The row description is shown only while the row has no selections; once at least one item is selected, the description is replaced by the content window.
- Saved `tool_sets` keep round-tripping unchanged. Inline toolsets without a `deployment_id` (previously only addable through JSON) that already exist in an application stay visible as chips and are preserved on save, via the existing `getQuickApp2Toolsets` `otherToolsets` path (`src/form/quickApp2Form.ts:402`).
- Remove now-unused form fields (`isJsonView`, `agentsAndToolsetsJson`) and their JSON validation from the form schema, and remove i18n keys only used by the JSON view.

Non-goals:
- No change to how chips, the selection modals, agent transport configuration, or toolset sign-in work.
- No change to the saved `application_properties` shape.
- No replacement JSON or "advanced" editor.

Acceptance criteria:
- No JSON toggle, JSON editor, Save JSON, or Discard control is rendered anywhere in the Add-ons section, in any editor state.
- Add buttons for Skills and Agents & Toolsets are in their row headers, open the same selection modals as before, and are disabled in read-only mode.
- A row shows its description only while empty.
- Loading and re-saving an app whose `tool_sets` contain MCP, DIAL app, DIAL deployment, inline/unknown toolsets and the code interpreter produces the same `tool_sets` content.
- `npm run typecheck`, `npm run lint` (source), and `npm test` pass.

Alternatives considered: keeping the JSON view behind a different entry point (e.g. a row overflow menu) was rejected by product decision; keeping the code but unreachable was rejected as dead code that the spec would have to describe as a known limitation.

## Capabilities

### New Capabilities

_None._

### Modified Capabilities

- `application_editor-layout`: Agents & Toolsets no longer offers a JSON-view affordance; Add actions live in the row header; row descriptions are shown only for empty rows.

## Impact

- Code: `src/components/AddOns/AddOnsSection.tsx`, `src/components/AddOns/AddOnRow.tsx`, `src/components/ContextAndTools/AgentsAndToolsetsField.tsx`, `src/components/QuickApp2Form.tsx`, `src/form/quickApp2Form.ts`, related tests.
- i18n: no new strings. Removes JSON-view-only keys (`quickAppEditor`: `SaveJSON`, `JSON`, `SwitchToMarketplaceView`, `Discard`, `DiscardChanges`, `DiscardJsonChangesConfirmation`, `ContinueEditing`; `common`: `JSON`, `SwitchToJsonView`, `PublicAppCannotBeEdited`, `ShouldBeAnArray`, `ShouldBeAValidJSON`) after confirming no other usage.
- RTL: none beyond existing behavior — the row header uses flex `justify-between` with no physical-direction classes.
- No auth, host-integration, or chat-api changes; no new requests.
- Rollback: revert the change commits; the saved config format is unchanged, so no data migration is needed in either direction.
