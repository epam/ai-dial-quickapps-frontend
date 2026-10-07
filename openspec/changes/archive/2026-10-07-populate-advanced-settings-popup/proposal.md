## Why

The Advanced Settings popup shipped as an empty shell (archived change `add-settings-advanced-popup`), while the settings it is meant to hold are still scattered across legacy main-column sections: Max attachments in User attachments, Time awareness in a standalone Advanced settings section, and File tools in Context and tools. The design now puts these three controls in the popup. None of them has a spec (`docs/TECH_DEBT.md` lists `application_advanced-settings` and `application_user-attachments` only as candidates), so per AGENTS.md this change also writes that spec.

## Problem

- `application_editor-layout` requires the popup body to be empty and the Settings shell to have no form/persistence contract (`openspec/specs/application_editor-layout/spec.md:223-279`) — the new design contradicts both requirements.
- Time awareness lives in `src/components/AdvancedSettings/AdvancedSettingsSection.tsx:29-35`, File tools in `src/components/ContextAndTools/ContextAndToolsSection.tsx:83-102`, Max attachments in `src/components/UserAttachments/UserAttachmentsSection.tsx:56-79`; their behaviour (defaults, save mapping, validation) is defined only by `src/form/quickApp2Form.ts:80,96,195-236,300-310` and `src/components/EditorClient/EditorClient.tsx:229`.
- Max attachments and File tools still go through the legacy react-hook-form bridge (`src/components/QuickApp2FormLegacyFields/QuickApp2FormLegacyFields.tsx:12-24`), which the in-flight `remove-react-hook-form` change is retiring.

## Solution

1. Fill the popup with three controls, in order: **Maximum attachments amount user can add** (integer input + hint "Valid only for the cases when attachments enabled for the agent"), **Time awareness** (switch + description), **Built-in file tools** (switch + description).
2. The popup edits a **local draft** seeded from the current form values each time it opens. **Save** validates the draft, writes it into the Quick App form in one update (marks the form dirty; persisted by the editor's normal save / auto-save), and closes. **Close**, the header ×, outside click and Escape discard the draft.
3. Remove the old controls from the main column: the standalone Advanced settings (Time awareness) section, the File tools switch in Context and tools, and the Max attachments field in User attachments (Attachment types stays).
4. Form layer: drive the three fields from the project-owned `useQuickApp2Form` controller (`src/hooks/use-quick-app2-form.ts`) instead of the RHF bridge — drop `fileTools` and `maxInputAttachments` from `LEGACY_FIELDS`; reuse the existing `MaxInputAttachmentsSchema` for draft validation. Schema, defaults and serialization stay unchanged.
5. Write the new spec `application_advanced-settings`, modify `application_editor-layout`, update `docs/TECH_DEBT.md`.

## Alternatives considered

- **Bind popup controls directly to the form (no draft)** — simpler, but Close would not cancel and the Save/Close pair in the design would be meaningless. Rejected.
- **Keep legacy controls alongside the popup** — two places editing one value, confusing and contradicting the design. Rejected.
- **Put the requirements in `application_editor-layout`** — that spec is about placement; the field semantics (defaults, save mapping) belong to the TECH_DEBT candidate `application_advanced-settings`. Layout spec keeps only the entry point/popup shell.

## Non-goals

- Changing the save payload shape, defaults, or validation rules of the three fields.
- Moving other settings (Attachment types, Code interpreter, Add attachment, Web fetch, conversation starters) into the popup.
- Disabling Max attachments when attachment types are empty — the hint is informational only (current behaviour keeps the value regardless).
- Completing the rest of `remove-react-hook-form`.

## Acceptance criteria

- Popup shows the three controls with the design's labels/descriptions, seeded from current values.
- Save with a valid draft updates form values and dirty state; nothing is sent to chat-api until the editor saves. Save with an invalid max-attachments value keeps the popup open with an inline error and changes nothing.
- Close/dismiss leaves form values and dirty state unchanged; reopening shows the form values, not the discarded draft.
- Legacy controls are gone from the main column; saved `application_properties.features.timestamp`, `features.dial_files` and the application's `maxInputAttachments` (chat-api update body) are identical to before for the same values.
- `openspec validate populate-advanced-settings-popup --strict`, `npm test`, `npm run lint`, `npm run typecheck` pass.

## What Changes

- Advanced Settings popup gets three controls and draft/Save/Close semantics.
- **BREAKING (UI only):** the standalone Advanced settings section, the File tools switch in Context and tools, and the Max attachments field in User attachments are removed from the main column. Stored data is unaffected.
- `fileTools` / `maxInputAttachments` move off the RHF legacy bridge onto `useQuickApp2Form`.
- New i18n strings for the new labels/descriptions.

## Capabilities

### New Capabilities

- `application_advanced-settings`: the content of the Advanced Settings popup — Max attachments, Time awareness, Built-in file tools: defaults, draft/Save/Close, validation, read-only, save mapping.

### Modified Capabilities

- `application_editor-layout`: "Advanced opens an empty settings popup" becomes "Advanced opens the Advanced Settings popup" (delegating content to `application_advanced-settings`); "Settings shell has no external data contract" is replaced by a requirement that the popup only changes form state on Save and never calls chat-api itself; presentation scenario no longer says "empty body".

## Impact

- **Code:** `src/components/Settings/AdvancedSettingsPopup.tsx`, `SettingsSection.tsx`, `src/components/Orchestrator/ModelConfigurationSection/ModelConfigurationSection.tsx` (pass values/handlers), `src/components/QuickApp2Form.tsx`, `src/components/QuickApp2FormLegacyFields/QuickApp2FormLegacyFields.tsx`, `ContextAndToolsSection.tsx`, `UserAttachmentsSection.tsx`; delete `src/components/AdvancedSettings/`. `src/form/quickApp2Form.ts` — export `MaxInputAttachmentsSchema` only.
- **Tests:** update/remove `AdvancedSettingsSection.test.tsx`, `ContextAndToolsSection.test.tsx`, `QuickApp2FormLegacyFields.test.tsx`, `QuickApp2Form*.test.tsx`; extend `AdvancedSettingsPopup.test.tsx`, `SettingsSection.test.tsx`.
- **API / chat-api / auth / host integration:** none; values persist through the existing application save.
- **i18n:** new `quickAppEditor` keys: max attachments label + hint, Time awareness description, Built-in file tools label + description. Existing `TimeAwareness`, `Close`, `Save` reused. Unused old keys (`FileTools`, `FileToolsDescription`, `AllowTheAgentToAccessAppFiles`, `MaxAttachmentsNumber`, `EnterMaxAttachments`) removed if no other call site.
- **RTL:** popup content uses logical spacing/alignment; switches and inputs follow `dir`; no directional icons added.
- **Interaction with `remove-react-hook-form`:** shrinks its scope (two fewer legacy fields, one fewer section); no conflict.
- **Rollback:** revert the commit — no data migration; stored values keep the same shape.
