## Context

- `SettingsSection` (`src/components/Settings/SettingsSection.tsx`) is rendered at the end of `ModelConfigurationSection` and opens `AdvancedSettingsPopup`, which today has an empty body and a Save that only closes.
- Form state is owned by the project reducer hook `useQuickApp2Form` (`src/hooks/use-quick-app2-form.ts`), created in `src/components/QuickApp2Form.tsx`. `setValues(partial)` applies several fields at once, re-validates, and dirty state is `!isEqual(values, initialValues)` — so writing unchanged values does not make the form dirty.
- `timestamp` is already driven by the hook (`QuickApp2Form.tsx:221-226` → `AdvancedSettingsSection`). `fileTools` and `maxInputAttachments` still go through the RHF bridge `QuickApp2FormLegacyFields` (`LEGACY_FIELDS`), whose errors for max attachments are merged from hook errors.
- Serialization stays in `src/form/quickApp2Form.ts` (`buildQuickApp2Config` → `features.timestamp`, `features.dial_files`) and `EditorClient.tsx:229` → `dialClient.ts:401` (`maxInputAttachments` in the chat-api update body). Nothing here changes.
- Read-only/shared apps cannot open the popup (Advanced action disabled), so the popup needs no read-only state.

## Goals / Non-Goals

**Goals:** popup content per `application_advanced-settings`; draft with Save/Close; move the three fields to the hook; remove legacy controls; no serialization change.

**Non-Goals:** moving other settings; changing defaults/payload; finishing RHF removal; gating max attachments on attachment types.

## Decisions

1. **Value object passed down, one save callback up.** Add `AdvancedSettingsValues { maxInputAttachments?: number | ''; timestamp: boolean; fileTools: boolean }` in `src/types/advanced-settings.ts`. `QuickApp2Form` builds it with `useMemo` from `values` and a `useCallback` `handleAdvancedSettingsSave = (next) => setValues(next)`; both are threaded `ModelConfigurationSection → SettingsSection → AdvancedSettingsPopup` as `advancedSettings` / `onAdvancedSettingsSave`. Stable references keep the `memo` boundaries effective.
   *Alternative:* a context for Settings — rejected, one consumer two levels down; AGENTS rules discourage new contexts for this. *Alternative:* `setField` per control live — rejected, breaks Close-cancels.

2. **Draft lives in the popup and is reset on every open.** `AdvancedSettingsPopup` holds `useState<AdvancedSettingsValues>` seeded from props; `SettingsSection` mounts it only while open (`{isPopupOpen && <AdvancedSettingsPopup … />}`), so every open re-seeds and every dismissal drops the draft.
   *Alternative:* keep popup mounted and reset in an effect on `isOpen` — more code, risk of a stale frame. If the kit `Popup` exit animation is lost by unmounting, fall back to a `key` incremented in `handleOpen`.

3. **Validation reuses the schema.** Export `MaxInputAttachmentsSchema` from `src/form/quickApp2Form.ts` and add `isValidMaxInputAttachments(value)` there (`safeParse(...).success`). The popup validates on Save (and clears the error on next edit); on failure it shows `quickAppEditor.MaxAttachmentsInvalid` via `NumberInput`'s `error`/`invalid`, and does not call `onAdvancedSettingsSave`. Using a translated message instead of the raw zod message keeps the text localizable.

4. **Controls (ui-kit 2.0, confirmed via MCP):** `NumberInput` (`integer`, `min={1}`, label + `caption` = hint, `error`), two `Switch`es with `labelProps.label` and `caption` (rendered below the label and wired as the switch's description). Layout: vertical stack with gap, logical spacing only; no icons. Body padding: Spacing-04 top/bottom, Spacing-07 sides (`py-4 px-6` = 16px/24px, side padding aligned with the kit header); width 600px (`md:max-w-[600px]` over `PopupSize.Sm`) and body min-height 676px capped at 60vh, per the Figma frame; header and footer dividers stay on.

5. **Removal of legacy controls.** Delete `src/components/AdvancedSettings/` (component + test) and its usage in `QuickApp2Form`. Remove the File tools `DialFormItem` from `ContextAndToolsSection` and the max attachments `DialFormItem` from `UserAttachmentsSection`. Drop `fileTools` and `maxInputAttachments` from `LEGACY_FIELDS` and the `maxInputAttachments` branch of the merged `attachmentErrors`. Remove i18n keys left without call sites (`FileTools`, `FileToolsDescription`, `AllowTheAgentToAccessAppFiles`, `MaxAttachmentsNumber`, `EnterMaxAttachments`).

6. **i18n (`quickAppEditor`, enum in `src/constants/i18n.ts`, entries in `src/i18n/locales/quick-app-editor.json`):** `MaxAttachmentsUserCanAdd`, `MaxAttachmentsHint`, `MaxAttachmentsInvalid`, `TimeAwarenessDescription`, `BuiltInFileTools`, `BuiltInFileToolsDescription`. Reuse `TimeAwareness`, `AdvancedSettings`, `Close`, `Save`.

## Risks / Trade-offs

- [Form-level `maxInputAttachments` error now has no inline control in the main column — a stored invalid value would block submit silently] → popup validation prevents entering invalid values; loaded values come from chat-api and are valid. If a form error exists on open, show it on the input.
- [Users used to the old locations] → accepted; design-driven move.
- [Unmount-on-close may drop a close animation] → `key` fallback (Decision 2).
- [`remove-react-hook-form` touches the same files] → this change only shrinks `LEGACY_FIELDS`; rebase whichever lands second.

## Migration Plan

No data migration — stored shapes are unchanged. Rollback: revert the commit.

## Open Questions

- None blocking. Title case "Advanced Settings" vs current key value "Advanced settings" — kept as is unless design insists.
