## Why

The new editor layout (UI redesign, #161) has no place for three feature-flagged controls — Code interpreter, Add attachment and Web fetch — so they still live in the old **Context & Tools** card (`ContextAndToolsSection`), the last old-style section, backed by an RHF bridge (`QuickApp2FormLegacyFields`). The Advanced Settings popup already hosts the other switch-style settings (Time awareness, Built-in file tools, Allow orchestrator to process files), so these three belong there, styled the same way. Tracked in issue #224.

## What Changes

- Add three controls to the Advanced Settings popup, after the existing ones: **Code Interpreter**, **Add attachment**, **Web fetch**. Each is a kit `Switch` with the same label + caption styling as Time awareness / Built-in file tools.
- Keep the existing titles and descriptions: the switch label is the current title (`CodeInterpreter`, `AddAttachment`, `WebFetch`) and its caption is the current description (`CodeInterpreterInfo`, `AddAttachmentDescription`, `WebFetchDescription`). The old inline switch labels ("Allow the agent to attach files to the response", etc.) are dropped, since the old title/description pair becomes the label/caption pair.
- Visibility is unchanged: each control renders only when its host setting (`isCodeInterpreterEnabled`, `isAddAttachmentEnabled`, `isWebFetchEnabled`) is on.
- The values join the popup's local draft and are applied to the form on **Save**, like the other popup values — no longer written live.
- Remove the **Context & Tools** card: `ContextAndToolsSection`, `CodeInterpreterField`, `QuickApp2FormLegacyFields` and their tests; the three values no longer go through react-hook-form.
- Remove the now-unused strings (`ContextAndTools`, `ContextAndToolsDescription`, `UseToExecuteCustomPythonCode`, `AllowTheAgentToAttachFilesToTheResponse`, `AllowTheAgentToFetchWebResources`).
- Saved values and the persisted application shape are unchanged.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `application_advanced-settings`: popup lists the three new switches (visibility, copy, draft/Save, order, a11y).
- `application_editor-layout`: the primary column no longer has a Context and tools section.

## Impact

- **Code:** `src/components/Settings/AdvancedSettingsPopup.tsx`, `SettingsSection.tsx`, `src/components/Orchestrator/ModelConfigurationSection/ModelConfigurationSection.tsx`, `src/components/QuickApp2Form.tsx`, `src/types/advanced-settings.ts`; deleted: `src/components/ContextAndTools/`, `src/components/QuickApp2FormLegacyFields/`. Closest existing pattern: the `processLargeFiles` switch, `AdvancedSettingsPopup.tsx:195`.
- **Tests:** popup/section/form tests updated; legacy-field tests removed.
- **i18n:** no new strings; five keys removed from `src/constants/i18n.ts` and `src/i18n/locales/quick-app-editor.json` (only `Context & Tools` is present there today).
- **RTL:** none beyond what kit `Switch` already provides; the popup body already uses `text-start`. No icons added.
- **Docs:** `docs/TECH_DEBT.md` note about `ContextAndToolsSection`/`QuickApp2FormLegacyFields` still using RHF is updated; `openspec/changes/remove-react-hook-form/tasks.md` item 4.1 and the legacy-fields bullet become moot and should be adjusted.
- **Out of scope:** auth, host integration, chat-api (no endpoint or payload change); the RHF dependency removal itself (separate change).

### Alternatives considered

1. **Popup (chosen)** — requested; matches the switch-style settings, keeps the main column free of the old card.
2. Add-ons card row for Code interpreter — rejected for now: needs a new row design and a larger layout change; can be revisited separately.
3. Keep the card and only restyle — rejected: leaves the RHF bridge alive.

## Rollback / compatibility

Not breaking: persisted data and host contracts are unchanged. Revert the change as a whole to restore the card.

## Acceptance criteria

- With each host setting on, the matching switch appears in the Advanced Settings popup with the original title and description; with it off, it is absent.
- Toggling then Save updates the form (dirty) and persists through the existing save; closing without Save discards.
- Shared/read-only apps cannot open the popup (Advanced button disabled), as before.
- No Context & Tools card renders; `ContextAndToolsSection` and `QuickApp2FormLegacyFields` are gone.
- `npm run lint`, `npm run typecheck`, `npm test` pass.

## Assumptions

- "Titles and descriptions" means the `DialFormItem` title and description of each control, which become the switch label and caption.
- Code interpreter goes in the popup together with the other two, per the request.
