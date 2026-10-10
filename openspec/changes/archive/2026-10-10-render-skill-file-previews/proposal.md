## Why

Issue #239: in a skill's details popup, picking a supporting file other than `SKILL.md` (a PDF, a CSV, a Word document) shows the file's raw bytes as text, like `◇◇◇◇◇`, `||||`, `%◇◇◇`. The DIAL chat catalog shows the same file in readable form: a table for a CSV, pages for a PDF, a rendered document for a `.docx`.

The cause is in this app, not in the catalog components. The catalog `ContentTab` renders only the preview its host gives it. Today `useContentFileSelection` (`src/hooks/use-content-file-selection.ts:92-93`) calls `onLoadContentFile`, which reads the response as UTF-8 text, and always marks the result as Markdown. That repeats the catalog's text-only fallback. The chat catalog does not use this path: `CatalogView` gives the catalog a `renderContentFilePreview` slot. The slot loads the file's bytes with `onLoadSkillDetailsFile` and renders them with `@epam/ai-dial-attachment-canvas` (`apps/chat/src/components/CatalogView/SkillDetailsFilePreview.tsx` in ai-dial-chat).

## What Changes

- A picked supporting file is loaded as bytes and its MIME type, with `onLoadSkillDetailsFile` from `useCatalogItemDetails`. It is rendered with the published `@epam/ai-dial-attachment-canvas`, as in the chat catalog: a table for CSV and spreadsheets, a page viewer for PDF, rendered Office documents, images, highlighted code, Markdown and JSON. A file type the canvas cannot show gets the canvas's own "not supported" message.
- The preview goes into the catalog `ContentTab` through its existing `filePreviewContent` slot. `SKILL.md` still renders from the parsed manifest body, with no request.
- New dependencies: `@epam/ai-dial-attachment-canvas@1.2.0-rc.0`, plus `@epam/ai-dial-quotations@1.2.0-rc.0` (an optional peer that `chat-hooks`’ canvas resolvers import) and `pdfjs-dist` (imported directly for the PDF worker). This is the version that matches the chat libraries already installed (`chat-shared`, `chat-hooks` and `catalog` are all `1.2.0-rc.0`), so no other library is bumped. The canvas, together with its PDF, Office and code-highlighting dependencies, is lazy-loaded. It is fetched the first time a supporting file is opened, not with the app.
- A file that cannot be loaded shows the canvas's load-error message. When the server returns 403, it shows the canvas's forbidden message.
- New `quickAppEditor` strings for the canvas labels (see i18n below).

**Non-goals**

- The Skill Editor's retryable preview error state. The chat catalog doesn't offer one either: a failure is shown as canvas content.
- External-origin PDF credentials (chat's `allowedConnectOrigins` loader). A skill file is always in memory, so there is no URL to fetch.
- Custom visualizers. The canvas receives none.
- Toolset and agent popups. They have no file package.

**Alternatives considered**

1. *Classify the bytes into the catalog's own `CatalogContentFilePreview` types* (Markdown, Text, Image, Unsupported) with no new dependency. Rejected: CSV would show as plain text and PDF/Office as "not supported". That doesn't meet the issue's expected result ("same as in Catalog").
2. *Bump every chat library to `1.2.0-rc.1` along with the canvas.* Not needed: `attachment-canvas@1.2.0-rc.0` exists, and its peer dependency matches the installed `chat-shared@1.2.0-rc.0`. Bumping to rc.1 would be a separate upgrade.
3. *Picked:* reuse the attachment canvas exactly as chat does.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `skills_catalog`: the "Skill details content" requirement changes. A picked supporting file is no longer loaded as text and rendered as Markdown; it is rendered by the attachment canvas according to its type, with the canvas's load-error and forbidden messages.
- `catalog-entity-details`: the "Content files" bullet of the details layout requirement now names the `filePreviewContent` slot and the canvas labels that `ContentTab` gets.

## Impact

- **Code:** `src/hooks/use-entity-details.ts` (exposes `onLoadSkillDetailsFile`), `src/hooks/use-content-file-selection.ts` (keeps only the selection), `src/components/common/AddOnDetailsPopup/AddOnDetailsPopup.tsx`, `src/components/Skills/SkillDetailsPopup/SkillDetailsPopup.tsx`, a new `src/components/SkillFilePreview/` component (lazy), and new utils for the canvas resolvers and the PDF worker setup.
- **Dependencies:** `@epam/ai-dial-attachment-canvas@1.2.0-rc.0`, bringing `pdfjs-dist`, `@silurus/ooxml`, `react-syntax-highlighter` and `@epam/ai-dial-sidebar` with it. Its stylesheet `@epam/ai-dial-attachment-canvas/styles.css` is imported. This affects bundle size only for the lazy chunk.
- **API layer:** no new endpoint is called for previews. Files download through the existing `GET /api/v1/skills/files/download`. HTML previews use chat-api's `/api/v1/files/html-preview-frame`, which the same chat-api server already serves to this app. That is a cross-cutting point to verify in a deployed environment (see design).
- **Auth / host integration:** none.
- **i18n:** new `quickAppEditor` keys for the canvas labels: unsupported, load error, forbidden, HTML frame blocked and open-in-new-tab, the PDF thumbnails, show/hide and page-number labels, the PDF-viewer and syntax-highlighting loading and error labels, the spreadsheet formula label, and the table “Download as CSV” label. The full list is in the `catalog-entity-details` delta spec. The code-block copy and download labels and the table and math scroll-region labels reuse the existing `Markdown*` keys.
- **RTL:** none of this app's layout changes; the canvas wrapper uses no directional classes. The canvas's own content direction is owned by the library.
- **Rollback:** not breaking. Reverting the change and removing the dependency brings back the text and Markdown path.

**Acceptance criteria**

- Picking a `.csv`, `.pdf`, `.docx` or `.xlsx` file in a skill's details popup shows it the way the chat catalog does, never as raw bytes.
- `.md`, code and text files still render readably. `SKILL.md` still shows the manifest body without a request.
- A failed download shows the load-error message. A 403 shows the forbidden message.
- The canvas code is not part of the main bundle: the build puts it in a separate chunk.
- `npm run build`, `npm run lint` and `npm test` pass.
