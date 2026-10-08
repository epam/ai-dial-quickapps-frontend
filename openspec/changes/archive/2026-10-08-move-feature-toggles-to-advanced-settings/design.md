## Context

See proposal.md. Today `QuickApp2Form.tsx:249` renders `QuickApp2FormLegacyFields`, which mirrors `codeInterpreter`, `addAttachment`, `webFetch` into a private RHF form and pushes changes to `useQuickApp2Form` via `setValues`. The Advanced Settings popup (`AdvancedSettingsPopup.tsx`) already keeps a local draft of `AdvancedSettingsValues` and applies it on Save through `handleAdvancedSettingsSave` → `setValues`. `useQuickApp2Form.syncExternalState` (`use-quick-app2-form.ts:164`) already forces the three values to `false` when the host setting is off; serialization lives in `src/form/quickApp2Form.ts` and is untouched.

## Goals / Non-Goals

**Goals:** reuse the existing popup draft/Save path for the three values; delete the legacy card and bridge.
**Non-Goals:** changing persistence, the `syncExternalState` cleanup, other popup controls, or removing RHF itself.

## Decisions

1. **Extend `AdvancedSettingsValues`** with `codeInterpreter`, `addAttachment`, `webFetch` (booleans) rather than a second draft. `QuickApp2Form` adds them to the `advancedSettings` memo and `setValues` already accepts the whole object. *Alternative:* separate props/handlers per toggle — rejected, duplicates the draft/Save logic.
2. **Visibility via props**, mirroring `isProcessLargeFilesAvailable`: `QuickApp2Form` passes `isCodeInterpreterEnabled`, `isAddAttachmentEnabled`, `isWebFetchEnabled` (from `settings`) through `ModelConfigurationSection` → `SettingsSection` → `AdvancedSettingsPopup`. *Alternative:* `useAppContext` inside the popup (as `CodeInterpreterField` did) — rejected to keep the popup prop-driven and testable like its siblings.
3. **Switch label/caption** = old title/description (see proposal Assumptions); no `tooltip`/shared caption, since the popup cannot open when read-only (Advanced button disabled in `SettingsSection.tsx:60`).
4. **Delete** `ContextAndTools/`, `QuickApp2FormLegacyFields/` and unused i18n keys; remove the `LEGACY_FIELDS` plumbing and `handleLegacyValuesChange` from `QuickApp2Form`.
5. **Memoisation:** one `useCallback` per toggle handler, same as the existing handlers; no other change.

## Risks / Trade-offs

- Users now need Save in the popup instead of live toggling → matches every other popup setting; documented in the spec.
- Long descriptions (~300 chars) make the popup taller → the body already grows with content; check visually during implementation.
- Existing tests referencing `ContextAndTools` strings break → updated in the same task group.

## Migration Plan

No data migration. Rollback = revert the change.

## RTL / a11y

Kit `Switch` handles direction; the popup body uses `text-start`. No icons. Switches expose role/checked/name from their label.
