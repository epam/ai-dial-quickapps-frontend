## Why

Editing a Quick App 2.0's **Version** in the host's Metadata step and clicking Save
reports success, but the version change is silently dropped
([#164](https://github.com/epam/ai-dial-quickapps-frontend/issues/164), P2). The host
(ai-dial-chat) delegates the whole save to this editor and sends the new value in
`TRIGGER_SAVE.general.display_version`; the editor reads it but never forwards it to
chat-api, so `display_version` stays at its old value while `name`/`description` are
persisted.

## Problem

- `src/components/EditorClient/EditorClient.tsx:261` copies
  `general.display_version` into the `StoredGeneralFields` passed to `saveDialApp`,
  and `src/utils/has-quick-app-changes.ts:68` even counts it as a change
  (`SaveSuccess.hasChanges = true`).
- `src/utils/dialClient.ts:383-396` (`saveDialApp`) builds the
  `UpdateApplicationBodyDto` for `PATCH /api/v1/applications/{applicationName}`
  without a `version` field, so chat-api never receives it.
- `src/types/editor-messages.ts:38` documents `TriggerSaveGeneralPayload` as
  "Never includes `version`", which contradicts both the interface itself
  (`display_version?: string`) and the host's contract (ai-dial-chat
  `TriggerSaveGeneralPayload.display_version`, openspec `app-editor-flow`).
- chat-api already supports the field: `UpdateApplicationBodyDto.version?: string`
  in `@epam/ai-dial-chat-api-client`; chat-api's `applications.service.ts` sets
  `displayVersion` only when `version != null` and validates it as SemVer.

## Solution

- `saveDialApp` sends `version: general.display_version` in the update body when
  the host supplied a non-blank `display_version`; otherwise it omits `version`, which
  chat-api treats as "leave unchanged".
- Fix the misleading `TriggerSaveGeneralPayload` JSDoc.
- Start the `application_editing` spec with a requirement for host-supplied
  General-step fields on save (see `docs/TECH_DEBT.md` "OpenSpec spec creation
  candidates" → Application editing/persistence).

Alternatives considered: always sending `rawForSave.displayVersion` as a fallback
(mirrors the `iconUrl`/`topics` pattern) — rejected, because the load-time snapshot
goes stale after the first Save, so a later save without `general` (auto-save) would
revert the version. Omitting the field is safe because chat-api leaves it unchanged.

## What Changes

- `saveDialApp` forwards `display_version` as `version` in `PATCH /api/v1/applications/{applicationName}`.
- `TriggerSaveGeneralPayload` doc comment corrected.
- New `application_editing` spec requirement covering persistence of host-supplied
  General-step fields, including the version.

## Non-goals

- The application id/path does not change: the id stays `…__1.0.0` and only
  `display_version` changes. chat-api does this, not the editor.
- No SemVer validation in the editor. Version validation is the host's job
  (epam/ai-dial-chat#9160) plus chat-api's `@Matches` validator. If chat-api rejects
  the value, that comes back as `SaveError`.
- Not fixing the general problem that auto-save rebuilds `name`/`description`/
  `iconUrl`/`topics` from the load-time `_rawForSave` snapshot. It is recorded as a
  follow-up (see design.md).
- Not writing the full `application_editing` spec (load/auto-save/dirty-state
  lifecycle). It stays in the TECH_DEBT candidates list.

## Capabilities

### New Capabilities

- `application_editing`: how the editor persists an application on save. This change
  only adds the requirement that host-supplied General-step fields, including the
  display version, are persisted.

### Modified Capabilities

None. `host-integration` already says that TriggerSave triggers a save, and its
wording does not change.

## Acceptance criteria

- A TriggerSave whose `general.display_version` is `1.0.1` produces a `PATCH` body with
  `version: "1.0.1"`. After a reload, the editor and `GET /api/v1/applications`
  show `display_version: "1.0.1"`.
- A save without `general` (auto-save, Preview, or an app created in the same session),
  or with a missing or blank `display_version`, sends no `version` field.
- Unit tests in `src/utils/tests/save-dial-app.test.ts` cover both cases. `npm run lint`,
  `npm run typecheck` and `npm test` pass.

## Impact

- Code: `src/utils/dialClient.ts`, `src/types/editor-messages.ts`, a new test
  `src/utils/tests/save-dial-app.test.ts`.
- API layer (cross-cutting): adds one optional field that is already in the typed client
  to an existing chat-api call. There are no new endpoints and no dependency changes.
- Host integration: the editor now honours a field the host already sends. The message
  shapes do not change.
- i18n: no new strings. RTL: none, because there is no UI change.
- Backward compatibility / rollback: not breaking. Hosts that don't send
  `display_version` behave as before. To roll back, revert the commit.
