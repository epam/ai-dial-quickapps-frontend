# Tasks

Slicing strategy: **risk-first, then vertical migration**. First characterize the current RHF behavior and prove the replacement controller's highest-risk semantics (validation, dirty state, arrays, autosave, and reset). Then migrate the UI sections in independently verifiable groups. Dependency removal is the final step.

## 1. Characterize the Existing Form Contract

- [x] 1.1 Add focused tests for `QuickApp2Schema`, `getQuickApp2FormData`, and the existing form's observable validation behavior, covering valid data, invalid JSON-view data, unavailable/tool-unsupported models, and empty/invalid/valid `maxInputAttachments`; verify the relevant existing Vitest suites pass and run `npm run lint` and `npm run typecheck`.
  - **Verification:** Run the new schema/controller tests under `src/form/tests/` and the existing `src/components/tests/QuickApp2Form.test.tsx`; confirm Zod error paths and invalid submissions are captured without changing production code.

- [x] 1.2 Add characterization coverage for dirty state, ordinary submit, host-triggered save, clean/dirty autosave, `ignoreDirty`, read-only behavior, host reset, and asynchronous model resolution; verify the tests describe observable callbacks and host messages rather than RHF internals, and run `npm run lint` and `npm run typecheck`.
  - **Verification:** Run `src/components/tests/QuickApp2Form.test.tsx` plus the new focused tests for `EditorClient`/form orchestration; confirm invalid submit never calls `onSave` and reset restores the initial baseline.

- [x] 1.3 Add characterization coverage for starter-row identity and trailing-blank behavior, agents/toolsets metadata preservation, JSON/simple-view conversion, file add/remove deduplication, invalid MIME-tag rollback, and controlled value propagation; verify the existing component tests and new focused tests pass, and run `npm run lint` and `npm run typecheck`.
  - **Verification:** Run the affected component tests for `ConversationStarters`, `ContextAndTools`, and `UserAttachments`; assert generated IDs and `[schema]:*` metadata are preserved.

## 2. Implement and Test the RHF-Free Form Controller

- [x] 2.1 Create `src/hooks/use-quick-app2-form.ts` with reducer-backed values, a stable initial dirty baseline, typed semantic actions, Zod `safeParse` validation, project-owned error mapping, and submit gating; verify the new hook has unit tests and run `npm run lint` and `npm run typecheck`.
  - **Verification:** Add and run `src/hooks/tests/use-quick-app2-form.test.tsx`; cover initial values, field updates, dirty transitions, valid/invalid submit, nested Zod issue paths, and preservation of raw intermediate values.

- [x] 2.2 Implement controller actions for asynchronous model availability/resolution, feature-gated field cleanup, and model-ready timing without changing `EditorClient`'s host contract; verify async and feature-flag tests pass and run `npm run lint` and `npm run typecheck`.
  - **Verification:** Extend `src/hooks/tests/use-quick-app2-form.test.tsx` and `src/components/tests/QuickApp2Form.test.tsx`; assert saved model precedence, default/fallback model selection, validation intent for external updates, and disabled feature values.

- [x] 2.3 Implement semantic controller actions for agents/toolsets, JSON/simple-view transitions, starter arrays, file lists, and MIME-tag error/recovery state; verify reducer tests cover atomic updates, stable IDs, metadata, and rollback, and run `npm run lint` and `npm run typecheck`.
  - **Verification:** Extend `src/hooks/tests/use-quick-app2-form.test.tsx` and run the affected `ConversationStarters`, `ContextAndTools`, and `UserAttachments` tests; assert JSON errors, simple-view reconstruction, MIME remount/reset signaling, and array invariants.

## 3. Migrate the Editor Root and Scalar Sections

- [x] 3.1 Replace RHF ownership in `src/components/QuickApp2Form.tsx` with `useQuickApp2Form`, preserving both native submit and `DIAL_EDITOR_TRIGGER_SAVE_EVENT`, dirty notifications, model-ready behavior, read-only checks, and derived selectors; verify root form tests pass and run `npm run lint` and `npm run typecheck`.
  - **Verification:** Run `src/components/tests/QuickApp2Form.test.tsx` and `src/hooks/tests/use-quick-app2-form.test.tsx`; confirm `onSave`, `onDirtyChange`, and `onModelReady` receive the same observable results for valid, invalid, clean, dirty, and reset flows.

- [x] 3.2 Migrate `InstructionsSection`, `AdvancedSettingsSection`, `AgentSkillsFormSection`, and `ModelConfigurationSection` from RHF `Control`/`Controller` to typed value/change/error/blur adapters while preserving rich editor, model, temperature, toggle, and read-only behavior; update their tests and run `npm run lint` and `npm run typecheck`.
  - **Verification:** Run `src/components/InstructionsSection/tests/InstructionsSection.test.tsx`, `src/components/Orchestrator/ModelConfigurationSection/tests/ModelConfigurationSection.test.tsx`, and the affected section tests; confirm values propagate in both directions and validation errors remain associated with the same fields.

## 4. Migrate Array, JSON, File, and Attachment Sections

- [ ] 4.1 Migrate `ContextAndToolsSection` and its agents/toolsets/JSON callbacks from RHF `Control`/`FieldErrors` to semantic controller actions, preserving JSON error display, conversion, discard behavior, entity metadata, file selection, and feature-gated toggles; update tests and run `npm run lint` and `npm run typecheck`.
  - **Verification:** Run the affected `ContextAndTools` tests plus `src/hooks/tests/use-quick-app2-form.test.tsx`; confirm simple/JSON transitions and file deduplication match the characterization cases.

- [ ] 4.2 Migrate `ConversationStartersSection` from RHF controllers to typed adapters, preserving starter blur handling, dynamic blank rows, error rendering, and reset recovery; update tests and run `npm run lint` and `npm run typecheck`.
  - **Verification:** Run the affected `ConversationStarters` tests plus `src/hooks/tests/use-quick-app2-form.test.tsx`; confirm starter identity and trailing blank row.
  - **Note:** the in-flight change `redesign-conversation-starters` replaces this section with an Add-ons row and a draft modal; land the migration there rather than on the old section.

- [x] 4.4 Move user attachments off RHF — done in change `move-attachments-to-settings` (epam/ai-dial-quickapps-frontend#199):
  - `UserAttachmentsSection` is deleted and replaced by an Attachments row in Configuration (`src/components/Attachments/AttachmentsSection.tsx`), driven by `useQuickApp2Form` (`inputAttachmentTypes` plus the form-only `attachmentsEnabled`).
  - `inputAttachmentTypes` is out of `QuickApp2FormLegacyFields`' `LEGACY_FIELDS`, together with the attachment error bridge.
  - `attachmentTypesResetKey`, `setAttachmentTypes` and the MIME regex are removed from the controller. That change dropped MIME validation by design (parity with the DIAL admin app), so the "invalid-tag rollback" characterization in 1.3 / 2.3 no longer applies.
  - Max attachments already moved to the Advanced Settings popup (`populate-advanced-settings-popup`).
  - **Not a pure refactor:** the UI and validation changed under that change's own specs (`application_user-attachments`, `application_editor-layout`).

- [ ] 4.3 Update `src/components/tests/QuickApp2Form.test.tsx`, `src/components/InstructionsSection/tests/InstructionsSection.test.tsx`, and `src/components/Orchestrator/ModelConfigurationSection/tests/ModelConfigurationSection.test.tsx` to remove RHF test fixtures and exercise the project-owned adapter contracts; verify no test imports RHF and run `npm run lint` and `npm run typecheck`.
  - **Verification:** Run all three named Vitest files and repository search for `react-hook-form`/`@hookform/resolvers`; only dependency cleanup references or planning documents may remain.

## 5. Remove the Dependency and Document Completion

- [ ] 5.1 Delete the unused `src/components/common/Forms/ControlledFormField.tsx` RHF helper after confirming there are no imports, remove all remaining RHF imports, and verify the source/test tree contains no `react-hook-form` or `@hookform/resolvers` imports; run `npm run lint` and `npm run typecheck`.
  - **Verification:** Repository-wide search returns no runtime/test imports and all affected Vitest tests pass.

- [ ] 5.2 Remove `react-hook-form` and `@hookform/resolvers` from `package.json`, regenerate `package-lock.json`, retain `zod`, and verify dependency installation/build metadata remains consistent; run `npm run lint` and `npm run typecheck`.
  - **Verification:** `npm install`/lockfile validation completes without peer-dependency errors and the package manifest contains no RHF packages.

- [ ] 5.3 Update `docs/TECH_DEBT.md`, `AGENTS.md`, and `docs/REACT_HOOK_FORM_REMOVAL_PLAN.md` with the completed status, preserved behavior, and any follow-up findings; verify documentation matches the final source tree and introduces no new i18n or RTL requirements, and run `npm run lint` and `npm run typecheck`.
  - **Verification:** Review the documentation links and paths, confirm no stale RHF usage claims remain, and ensure no UI strings or direction-sensitive markup were added.

## 6. Final Regression Verification

- [ ] 6.1 Run the complete verification suite after dependency removal: `npm test`, `npm run lint`, `npm run typecheck`, and `npm run build`; verify all tests pass and the production build contains no unresolved RHF imports.
  - **Verification:** Record the command results in the change review and inspect the final diff for changes outside the form/controller, tests, dependency, and documentation scope.

- [ ] 6.2 Verify host-facing save, dirty, autosave, and reset behavior against the existing `EditorClient` contract in the browser/integration environment; if a live chat-api/host environment is unavailable, document that limitation and retain the automated regression coverage as the gate.
  - **Verification:** Confirm `onDirtyChange`, `DIAL_EDITOR_TRIGGER_SAVE_EVENT`, reset remount, and serialized `onSave` payload behavior match the pre-migration characterization results.
