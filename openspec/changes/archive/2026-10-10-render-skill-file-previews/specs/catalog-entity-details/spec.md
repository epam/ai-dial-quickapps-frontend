## MODIFIED Requirements

### Requirement: Add-on details popups mirror the catalog details view

The skill, toolset and agent details popups SHALL keep the ui-kit `Popup` shell (Delete at the start, Close at the end of the footer) and SHALL lay out their content as the catalog `DetailsPanel` details view does, with the components it uses:

- **Header:** the catalog `DetailsHeader` from `@epam/ai-dial-catalog`: a 52 px icon, the type caption, the name with the version and the folder path, and the action row. The caption SHALL be translated per entity type through `texts.entityTypeLabels` (`SkillTypeLabel`, `ToolsetTypeLabel`, `AgentTypeLabel`, `Model`). `DetailsHeader` SHALL show only the toolset credentials action (`toolsets_selection`); Use in chat, Share, Publish, Edit, Download and the Manage menu SHALL be hidden.
- **Actions this app owns** (only the agent Credentials action) SHALL sit in a row
  under the header, where the catalog shows a toolset's Log in, indented by the icon
  width plus its gap (`ps-[60px]`). Settings this app owns live in app-owned tabs,
  not in this row.
- **Sections:** the tab row and the tab panel SHALL follow the header, separated by
  the catalog's 16 px gap.
- **Loading:** the loading indicator next to the tab row SHALL be the ui-kit `Skeleton` (one 72 px line) in a `role="status"` element labelled `quickAppEditor` `LoadingDetails`.
- **Markdown:** `AboutTab` and `ContentTab` SHALL receive `markdownLabels` translated through `quickAppEditor` (`MarkdownCopyCode`, `MarkdownCopiedCode`, `MarkdownDownloadCode`, `MarkdownTableScrollRegion`, `MarkdownMathScrollRegion`), so no catalog English default is shown.
- **Content files:** `ContentTab` SHALL receive the package files, the selection and the file-selector labels (`ContentFileSelectorAriaLabel`, `ContentFileCount`, `ContentFileLoading`, `ContentFileUnsupported`), as specified by `skills_catalog`. While a file other than the base file is picked, `ContentTab` SHALL receive the attachment-canvas preview in `filePreviewContent`.
- **File preview:** the preview SHALL be a `role="group"` region named by the picked file's name. Its canvas SHALL receive every label translated through `quickAppEditor`, so no English default from the canvas is shown:
  - `unsupportedLabel` → `ContentFileUnsupported`;
  - `loadErrorLabel` → `ContentFileError`;
  - `forbiddenErrorLabel` → `ContentFileForbidden`;
  - `htmlFrameBlockedLabel` → `HtmlPreviewBlocked`;
  - `htmlOpenInNewTabLabel` → `OpenInNewTab`;
  - `pdfThumbnailsLabel` → `PdfThumbnails`;
  - `pdfShowThumbnailsLabel` → `PdfShowThumbnails`;
  - `pdfHideThumbnailsLabel` → `PdfHideThumbnails`;
  - `pdfPageNumberLabel` → `PdfPageNumber`;
  - `pdfContentLoadingLabel` → `PdfViewerLoading`, `pdfContentErrorLabel` → `PdfViewerError`, `pdfContentRetryLabel` → `Retry`;
  - `codeContentLoadingLabel` → `CodeHighlightingLoading`, `codeContentErrorLabel` → `CodeHighlightingError`, `codeContentRetryLabel` → `Retry`;
  - `xlsxFormulaLabel` → `SpreadsheetFormula`;
  - `tableCopyLabel` → `ConnectCopy`, `tableCopiedLabel` → `MarkdownCopiedCode`, `tableDownloadCsvLabel` → `TableDownloadCsv`;
  - the code-block and scroll-region labels reuse `MarkdownCopyCode`, `MarkdownCopiedCode`, `MarkdownDownloadCode`, `MarkdownTableScrollRegion` and `MarkdownMathScrollRegion`.

  The visualizer and cited-location labels are not passed: a skill file never opens a custom visualizer or carries citations.

  The code-block theme SHALL follow the active app theme (dark or light). The preview SHALL fill the tab panel's height and own its own scrolling. The canvas PDF toolbar SHALL be hidden, as in the chat catalog.

New `quickAppEditor` keys (each key is its English text):

| Key                       | English                                       |
| ------------------------- | --------------------------------------------- |
| `ContentFileForbidden`    | You don't have permission to access this file |
| `HtmlPreviewBlocked`      | This page cannot be displayed in preview      |
| `OpenInNewTab`            | Open in new tab                               |
| `PdfThumbnails`           | Thumbnails                                    |
| `PdfShowThumbnails`       | Show thumbnails                               |
| `PdfHideThumbnails`       | Hide thumbnails                               |
| `PdfPageNumber`           | Page number                                   |
| `PdfViewerLoading`        | Loading the PDF viewer…                       |
| `PdfViewerError`          | Failed to load the PDF viewer                 |
| `CodeHighlightingLoading` | Loading syntax highlighting…                  |
| `CodeHighlightingError`   | Failed to load syntax highlighting            |
| `SpreadsheetFormula`      | Formula                                       |
| `TableDownloadCsv`        | Download as CSV                               |

#### Scenario: Toolset header

- **WHEN** the details popup opens for logged-out toolset `Figma` in `Organization / Design`
- **THEN** the catalog header SHALL show a 52 px icon, the caption "Toolset", the name and the folder path "Organization / Design"
- **AND** its credentials action SHALL be Log in, with no other header action

#### Scenario: Agent action row

- **WHEN** the details popup opens for an agent that shows Credentials
- **THEN** Credentials SHALL sit in a row under the header, indented by `ps-[60px]`, before the tab row
- **AND** no Connection button SHALL be rendered in that row

#### Scenario: Loading skeleton

- **WHEN** details are loading
- **THEN** a skeleton line with accessible label `LoadingDetails` SHALL be shown next to the tab row

#### Scenario: Translated Markdown controls

- **WHEN** the About tab renders a code block
- **THEN** its copy control SHALL be labelled with `quickAppEditor` `MarkdownCopyCode`

#### Scenario: File preview region

- **WHEN** a skill's supporting file `guide.pdf` is picked in the Details tab
- **THEN** `ContentTab` SHALL receive the canvas preview in `filePreviewContent`
- **AND** the preview SHALL be a `role="group"` region named "guide.pdf"
- **AND** the PDF thumbnails control SHALL be labelled with `quickAppEditor` `PdfShowThumbnails`

#### Scenario: Base file shows no canvas

- **WHEN** the Details tab shows `SKILL.md`
- **THEN** `ContentTab` SHALL receive no `filePreviewContent` and SHALL render the manifest body as Markdown

#### Scenario: Preview in a right-to-left document

- **WHEN** the document direction is `rtl` and a supporting file is previewed
- **THEN** the preview region SHALL fill the tab panel from start to end with no physical-direction offset added by this app
