Slicing: **risk-first, then vertical.** Slice 1 first proves that the canvas dependency installs cleanly and stays out of the main bundle. Slice 2 then builds the whole path (selection → lazy preview → canvas) for one file type end to end. Later slices widen to errors, labels and tests. All relative TypeScript imports are extensionless. The `.css` import keeps its extension. `moduleResolution: "bundler"` stays as it is.

## 1. Dependency (risk-first)

- [x] 1.1 Add `"@epam/ai-dial-attachment-canvas": "1.2.0-rc.0"` (exact pin) to `package.json` dependencies and run `npm install`. Confirm `npm ls @epam/ai-dial-chat-shared @epam/ai-dial-ui-kit` shows a single copy of each, with no peer warnings.
  - Found during apply: `@epam/ai-dial-chat-hooks/file-manager-canvas` imports its optional peer `@epam/ai-dial-quotations`, so add `"@epam/ai-dial-quotations": "1.2.0-rc.0"` (exact pin). `configure-pdf-worker.ts` imports `pdfjs-dist` directly, so declare `pdfjs-dist` too (same range as the canvas; a single deduped copy).
  - Verification: `npm run typecheck`, `npm run build`.

## 2. Selection and preview path (vertical slice)

- [x] 2.1 `src/hooks/use-entity-details.ts`: also return `onLoadSkillDetailsFile` from `useCatalogItemDetails` (`(fileId: string) => Promise<SkillFileContent>`) in `UseEntityDetailsResult`.
  - Verification: `npx vitest run src/hooks/tests/use-entity-details.test.tsx`, `npm run lint`, `npm run typecheck`.
- [x] 2.2 Add `findContentFileNode(nodes, fileId)` in `src/utils/find-content-file-node.ts` (named after its export, per `.claude/rules/all-ts.md`). It returns the file node (with `name`) for an id in the `CatalogContentTreeNode` tree, or `undefined`. Unit tests go in `src/utils/tests/find-content-file-node.test.ts`: a nested file is found, an id that is a folder or unknown returns `undefined`.
  - Verification: `npx vitest run src/utils/tests/find-content-file-node.test.ts`, `npm run lint`, `npm run typecheck`.
- [x] 2.3 `src/hooks/use-content-file-selection.ts`: drop the loader argument, `filePreview`, `isFileLoading` and the generation counter. Return `selectedFileId`, `pickedFile: { id, name } | null` (`null` on the base file; the name comes from `findContentFileNode`), `expandedFolderIds`, `isFileSelectorOpen` and the three handlers. Keep the reset on `item.id` / base-file change. Update `src/hooks/tests/use-content-file-selection.test.tsx`: picking a file exposes its id and name, picking the base file clears the pick, changing the item resets it.
  - Verification: `npx vitest run src/hooks/tests/use-content-file-selection.test.tsx`, `npm run lint`, `npm run typecheck`.
- [x] 2.4 Add `src/types/skill-file-preview.ts` with the string enum `SkillFilePreviewState { Loading = 'loading', Ready = 'ready' }`.
  - Verification: `npm run typecheck`.
- [x] 2.5 Add `src/utils/skill-file-canvas-resolvers.ts`, the module-scope `UseOpenAttachmentCanvasResolvers` built from `chat-hooks`' `resolve*CanvasContent` and `hasAttachmentTextSource` (imported from the `@epam/ai-dial-chat-hooks/file-manager-canvas` subpath). The URL resolvers return `undefined`, and `htmlSrcdocHostUrl` is `'/api/v1/files/html-preview-frame'` (design D5). Add `src/utils/configure-pdf-worker.ts` (memoised dynamic `pdfjs-dist` worker setup) and a same-origin `loadPdfBlob(url)` in `src/utils/load-pdf-blob.ts`, per design D6. Unit tests: `src/utils/tests/skill-file-canvas-resolvers.test.ts` (a `.csv` attachment goes to the mocked `resolveOoxmlCanvasContent`; no DIAL file URL is ever resolved; HTML gets the preview-frame URL) and `src/utils/tests/configure-pdf-worker.test.ts` (it sets `workerSrc` once across repeated calls, and a failed import can be retried).
  - Verification: `npx vitest run src/utils/tests/skill-file-canvas-resolvers.test.ts src/utils/tests/configure-pdf-worker.test.ts`, `npm run lint`, `npm run typecheck`.
- [x] 2.6 Add `src/components/SkillFilePreview/SkillFilePreview.tsx`, with the named props interface `SkillFilePreviewProps { fileId; fileName; onLoadFile }` exported by name and loaded with `lazy` mapping that export (the `SkillsList` pattern). It wraps the content in `<AttachmentCanvasProvider key={fileId}>`. Inside, `useSkillFilePreview` and `useOpenAttachmentCanvas(skillFileCanvasResolvers)` run, and the canvas opens on content (`skillFileToAttachment`). The component renders `AttachmentCanvasBody` in a `role="group"` named by `fileName`, with `hidePdfToolbar`, `configurePdfWorker` and `loadPdf`. It imports `@epam/ai-dial-attachment-canvas/styles.css`. The resolvers and canvas options are module-scope, so there are no per-render callbacks. No ui-kit component is used: the canvas body owns the loading and error rendering.
  - Verification: `npm run lint`, `npm run typecheck`.
- [x] 2.7 `src/components/common/AddOnDetailsPopup/AddOnDetailsPopup.tsx`: replace the prop `onLoadContentFile` with `onLoadSkillDetailsFile?` (done together with 2.8). While `pickedFile != null` and `onLoadSkillDetailsFile` is set, pass `ContentTab` a `filePreviewContent` of `<Suspense fallback={<p role="status">{labels.contentFiles.loading}</p>}><SkillFilePreview … /></Suspense>`, with `SkillFilePreview` loaded through `lazy`. Otherwise pass `undefined`. Remove the `filePreview` / `isFileLoading` props from `ContentTab`.
  - Verification: `npx vitest run src/components/common/AddOnDetailsPopup/tests/AddOnDetailsPopup.test.tsx`, `npm run lint`, `npm run typecheck`.
- [x] 2.8 `src/components/Skills/SkillDetailsPopup/SkillDetailsPopup.tsx`: pass `onLoadSkillDetailsFile` from `useEntityDetails`. Remove the now-unused `onLoadContentFile` prop from `AddOnDetailsPopup`, `onLoadContentFile` from `UseEntityDetailsResult`, and the popup-local `loadNoContentFile` default.
  - Verification: `npx vitest run src/components/Skills/SkillDetailsPopup/tests/SkillDetailsPopup.test.tsx src/hooks/tests/use-entity-details.test.tsx`, `npm run lint`, `npm run typecheck`; then the full `npm test`.

## 3. Errors, labels and theme

- [x] 3.1 `SkillFilePreview`: on `useSkillFilePreview` error, open `createForbiddenCanvasContent()` for `SkillPreviewErrorKind.Forbidden`, and `createLoadErrorCanvasContent()` otherwise, using `if`/`else`, not a nested ternary. Derive `SkillFilePreviewState` from `attachmentId === fileId && !isLoading`.
  - Verification: `npm run lint`, `npm run typecheck`.
- [x] 3.2 Add the `quickAppEditor` keys `ContentFileForbidden`, `HtmlPreviewBlocked`, `OpenInNewTab`, `PdfThumbnails`, `PdfShowThumbnails`, `PdfHideThumbnails`, `PdfPageNumber`, `PdfViewerLoading`, `PdfViewerError`, `CodeHighlightingLoading`, `CodeHighlightingError`, `SpreadsheetFormula` and `TableDownloadCsv` to `QuickAppEditorI18nKeys` in `src/constants/i18n.ts`, and to `src/i18n/locales/quick-app-editor.json`, the only locale. The English text is in the `catalog-entity-details` delta spec.
  - Verification: `npm run lint`, `npm run typecheck`, and the i18n key-coverage test if one exists under `src/i18n/`.
- [x] 3.3 `src/hooks/use-catalog-details-labels.ts`: add a memoised `canvas` label group (the `AttachmentCanvasBody` `labels`). It reuses `ContentFileUnsupported`, `ContentFileError`, `Retry`, `ConnectCopy` and the `Markdown*` keys, and uses the new keys from 3.2. `SkillFilePreview` reads it from there. The code-block theme comes from `useThemeContext().currentTheme`, dark → `CodeBlockTheme.Dark`, else `Light`.
  - Verification: `npm run lint`, `npm run typecheck`.

## 4. Tests

- [x] 4.1 `src/components/SkillFilePreview/tests/SkillFilePreview.test.tsx`, mocking `@epam/ai-dial-attachment-canvas` and `useSkillFilePreview`:
  - loaded content opens the canvas with an attachment of the right name and MIME type;
  - a `.docx` with no MIME type is inferred from its extension;
  - a forbidden error opens forbidden content and a load error opens load-error content;
  - the region is a group named by the file name;
  - the labels passed to the body are the translated `quickAppEditor` texts;
  - changing `fileId` drops the previous file's late result.

  Query by role, label and text.
  - Verification: `npx vitest run src/components/SkillFilePreview/tests/SkillFilePreview.test.tsx`.
- [x] 4.2 `src/components/common/AddOnDetailsPopup/tests/AddOnDetailsPopup.test.tsx`:
  - picking a supporting file renders the preview region in the Details tab (lazy module mocked), and the `Suspense` fallback is a status announcing `ContentFileLoading`;
  - picking `SKILL.md` again shows the manifest Markdown and no preview region;
  - without a file loader (as for a toolset or agent, which pass none) no preview renders.
  - Verification: `npx vitest run src/components/common/AddOnDetailsPopup/tests/AddOnDetailsPopup.test.tsx`, then the full `npm test`.

## 5. RTL

- [x] 5.1 Confirm `SkillFilePreview` and the `Suspense` fallback use no physical-direction classes (`ml-`, `pl-`, `left-`, `text-left` and so on) and add no directional icons. Add an RTL case to `SkillFilePreview.test.tsx`: with `document.documentElement.dir = 'rtl'`, the group region still renders and fills its container, with no `ltr`-only class.
  - Verification: `npx vitest run src/components/SkillFilePreview/tests/SkillFilePreview.test.tsx`, `npm run lint`.

## 6. Bundle check and docs

- [x] 6.1 Run `npm run build` and check `dist/` to confirm that the entry chunk does not contain `attachment-canvas` / `pdfjs` code and that a separate chunk does (for example `grep -l AttachmentCanvasBody dist/assets/*.js` names a non-entry chunk only).
  - Verification: `npm run build`.
- [x] 6.2 `docs/TECH_DEBT.md`: add the follow-up "ai-dial-chat to export the skill file preview shell (`SkillDetailsFilePreview` / `SkillFilePreview`) from a published lib so QuickApps drops its copy", and note Open Question 1 (whether `/api/v1/files/html-preview-frame` is reachable in the QuickApps deployment).
  - Verification: `npm run format:check`.
