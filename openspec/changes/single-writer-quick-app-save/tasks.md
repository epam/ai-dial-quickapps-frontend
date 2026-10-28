# Tasks

## 1. QuickApps: pin the single-writer contract with tests

- [x] 1.1 Add an `EditorClient` test: TriggerSave with `general` (`name` "Renamed", `description` "New text") succeeds, the form is edited, a TriggerAutoSave runs; assert the auto-save request carries "Renamed" and "New text". Verify `npm test -- EditorClient` passes.
- [x] 1.2 Add an `EditorClient` test: one TriggerSave with `general` sends exactly one `updateApplication` call carrying the General-step fields and `applicationProperties`. Verify the same test run passes.
- [x] 1.3 Add a `saveDialApp` test: a save without `general` on a freshly loaded app sends the loaded `name`, `description`, `iconUrl` and `topics` unchanged. Verify `npm test -- save-dial-app` passes.
- [x] 1.4 Run `npm run lint`, `npm run typecheck` and `npm test`; verify all three are green.

## 2. Specs

- [x] 2.1 Validate the change: `openspec validate single-writer-quick-app-save` reports no errors, including no conflict with `keep-translations-on-save-without-general`.
- [x] 2.2 After review and implementation, sync the deltas into `openspec/specs/host-integration` and `openspec/specs/application_editing` with `openspec-sync-specs`; verify the two new requirements appear in the main specs.

## 3. ai-dial-chat (other repository; track in its own PR)

- [ ] 3.1 In `QuickAppSetup.startPreview`, pass `toTriggerSaveGeneral(values)` to `runSave`. Verify with the Preview unit test that `TRIGGER_SAVE` carries `general`.
- [ ] 3.2 Remove `reassertSkillsSupport` and its calls from `save` and `startPreview`. Verify `QuickAppSetup.spec.tsx` asserts no `updateApplication` call after `SAVE_SUCCESS`.
- [ ] 3.3 Update chat's `app-editor-flow`, `app-preview-chat` and `applications-write-api` specs to drop the reassertion requirement and its scenarios, and to say chat-api forces the flag on every update. Verify `openspec validate` passes there.
- [ ] 3.4 Manual check against a running stack: Save and Preview each produce one `PATCH /api/v1/applications/{id}` in the network log, the stored `features.skills_supported` is `true`, and a name edit made before Preview survives the next auto-save.

## 4. Integration

- [ ] 4.1 With both changes deployed, edit name and instructions, press Preview, edit instructions again and wait 30 s; verify the name is unchanged and only the auto-save `PATCH` was sent.
