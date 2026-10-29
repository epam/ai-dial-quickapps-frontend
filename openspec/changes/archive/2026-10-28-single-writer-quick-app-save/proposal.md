## Why

Issue #146 ("Rethink how save flow is implemented"): a Quick App save writes twice. QuickApps
sends its `PATCH /api/v1/applications/{id}` on `TRIGGER_SAVE`, then ai-dial-chat
(`QuickAppSetup.reassertSkillsSupport`) sends a second `PATCH` with the General-step values
once `SAVE_SUCCESS` arrives.

The second write was added so chat-api re-forces `features.skills_supported: true`. That reason
no longer holds: chat-api's `updateApplication` forces the flag on every Quick App update
(`ApplicationsService`, `isQuickAppSchema`), including the one QuickApps itself sends through the
same endpoint.

The second write also hides a gap in the contract. Chat's Preview triggers the save **without**
`general` (`startPreview` → `runSave()`), so QuickApps saves with the values it loaded and the
second `PATCH` is what actually writes the user's General edits. QuickApps' held General then
stays stale, and the next dirty auto-save (30 s, never carries `general`) can write the old
`name`, `description`, `iconUrl` and `topics` back over them.

## What Changes

- Make QuickApps the single writer of a Quick App save. The host sends `general` with every
  manual save, `TRIGGER_SAVE` from Save and from Preview alike, and does not issue its own
  update after `SAVE_SUCCESS`.
- Document that contract in `host-integration` (inbound messages) and `application_editing`
  (save persists General-step fields). QuickApps already behaves this way when `general` is
  present; the change states the host's obligations and pins them with tests.
- Pin the consequence QuickApps already implements: after a save with `general`, the held
  General is that payload, so a later auto-save without `general` does not revert it.
- Host-side work (out of this repo, tracked in the tasks): remove `reassertSkillsSupport` from
  ai-dial-chat's `QuickAppSetup`, pass `general` from `startPreview`, update chat's
  `app-editor-flow` and `applications-write-api` specs.
- Not in scope: opening the editor without an application `id` (separate change); the
  chat-api `skills_supported` rule itself.

No QuickApps request shape, message envelope or UI changes.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `host-integration`: "Inbound message contract" gains the host's save obligations: `general`
  accompanies every manual save, and the host does not write the application again after a
  save outcome.
- `application_editing`: "Save persists host-supplied General-step fields" states that
  QuickApps is the only writer, and adds the scenario that a save with `general` followed by an
  auto-save keeps those values.

## Alternatives considered

1. **Keep the second write (baseline).** Safe, but two requests per save, a failure window
   between them (config saved, UI reports failure) and the stale-General bug above.
2. **Host sends `general` always, drops the second write (chosen).** One request. Needs no
   QuickApps protocol change; the host change is small.
3. **QuickApps re-reads the application after the host writes.** Keeps two writers and adds a
   request; rejected.
4. **Move General editing into QuickApps.** The cleanest ownership, but a large UI and protocol
   change; belongs with the "open without id" work, not here.

## Impact

- **Code in this repo:** tests only for the pinned scenarios
  (`src/components/EditorClient/tests/EditorClient.test.tsx`, `src/utils/tests/save-dial-app.test.ts`).
  `EditorClient.handleSave` (`src/components/EditorClient/EditorClient.tsx:209`) and
  `saveDialApp` (`src/utils/dial-client.ts:393`) already hold the post-save General.
- **Specs:** the two deltas above. `README.md` and `docs/TECH_DEBT.md` need no change.
- **Cross-repo:** ai-dial-chat must ship its half; until it does, behaviour is as today.
  This is **not breaking** for QuickApps. Hosts that still send a second update keep working.
- **Host integration scrutiny:** touches the postMessage contract, but adds no message or field.
- **i18n / RTL:** no new strings, no UI. RTL impact: none.
- **Rollback:** revert the spec and test commits here; revert the chat commit to restore the
  second write.

## Acceptance criteria

- A manual save with `general` sends exactly one `PATCH` carrying the General-step fields and
  the configuration.
- After it, a dirty auto-save sends those General values, not the ones loaded on open.
- ai-dial-chat's Save and Preview each produce exactly one `PATCH` to the application.
