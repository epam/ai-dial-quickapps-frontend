# Tasks

Slicing strategy: risk-first. Restore test loading first, then align catalog fixtures and assertions with the updated DTO, and run integration checks.

## 1. Canvas test loading

- [x] 1.1 Configure `vitest.config.ts` to transform the attachment-canvas dependency and its necessary import chain without mocking the tested behavior. **Verification:** run `npx vitest run src/utils/tests/skill-file-canvas-resolvers.test.ts src/components/SkillFilePreview/tests/SkillFilePreview.test.tsx`, `npm run lint`, and `npm run typecheck`.

## 2. Catalog details parity

- [x] 2.1 Update toolset fixtures and assertions in `src/hooks/tests/use-entity-details.test.tsx` and `src/components/Toolsets/ToolsetDetailsPopup/tests/ToolsetDetailsPopup.test.tsx` to cover supported fields; add model provider coverage and assert no invented toolset provider. Preserve extensionless code imports and bundler module resolution. **Verification:** run `npx vitest run src/hooks/tests/use-entity-details.test.tsx src/components/Toolsets/ToolsetDetailsPopup/tests/ToolsetDetailsPopup.test.tsx`, `npm run lint`, and `npm run typecheck`.

## 3. Integration

- [x] 3.1 Run `npm test`, `npm run build`, `npm run lint`, and `npm run format:check`; report the existing repository-wide formatting failures and verify formatting of changed files with Prettier. Verify the OpenSpec change with `openspec validate align-catalog-upgraded-dependencies`.

## Workflow follow-up

- Review and sync or archive the catalog-entity-details delta after implementation.
