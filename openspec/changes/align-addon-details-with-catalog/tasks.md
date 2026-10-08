# Tasks

Follow `AGENTS.md`, `.claude/rules/all-ts.md`, `all-tsx.md`, `rtl.md`. Do not commit.

## 1. Strings and labels

- [x] 1.1 Add `FolderPathAriaLabel`, `MarkdownCopyCode`, `MarkdownCopiedCode`, `MarkdownDownloadCode`, `MarkdownTableScrollRegion`, `MarkdownMathScrollRegion`, `ContentFileSelectorAriaLabel`, `ContentFileCount`, `ContentFileLoading`, `ContentFileUnsupported`, `ContentFileError` to `src/constants/i18n.ts` and `quick-app-editor.json`; expose them from `useCatalogDetailsLabels`. Verify: typecheck.

## 2. Content files

- [x] 2.1 `useEntityDetails` returns `onLoadContentFile`; new `useContentFileSelection`. Verify: `src/hooks/tests/use-content-file-selection.test.tsx` (base file without request, other file loaded as Markdown, failure shows error preview, stale response dropped, reset on item change).

## 3. Layout

- [x] 3.1 `AddOnDetailsPopup`: identity as decided, action row under the name, `gap-4` body, `Skeleton`, `markdownLabels`, file selector props. Verify: popup tests (52 px identity with folder path, action row, skeleton status, translated markdown labels reach the tabs, file selector for a multi-file skill).

## 4. Integration

- [x] 4.1 `npm test`, `npm run lint`, `npm run typecheck`, `npm run build`; no physical-direction classes added.
