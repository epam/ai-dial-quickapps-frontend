# Proposal

## Why

The editor never enters a read-only state: `EditorClient` does not pass `isReadonly` to `QuickApp2Form` (it defaults to `false`), shared applications are editable (#208), and a read-only mode is not wanted. The specs already dropped it (change `remove-readonly-mode-specs`, PR #279). The prop is still threaded through about 20 components with dead branches, a save guard and tests for an unreachable state.

## What Changes

- Remove the `isReadonly` prop from `QuickApp2Form` and everything below it: the Add-ons section and its Skills, Toolsets and Agents rows, the Knowledge base and Conversation starters rows, the Orchestrator model section, the Attachments and Settings sections, and the shared details popups and catalog modals.
- Remove the read-only guard that skips saving in `QuickApp2Form`, and the dead branches that disabled controls, hid remove/Delete buttons or blocked modals.
- Delete the tests that only exercise the read-only state; keep every other test.
- **Not changed:** the catalog `ListView` `isReadonly` prop in the Add agent, toolset, skill and model pickers (it only drops the Favorite column), `getEntityStatusMessage`'s second parameter (a wording switch that callers pass as `true`, unrelated to editor state), and TypeScript `readonly` modifiers.
- No behaviour change for users: the removed branches were unreachable.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

None. This is a pure refactor (`skip_specs: true`); the specs already describe the always-editable editor.

## Impact

- About 20 components and 15 test files under `src/components/`, plus `src/test-utils`.
- No API, dependency, translation-key or spec changes.
