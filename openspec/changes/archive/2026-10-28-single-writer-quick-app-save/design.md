# Design

## Context

See `proposal.md` for motivation. Current behavior:

- QuickApps (`EditorClient.handleSave`, `src/components/EditorClient/EditorClient.tsx:209`) builds
  the config, calls `saveDialApp` (`src/utils/dial-client.ts:393`) once, then replaces
  `appState.app` with what it sent, including the General-step values and display version. That
  held state is the baseline for auto-saves, `hasChanges` and Reset.
- A save without `general` (every auto-save) sends the held General values, so the held state
  must follow every save that carried a different `general`.
- ai-dial-chat (`QuickAppSetup`) does the following today:
  - `save(values)` posts `TRIGGER_SAVE` with `general`, then calls `reassertSkillsSupport`.
  - `startPreview(values)` posts `TRIGGER_SAVE` **without** `general`, then calls
    `reassertSkillsSupport`.
  - chat never posts `TRIGGER_AUTO_SAVE` or `RESET`.
- chat-api `updateApplication` forces `features.skills_supported: true` for Quick Apps on every
  update, with or without `features` in the body (`applications.service.ts`, `isQuickAppSchema`).

## Goals / Non-Goals

**Goals:**

- One write per save, owned by QuickApps, with the host supplying inputs only.
- No window in which QuickApps' held General can differ from what chat last saved.

**Non-Goals:**

- Moving General editing into QuickApps, or changing message shapes.
- Opening the editor without an `id` (separate change; will build on this one).
- Changing chat-api's `skills_supported` rule.

## Decisions

### D1. The host sends `general` with every manual save

Preview must carry the same `general` as Save. Then QuickApps' one request writes the user's
edits, and its post-save state matches chat's form. Alternative: let QuickApps ask the host for
`general` when it is missing. Rejected: it needs a new round trip and message.

### D2. Remove the host's second update, do not replace it

`reassertSkillsSupport` exists only to re-trigger the backend flag, and QuickApps' own update
already does that. Alternative: keep it but skip it when the first save succeeded. Rejected:
dead code with a misleading justification in two specs.

### D3. No QuickApps code change; pin the contract with tests

`handleSave` already stores the saved General (`_rawForSave` from `effectiveGeneral`) and
`saveDialApp` already sends it on the next save. Adding logic would duplicate that. The change
adds tests for the two scenarios in the delta spec, so the behavior the host now depends on
cannot regress silently.

### D4. Spec deltas are additive

Both deltas use ADDED requirements. "Save request" is being modified by
`keep-translations-on-save-without-general`; a separate requirement avoids a conflict between the
two changes.

## Risks / Trade-offs

- [Older chat builds still send a second update] → harmless: same values, same endpoint. QuickApps
  needs no coordination; roll chat and QuickApps in either order.
- [Chat's Preview now sends `general` for a form with validation errors] → the metadata form
  validates before `handlePreviewStart`; QuickApps still validates its own form and posts
  `SAVE_ERROR`.
- [A quick app that fails to save leaves chat's metadata unsaved] → same as Save today; the host
  shows the error and nothing was written (previously config could be saved while the second
  write failed, which this removes).
- [`skills_supported` relies on chat-api forever] → accepted by chat's own spec; tracked there as
  a coupling, not here.

## Migration Plan

1. Land this change (specs and tests) in QuickApps. It is safe on its own.
2. Land the ai-dial-chat change; verify one `PATCH` per Save and per Preview in the network log.
3. Rollback: revert the chat commit to restore the second write; QuickApps needs no revert.
