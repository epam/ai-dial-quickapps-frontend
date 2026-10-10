## Context

In a skill's details popup, the Details tab is the catalog `ContentTab`. `AddOnDetailsPopup` (`src/components/common/AddOnDetailsPopup/AddOnDetailsPopup.tsx`) feeds it the file selection from `useContentFileSelection` (`src/hooks/use-content-file-selection.ts`). When a supporting file is picked, the hook calls `onLoadContentFile` from `useCatalogItemDetails`, which reads the response with `readSkillManifest` as UTF-8 text. The hook then wraps the result as `{ type: Markdown, text }`, so a binary file is shown as decoded garbage (issue #239).

The chat catalog renders the same pick differently. `useCatalogItemActions.renderContentFilePreview` in ai-dial-chat returns `SkillDetailsFilePreview` (`apps/chat/src/components/CatalogView/SkillDetailsFilePreview.tsx`), which does this:

1. A fresh `AttachmentCanvasProvider` is created, keyed by `fileId`.
2. `useSkillFilePreview({ fileId, onLoadFile: onLoadSkillDetailsFile })` returns `{ content, error }`. `content` holds bytes and an optional MIME type. `error` is a `SkillPreviewErrorKind`: `Forbidden` or a load error.
3. On content: `openAttachmentCanvas(skillFileToAttachment(node, content), fileId)` (from `useOpenAttachmentCanvas`) picks a renderer from the MIME type, falling back to the extension.
4. On error: `openCanvas(createForbiddenCanvasContent() | createLoadErrorCanvasContent(), fileName, fileId)`.
5. The app's `SkillFilePreview` renders `AttachmentCanvasBody` with translated labels, the code-block theme, `configurePdfWorker`, `loadPdf` and `hidePdfToolbar`.

What is already installed in this repo, all at `1.2.0-rc.0`:

- `@epam/ai-dial-chat-hooks` exports `useSkillFilePreview`, `skillFileToAttachment`, `SkillPreviewErrorKind`, every `resolve*CanvasContent` function, `hasAttachmentTextSource` and `AttachmentCanvasUrlResolvers`. `useCatalogItemDetails` returns `onLoadSkillDetailsFile` next to `onLoadContentFile`. In `chat-hooks`, `attachment-canvas` is an optional peer dependency pinned to `1.2.0-rc.0`.
- `@epam/ai-dial-catalog`'s `ContentTab` takes `filePreviewContent?: ReactNode`, which replaces the built-in preview when set.
- `@epam/ai-dial-attachment-canvas` is published. `1.2.0-rc.0` has the peer dependencies `react ^19.2.8`, `ui-kit ^0.15.0` and `chat-shared 1.2.0-rc.0`, all of which this repo already satisfies.

## Goals / Non-Goals

**Goals:**

- A picked supporting file renders exactly as in the chat catalog: the same library, the same resolvers, the same label set.
- No raw bytes are ever shown as text.
- The canvas and its heavy dependencies stay out of the main bundle.
- The base `SKILL.md` path is unchanged.

**Non-Goals:**

- A retryable error state (the chat catalog has none: failures are canvas content).
- Credentialed external PDFs: there is no URL, because the bytes are already in memory.
- Custom visualizers.
- Upgrading the chat libraries to `1.2.0-rc.1`.
- Toolset and agent popups.

## Decisions

### D1. Reuse `@epam/ai-dial-attachment-canvas@1.2.0-rc.0`; no library bump

Pin the version exactly, as the other chat libraries are pinned. It matches the installed `chat-shared` and `chat-hooks`, so npm resolves a single copy of each.

*Alternatives:*

- (a) Bump everything to rc.1. That is a wider upgrade with its own risk, and nothing here needs it.
- (b) Write a local classifier into `CatalogContentFilePreview`. It cannot render CSV, PDF or Office files (see the proposal).

### D2. The preview goes into `ContentTab.filePreviewContent`, not a reimplementation of `DetailsPanel`

`AddOnDetailsPopup` already composes catalog tabs directly. It passes `filePreviewContent` only while a non-base file is picked. Otherwise it passes `undefined`, so the tab renders the manifest Markdown from `content` exactly as it does today.

### D3. State ownership splits three ways

- **`useEntityDetails`** (`src/hooks/use-entity-details.ts`) also returns `onLoadSkillDetailsFile` from `useCatalogItemDetails`. It is a stable callback from the library, passed through unchanged. `onLoadContentFile` stays in the result type until no caller uses it, then it is removed.
- **`useContentFileSelection`** shrinks to selection state: `selectedFileId`, the picked file id and name (or `null` on the base file), `expandedFolderIds` and `isFileSelectorOpen`. It no longer loads anything, and it no longer returns `filePreview` or `isFileLoading`. The reset on item or base-file change stays the same. The file name comes from the tree node, found by id with a small util (`findContentFileNode` in `src/utils/`), since `ContentTab` takes `filePreviewContent` as a node and does not hand the name back.
- **`SkillFilePreview`** (new, `src/components/SkillFilePreview/SkillFilePreview.tsx`) owns the download and canvas state. Like chat, its default export wraps the content in `<AttachmentCanvasProvider key={fileId}>`. A superseded pick unmounts its provider, so a late result can never render. That is the stale-response guard the spec requires, and it needs no generation counter. The `ready` / `loading` state is local, using the same rule as chat: `attachmentId === fileId && !isLoading`. It is a string enum `SkillFilePreviewState` in `src/types/`.

No new context is needed: the provider is the canvas library's own and is scoped to one preview.

### D4. Lazy loading

`AddOnDetailsPopup` renders `SkillFilePreview` with `lazy(() => import('@/components/SkillFilePreview/SkillFilePreview'))`, the same pattern `SkillsList` uses for `SkillDetailsPopup` (`src/components/Skills/SkillsList/SkillsList.tsx:14`). The `Suspense` fallback is the catalog's own loading label (`ContentFileLoading`) in a `role="status"` element, so the loading state looks the same before and after the chunk arrives. The canvas stylesheet `@epam/ai-dial-attachment-canvas/styles.css` is imported inside `SkillFilePreview.tsx`, so it ships with the lazy chunk. Inside the canvas, `pdfjs-dist` and its worker are imported dynamically by `configurePdfWorker` (D6), as in chat.

*Alternative:* import the stylesheet in `main.tsx` like the catalog's. Rejected: that adds the canvas CSS to the initial load for a rarely used view.

### D5. Canvas resolvers: in-memory files, no DIAL file URLs

A file picked from a skill is always `attachment.file` (bytes), never a DIAL file id. The resolvers object, `skillFileCanvasResolvers` in `src/utils/skill-file-canvas-resolvers.ts`, is built once at module scope, mirroring chat's `useAttachmentCanvasResolvers`:

- It wraps every `resolve*CanvasContent` from `chat-hooks`, plus `hasAttachmentTextSource`, with an `AttachmentCanvasUrlResolvers` whose `resolveDialFileDownloadUrl`, `resolveDialUrl` and `resolveDialFileMetadataUrl` return `undefined`.
- `resolveReferencePdfContent` is omitted (a skill file has no reference URL), or returns `null` if the type requires it.
- `resolveContentUrl` returns `undefined`.
- `htmlSrcdocHostUrl` is `/api/v1/files/html-preview-frame`, the chat-api endpoint the chat app uses. chat-api serves this app, and it is a static bootstrap document rather than an entity call, so it involves no route of this repo's own.

*Alternative:* omit `htmlSrcdocHostUrl`, so HTML renders through plain `srcdoc` under this page's CSP. Kept as the fallback in case the endpoint is not served to this app (Open Question 1).

### D6. PDF worker

`configurePdfWorker` goes in `src/utils/configure-pdf-worker.ts`, ported from chat's `apps/chat/src/utils/pdf.ts`. It uses a dynamic `import('pdfjs-dist')` and `import('pdfjs-dist/build/pdf.worker.min.mjs?url')`, and it is memoised and idempotent. `pdfjs-dist` comes in as a dependency of the canvas. The Vite `?url` import needs no config change. `loadPdf` is a plain `fetch(url).then(r => r.blob())` same-origin loader. It is only called for URL-backed PDFs, which a skill file never is, so there is no credentialed cross-origin branch.

### D7. Labels and theme

`useCatalogDetailsLabels` gains a `canvas` group, built in the same `useMemo` as the other label groups, holding the `AttachmentCanvasBody` `labels` object (the mapping is in the `catalog-entity-details` delta spec). The code-block theme comes from `useThemeContext().currentTheme`, using the same dark/light check `ThemeContext` already does.

### D8. Loading, empty and error states

- **Chunk loading:** the `Suspense` fallback with `ContentFileLoading`.
- **Download / prepare:** `AttachmentCanvasBody isLoading`.
- **Failure:** canvas load-error content (`ContentFileError`). On `403`, canvas forbidden content (`ContentFileForbidden`).
- **Unknown type:** the canvas unsupported content (`ContentFileUnsupported`).
- **Empty file:** the canvas renders it as empty text. Nothing extra is needed.

### D9. Accessibility and RTL

- The wrapper is `role="group"`, `aria-label={fileName}`, `className="h-full min-h-0 min-w-0 overflow-hidden"`. It uses no directional classes.
- The `ContentTab` preview body is already `min-h-0 flex-1`, and the popup's tab panel is `min-h-0 flex-1 overflow-y-auto`.
- The canvas owns the keyboard access, focus and direction of its content.
- No icons are added.

## Risks / Trade-offs

- [**The bundle grows by several MB**: `pdfjs-dist`, `@silurus/ooxml`, `react-syntax-highlighter`, `@epam/ai-dial-sidebar`] → Everything sits behind the lazy boundary (D4). A task checks the build output, confirming the main entry chunk does not import `attachment-canvas`.
- [**npm resolves `@epam/ai-dial-sidebar` and other transitive dependencies at a different version** than the other chat libraries] → Check `npm ls @epam/ai-dial-chat-shared` for a single copy after install.
- [**`/api/v1/files/html-preview-frame` is not reachable from this app's deployment**] → Fall back to plain `srcdoc` (D5 alternative). This only affects `.html` supporting files.
- [**jsdom cannot render PDF or OOXML in tests**] → Component tests mock `@epam/ai-dial-attachment-canvas` and the `useSkillFilePreview` boundary, and check what the canvas is asked to open and which labels and states it gets. Real rendering is the library's responsibility, covered by its own tests.
- [**The chat catalog's preview, and this copy of its shell, drift apart**] → Both build on the same exported hooks. Only the thin shell (provider, effects, labels) is copied. A follow-up asks ai-dial-chat to export a ready-made `SkillDetailsFilePreview` from a library.

## Migration Plan

1. Add the dependency.
2. Ship the code behind the existing popup; no flag is needed.
3. Rollback: revert the commit and remove the dependency. The old text path comes back.

## Open Questions

1. Is chat-api's `/api/v1/files/html-preview-frame` served to the QuickApps deployment the same way as to chat? If not, drop `htmlSrcdocHostUrl` (D5).
2. Follow-up, upstream: export the skill file preview shell from a published ai-dial-chat library, so both hosts share one component.
