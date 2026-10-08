# Tasks

Slicing strategy: vertical — land the pure path util first, then one end-to-end row (list → popup →
form wiring), then retire the old control. Each group lands its own tests, i18n and docs. Follow
`AGENTS.md`, `.claude/rules/all-ts.md`, `all-tsx.md`, `rtl.md` (extensionless imports, `@/` alias,
boolean/handler naming, `DIAL_ICON_SIZE`, logical Tailwind). Do not commit.

## 1. Path parsing util

- [x] 1.1 Add `src/utils/knowledge-base-path.ts` with `parseKnowledgeBaseItem` (decoded id → `{ type, name, segments }`; own bucket / `public` / other root labels; trailing `/` = folder; bucket-root → `[rootLabel]`; malformed/non-`files/` ids fall back to the raw id). Verify: `npx vitest run src/utils/tests/knowledge-base-path.test.ts`.
- [x] 1.2 Add `src/utils/tests/knowledge-base-path.test.ts` covering the spec scenarios (public folder, nested file, bucket root, encoded names, deep path, unknown id). Verify: same Vitest file passes; `npm run lint` and `npm run typecheck` clean for touched files.

## 2. i18n strings

- [x] 2.1 Add `KnowledgeBase`, `KnowledgeBaseDescription`, `RemoveKnowledgeBaseItem`, `KnowledgeBasePathLabel`, `KnowledgeBasePersonal`, `KnowledgeBaseOrganization`, `KnowledgeBaseShared` to `QuickAppEditorI18nKeys` in `src/constants/i18n.ts` and `src/i18n/locales/quick-app-editor.json` (English text per `design.md`). Verify: `npm run typecheck` and any locale-key parity test in `src/i18n` pass.

## 3. Knowledge base row (list + popup)

- [x] 3.1 Create `src/components/KnowledgeBase/KnowledgeBaseList.tsx`: `<ul>` of items, each with `FileIcon` (decorative), kit `Breadcrumbs` (plain-text segments, translated `ariaLabel`), hover tint, and an opacity-revealed `GhostIconButton`/`IconTrash` named `RemoveKnowledgeBaseItem`; omit buttons when `onRemove` is undefined; refocus the list after removal. Verify: `npx vitest run src/components/KnowledgeBase/tests/KnowledgeBaseList.test.tsx`.
- [x] 3.2 Create `src/components/KnowledgeBase/KnowledgeBaseRow.tsx` (`memo`): `AddOnRow` with `KnowledgeBase` title, `KnowledgeBaseDescription` while empty, `isAddDisabled`/`tooltip` for read-only; mounts `FileManagerModal` (`initialFileIds` = current ids) only when open and editable; on close with ids calls `onAddDocuments`. Verify: `npx vitest run src/components/KnowledgeBase/tests/KnowledgeBaseRow.test.tsx`.
- [x] 3.3 Add `tests/KnowledgeBaseList.test.tsx` and `tests/KnowledgeBaseRow.test.tsx` (role/label/text queries; mock `FileManagerModal`, `use-translation`, `AuthContext`): empty state, populated state with icon + path text, last segment emphasised, remove removes only that item, read-only hides trash and disables Add, Add opens popup and confirm calls `onAddDocuments`, dismiss changes nothing. Verify: both Vitest files pass; `npm run lint` and `npm run typecheck` clean.

## 4. Wire into the editor

- [x] 4.1 Extend `AddOnsSection` props (`documentRelativeUrl`, `onAddDocuments`, `onRemoveDocument`) and render `KnowledgeBaseRow` between Agents & Toolsets and Conversation starters; pass `values.documentRelativeUrl`, `addDocuments`, `removeDocument` from `src/components/QuickApp2Form.tsx`. Verify: `npx vitest run src/components/AddOns/tests/AddOnsSection.test.tsx` (add a mock for the row and an order assertion).
- [x] 4.2 Extend `src/components/tests/QuickApp2Form.behavior.test.tsx` with an editor-level flow: add files via the popup → editor dirty → save payload contains single-encoded `contexts`; remove one → payload updated. Verify: `npx vitest run src/components/tests/QuickApp2Form.behavior.test.tsx src/components/tests/QuickApp2Form.test.tsx`.

## 5. Retire the old Context files control

- [x] 5.1 Remove the Context files `DialFormItem`/`Controller`/`FilesSelector`/`decodeFileUrl` imports from `src/components/ContextAndTools/ContextAndToolsSection.tsx`; remove `documentRelativeUrl` from `LEGACY_FIELDS` in `src/components/QuickApp2FormLegacyFields/QuickApp2FormLegacyFields.tsx`; delete `src/components/common/FilesSelector/FilesSelector.tsx` (keep `FileManagerModal`, `UploadProgressModal`). Verify: `rg "FilesSelector"` finds only the two kept modal files' folder, and `npx vitest run src/components/ContextAndTools src/components/QuickApp2FormLegacyFields`.
- [x] 5.2 Update `ContextAndToolsSection.test.tsx` and `QuickApp2FormLegacyFields.test.tsx` to drop context-file cases and assert no Context files control renders. Verify: those two Vitest files pass.
- [x] 5.3 Delete the now-unused keys `ContextFiles`, `ContextFilesInfo` (quickAppEditor) and `NoContextFilesAdded`, `RemoveFile` (common) from `src/constants/i18n.ts` and both locale JSON files, after `rg` confirms no remaining usage. Verify: `npm run typecheck` and `npm run lint` clean.

## 6. RTL, docs and integration

- [x] 6.1 RTL pass on the new row: confirm only logical classes are used, and that the kit chevron separator mirrors under `dir="rtl"` (add `rtl:scale-x-[-1]` via the `separator` prop if it does not); add a test asserting the separator/mirroring class or `dir` handling. Verify: `npx vitest run src/components/KnowledgeBase`.
- [x] 6.2 Update `docs/TECH_DEBT.md`: mark the Knowledge base part of the Add-ons item done (leave the Toolsets/Agents split open) and update the "Context files (file manager)" candidate to note the row now lives in `components/KnowledgeBase/`. Verify: diff shows only those lines.
- [x] 6.3 Integration check: run the full `npm test`, `npm run lint`, `npm run typecheck` and `npm run build`. Verify: all four succeed.
