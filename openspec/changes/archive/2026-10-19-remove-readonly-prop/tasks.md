# Tasks

## 1. Shared popups, modals and lists

- [x] 1.1 Remove `isReadonly` from `AddOnDetailsPopup`, `SkillDetailsPopup`, `ToolsetDetailsPopup` and `AgentDetailsPopup` (Delete and Credentials actions always render) and update their tests; verify `npx vitest run` for those folders passes
- [x] 1.2 Remove `isReadonly` from `SkillsList`, `ToolsetsList`, `AgentsList` (remove button always rendered) and the `AddOnCatalogModal` / `ModelCatalogModal` editor props, keeping the catalog `ListView` `isReadonly`; update tests and verify they pass

## 2. Rows and sections

- [x] 2.1 Remove `isReadonly` from `AgentSkillsFormSection`, `ToolsetsFormSection`, `AgentsFormSection`, `KnowledgeBaseRow`, `ConversationStartersRow` and `AddOnsSection` (Add actions never disabled); update tests and verify they pass
- [x] 2.2 Remove `isReadonly` from `ModelConfigurationSection`, `AttachmentsSection` and `SettingsSection`; update tests and verify they pass

## 3. Form and test utilities

- [x] 3.1 Remove the prop and the read-only save guard from `QuickApp2Form`, and any `isReadonly` use in `src/test-utils/test-root.tsx`; update `QuickApp2Form` tests and verify they pass
- [x] 3.2 Run `npm run typecheck`, `npx eslint src` and the full `npx vitest run`; verify all pass and `grep -rn isReadonly src` shows only the catalog `ListView` props and `getEntityStatusMessage`

## 4. Archive

- [x] 4.1 Archive the change and open a PR that references Issue #210 neutrally; verify `openspec/changes/archive/` holds the change
