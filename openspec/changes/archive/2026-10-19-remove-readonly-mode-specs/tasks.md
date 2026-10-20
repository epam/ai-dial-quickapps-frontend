# Tasks

## 1. Spec cleanup

- [x] 1.1 Review the delta specs under `specs/` and verify `openspec validate remove-readonly-mode-specs --strict` passes
- [x] 1.2 Sync the deltas into `openspec/specs/` and verify `openspec validate --specs --strict` passes and no "editor is read-only" scenario remains (`grep -ri "editor is read-only" openspec/specs` returns nothing)
- [x] 1.3 Verify no spec or doc references an old requirement title that was renamed (text search for each old title)

## 2. Docs

- [x] 2.1 Reword the ignored-saves item in `docs/TECH_DEBT.md` without "a read-only form" and verify the file has no read-only editor mention
- [x] 2.2 Remove the read-only mentions from `docs/REACT_HOOK_FORM_REMOVAL_PLAN.md` and verify the plan still reads correctly around lines 40, 107 and 122

## 3. Archive

- [x] 3.1 Archive the change and verify it sits under `openspec/changes/archive/`

## 4. Follow-up outside this change

- [ ] 4.1 Remove the `isReadonly` props, tests and the `QuickApp2Form` read-only save guard in a separate code change
