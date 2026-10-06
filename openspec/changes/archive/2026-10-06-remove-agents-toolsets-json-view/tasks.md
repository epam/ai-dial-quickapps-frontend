Slicing strategy: risk-first. First lock down the save round-trip (the only part that can lose user data), then remove the JSON view top-down from the UI to the form schema, then clean up strings.

## 1. Add-ons row header (already implemented in PR #184)

- [x] 1.1 `src/components/AddOns/AddOnRow.tsx` renders the Add button in the row header and shows the description only when `isEmpty`
- [x] 1.2 `src/components/common/SkillsSelector/SkillsSelector.tsx` and `src/components/common/AgentAndToolsetSelector/AgentAndToolsetSelector.tsx` take required `isSelectModalOpen` / `onSelectModalOpenChange`; built-in Add button and JSON toggle removed
- [x] 1.3 `src/components/AgentSkills/AgentSkillsFormSection.tsx` and `src/components/AddOns/AddOnsSection.tsx` own the modal state and wire the header Add button

## 2. Lock down tool_sets round-trip

- [x] 2.1 Add `src/form/tests/quickApp2Form.test.ts` covering: load (`getQuickApp2FormData`) → save (`buildQuickApp2Config`) keeps MCP, DIAL app, DIAL deployment and inline/unknown toolsets; the code interpreter toolset is included/omitted by the `codeInterpreter` flag
  - Verification: `npx vitest run src/form/tests/quickApp2Form.test.ts`, `npm run typecheck`

## 3. Remove JSON view from the UI

- [x] 3.1 `src/components/ContextAndTools/AgentsAndToolsetsField.tsx`: remove the JSON view branch, fullscreen state, `DialJsonEditor`, discard confirmation, `handleJsonSwitchClick`, `handleDiscardConfirm`, editor errors, and the props `agentsAndToolsetsJson`, `isJsonView`, `onJsonChange`, `onSwitchToJsonView`, `onSwitchToSimpleView`, `onDiscardJson`, `jsonError`, `tooltip`; keep the selector, entity info modal and configuration modal
- [x] 3.2 `src/components/AddOns/AddOnsSection.tsx`: drop the JSON-related props, the `isJsonView` conditions on `isEmpty`/`onAdd`, and `errors` if unused
- [x] 3.3 `src/components/QuickApp2Form.tsx`: remove `isJsonView`/`agentsAndToolsetsJson` watches, `handleSwitchToJsonView`, `handleSwitchToSimpleView`, `handleDiscardJson`, and the matching `AddOnsSection` props
- [x] 3.4 `src/components/AddOns/tests/AddOnsSection.test.tsx`: update renders to the new props and add a test that no JSON control is rendered (query by text/role)
  - Verification: `npx vitest run src/components/AddOns`, `npm run lint`, `npm run typecheck`

## 4. Remove JSON view from the form contract

- [x] 4.1 `src/form/quickApp2Form.ts`: remove `isJsonView` and `agentsAndToolsetsJson` from `QuickApp2Schema` and `getQuickApp2FormData`, delete the JSON `superRefine` checks and `getJsonViewToolsets`, and make `buildQuickApp2Config` always use `getQuickApp2Toolsets`
  - Verification: `npx vitest run src/form/tests/quickApp2Form.test.ts`, `npm run typecheck`, then full `npm test`

## 5. i18n cleanup

- [x] 5.1 Remove JSON-view-only keys from `src/constants/i18n.ts` and `src/i18n/locales/common.json` / `src/i18n/locales/quick-app-editor.json` after a repo-wide grep confirms no usage: `QuickAppEditorI18nKeys.SaveJSON`, `JSON`, `SwitchToMarketplaceView`, `Discard`, `DiscardChanges`, `DiscardJsonChangesConfirmation`, `ContinueEditing`; `CommonI18nKeys.JSON`, `SwitchToJsonView`, `PublicAppCannotBeEdited`, `ShouldBeAnArray`, `ShouldBeAValidJSON`
  - Verification: `npm run lint`, `npm run typecheck`, full `npm test`

## 6. Spec sync

- [x] 6.1 Sync the delta into `openspec/specs/application_editor-layout/spec.md` (`openspec-sync-specs`) and run `openspec validate remove-agents-toolsets-json-view --type change --strict`
