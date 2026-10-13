# Design

## Context

`MaxInputAttachmentsSchema` (`src/form/quickApp2Form.ts:66`) maps `''` to `undefined` and is optional; the popup (`AdvancedSettingsPopup.tsx:119`) reuses it. `handleAttachmentsEnabledChange` (`QuickApp2Form.tsx:184`) never touches the max. Dirty state compares form values to the load baseline built by `buildFormValues`. See proposal.md for motivation.

## Goals / Non-Goals

**Goals:** a non-empty max whenever attachments are enabled, without the user having to open the popup; a set max survives off → on.
**Non-Goals:** UI changes beyond the error message; payload changes.

## Decisions

1. **Constant `DEFAULT_MAX_INPUT_ATTACHMENTS = 1`** in `src/constants/quick-apps.ts`. 1 equals the host's current fallback, so seeding changes nothing at runtime. Alternative (larger default) rejected: silent behaviour change.
2. **Seed in the toggle handler, not an effect.** On enable: one `setValues` with `attachmentsEnabled: true` plus the default when the max is empty. An effect reacting to `attachmentsEnabled` would flash an invalid state and double-render.
3. **Keep the max on disable.** Only `inputAttachmentTypes` is cleared; the max remains in form state and in the payload (matches the existing "kept and saved as entered" scenario), so it also survives save + reload.
4. **Don't leave the form dirty after a seeded round trip.** The existing scenario "turn on, then off without adding → not dirty" would break because the seeded `1` differs from the baseline `undefined`. A `useRef` in `QuickApp2Form` records when the toggle seeded the default; turning off while the value still equals the default and the ref is set restores `maxInputAttachments` to its pre-seed (empty) value. The ref is cleared by `handleAdvancedSettingsSave` (a max the user confirms in the popup, even `1`, is never reverted) and on every valid submit (the saved `1` is the new baseline and must not be reverted; the form is not remounted after a save, only on a host Reset, which also resets the ref). Alternative (compare-aware dirty logic in the hook) rejected as more invasive.
5. **Legacy load seeds in `buildFormValues`**: the host value is normalised first (a positive integer, or a numeric string that parses to one, is kept; `null`, `0`, negatives, decimals and garbage count as missing), then the default is used when the app has attachment types and the value is missing. Baseline and values share the builder, so not dirty.
6. **Validation in one place.** `isValidMaxInputAttachments(value, isRequired)` in `src/form/quickApp2Form.ts`; the `superRefine` adds the `maxInputAttachments` issue (key `MaxAttachmentsRequired`) when `attachmentsEnabled` and empty. The popup receives `isAttachmentsEnabled` (from `QuickApp2Form` via `ModelConfigurationSection` → `SettingsSection` popupProps) and shows the Required message for empty vs the Invalid message for non-positive values.

## Edge cases

| # | Situation | Handling |
|---|-----------|----------|
| 1 | Turn on, popup never opened | Default `1` seeded in the toggle update; save sends `1` |
| 2 | Turn on while a max is already set (e.g. loaded app with max `5` but no types) | Max kept, no seeding, no revert on turn-off |
| 3 | Set `5` in popup, off, on | `5` kept (max never cleared on off) |
| 4 | Turn on (seeded `1`), turn off without other edits | Seed reverted, form not dirty |
| 5 | Turn on (seeded `1`), user sets `1` in popup, turn off | Kept: popup Save clears the seed marker |
| 6 | Turn on (seeded `1`), save, turn off | Kept: marker cleared on a valid submit |
| 7 | Attachments off, popup max cleared and saved, then turn on | Empty → seeded `1` |
| 8 | Attachments on, popup max cleared, Save | Blocked, `MaxAttachmentsRequired`, popup stays open, no form change |
| 9 | Popup value `0`, negative, decimal, whitespace-only | Blocked, `MaxAttachmentsInvalid` (both on and off). Empty with attachments off stays valid |
| 10 | Last type tag removed | Switch stays on, max untouched; types-required error as today |
| 11 | Loaded app with types and host max `0` / `null` / `"3"` / `2.5` | Normalised: `"3"` → `3`, others treated as missing → `1`; not dirty |
| 12 | Loaded app without types and with a max | Shown as is; saved as is |
| 13 | Read-only editor | Toggle and popup Save unavailable; load-time seeding still applies; no writes |
| 14 | Host-triggered auto-save with attachments on and popup never opened | Valid thanks to seeding; no blocked save |
| 15 | Form reset / discard | Baseline (including legacy seed) restored; marker cleared |
| 16 | Very large max | No upper bound added (host decides); non-goal |
| 17 | Schema error with the popup closed | Unreachable from the UI (seeded on enable, popup blocks empty); remains a safety net that blocks save for host-supplied bad data |

## Risks / Trade-offs

- Seeded default saved for legacy apps on next save → equals the effective behaviour, no change in practice.
- The ref-based revert is subtle → covered by dedicated tests and a code comment.
- The schema's `maxInputAttachments` error already feeds the popup; it now also appears for the empty case, which is intended.
