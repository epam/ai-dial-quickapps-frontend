# Tasks

## 1. Spec corrections

- [x] 1.1 Review `specs/skills_catalog/spec.md` against `openspec/specs/skills_catalog/spec.md` and verify `openspec validate fix-skills-spec-versionless --strict` passes
- [x] 1.2 Confirm no source change is needed: run `npm run lint` and the Skills and AddOns tests, and verify they pass unchanged (the existing "name only without a version" tests already cover the unversioned case)

## 2. Archive

- [x] 2.1 Sync or archive the change (`openspec-archive-change`) and verify `openspec/specs/skills_catalog/spec.md` no longer contains "1.4.6" or "avatar → name → version"

## 3. Follow-ups outside the repo

- [x] 3.1 Edit the #210 description: remove the version text, move Folder from Overview to the header, state Delete has no confirmation; verify the text matches the archived spec
- [ ] 3.2 Update the Figma designs (Skills row, details header, Add skill Name cell) to drop the version; verify no version text remains in the frames
- [ ] 3.3 Update the QA test cases TC-2, TC-6, TC-7 and rewrite TC-17 to TC-20 for the whole-card read-only model; verify the next QA run passes them
