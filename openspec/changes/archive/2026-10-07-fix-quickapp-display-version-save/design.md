## Context

The host (ai-dial-chat) owns the Metadata (General) step. On Save it posts
`TRIGGER_SAVE` with a `general` payload, and the editor saves everything in one
`applicationsApi.updateApplication` call (`src/utils/dialClient.ts:363`).
`EditorClient.handleSave` (`src/components/EditorClient/EditorClient.tsx:210-275`)
already normalises `general.display_version` into `StoredGeneralFields`, but
`saveDialApp` doesn't map it to the DTO's `version` field, so the value never
reaches chat-api.

On the chat-api side (`apps/chat-api/src/applications/applications.service.ts:295`
in ai-dial-chat), `displayVersion` is updated only when `body.version != null`, and the
DTO validates it with a SemVer `@Matches`.

## Goals / Non-Goals

**Goals:**

- Persist `general.display_version` as `version` on TriggerSave.
- Never overwrite the stored version with a stale or empty value.

**Non-Goals:**

- Validating the version format in the editor.
- Changing how auto-save rebuilds other General fields (see Risks).

## Decisions

1. **The mapping goes in `saveDialApp`, not `EditorClient`.** `saveDialApp` already
   translates `StoredGeneralFields` into `UpdateApplicationBodyDto` for every other
   field. `EditorClient` keeps passing `effectiveGeneral` unchanged.
2. **Send `version` only from `general`, and omit it otherwise.**
   `version: general?.display_version?.trim() || undefined`. The DTO field is optional
   and chat-api skips `null`/`undefined`, so omitting it means "unchanged".
   - Alternative: fall back to `rawForSave.displayVersion`, like `iconUrl`/`topics`
     do. Rejected. `_rawForSave` is captured once at load
     (`src/utils/dialClient.ts:353`) and `appState` is never refreshed after a save.
     So once a user has saved `1.0.1`, the next dirty auto-save would send `1.0.0` back.
   - Alternative: send `general.display_version` as is, including `""`. Rejected.
     chat-api's SemVer validator would reject a blank value and fail the whole save.
3. **No change to `effectiveGeneral` in `EditorClient`.** `generalForSave` there still
   includes `display_version` from `_rawForSave`, and it gets merged into
   `effectiveGeneral` when `general` is absent. So `saveDialApp` cannot tell a
   host-supplied value from a load-time one by looking at `general.display_version`.
   To keep the decision local, `EditorClient` stops putting `display_version` into
   `generalForSave`'s save path: only `normalizedGeneral` (host-supplied) carries it
   into `effectiveGeneral`. The value still goes to `hasQuickAppChanges` as the
   "stored" baseline, which is what it needs for diffing.

## Risks / Trade-offs

- [The auto-save path sends stale General fields] `name`/`description`/`iconUrl`/
  `topics` are rebuilt from the load-time `_rawForSave` on every save that has no
  `general`. A dirty auto-save after a Metadata change could therefore revert those
  fields. This change leaves that path alone (it is pre-existing and out of scope) and
  records it as a follow-up task, so it doesn't spread to `version`.
- [The host sends an invalid version] chat-api returns 400 and the editor posts
  SaveError. The host is expected to validate first (epam/ai-dial-chat#9160).

## Migration Plan

No migration is needed. The change is additive, and a plain revert rolls it back.
