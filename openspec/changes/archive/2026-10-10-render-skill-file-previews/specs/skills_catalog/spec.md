## MODIFIED Requirements

### Requirement: Skill details content

The Details tab SHALL show the skill's description followed by the rendered Markdown body of the skill's `SKILL.md` manifest. The YAML frontmatter SHALL be stripped from the body.

- **Description:** the frontmatter `description`, falling back to the listing `description`.
- **Rendering:** the catalog `ContentTab` from `@epam/ai-dial-catalog`, fed `promptContent` from the catalog pipeline (`catalog-entity-details`). When the package holds more than one file, the tab SHALL show the catalog file selector above the body, opened on `SKILL.md`. Choosing `SKILL.md` again SHALL show the manifest body without a request.
- **Supporting files:** choosing any other file SHALL download its bytes through the catalog's `onLoadSkillDetailsFile` (`GET /api/v1/skills/files/download` with that `filePath`) and SHALL render them through `@epam/ai-dial-attachment-canvas`, the renderer the DIAL chat catalog uses, in `ContentTab`'s `filePreviewContent` slot. The file SHALL never be shown as its raw bytes decoded as text. The file type SHALL come from the response `Content-Type`. A missing type, or `application/octet-stream`, SHALL fall back to the file's extension. The canvas SHALL render at least:
  - CSV and spreadsheets (`.csv`, `.xlsx`) as a table;
  - PDF as pages;
  - Word and PowerPoint documents (`.docx`, `.pptx`) as a rendered document;
  - images as an image;
  - Markdown as rendered Markdown;
  - JSON, code and plain text in a code block.

  A type the canvas cannot render SHALL show `quickAppEditor` `ContentFileUnsupported`.
- **Supporting file loading:** while a picked file downloads or the canvas prepares it, the preview SHALL show the canvas loading state. A response for a file that is no longer picked, or for a popup that has closed, SHALL NOT be shown.
- **Supporting file failure:** a download that fails SHALL show `quickAppEditor` `ContentFileError`. A `403` response SHALL show `quickAppEditor` `ContentFileForbidden` instead. Picking another file and coming back SHALL request the file again.
- **Fetch:** the manifest SHALL be fetched only while the popup is open, through `skillsApi.downloadSkillFileRaw` from `@epam/ai-dial-chat-api-client`, by the catalog's `useSkillItemDetails` (inside `useCatalogItemDetails`). Supporting files SHALL be downloaded only when picked.
- **State ownership:** `useEntityDetails` (`src/hooks/use-entity-details.ts`) owns the details fetch state and exposes `onLoadSkillDetailsFile`. `useContentFileSelection` (`src/hooks/use-content-file-selection.ts`) owns which file is picked. The preview component owns the picked file's download and canvas state, in an `AttachmentCanvasProvider` keyed by the file id, so nothing carries over from one file to the next. The details fetch SHALL ignore a response that arrives after the popup closed or switched skills.
- **Loading the renderer:** the attachment canvas and its PDF, Office and code-highlighting dependencies SHALL be loaded on demand, the first time a supporting file is picked, and SHALL NOT be part of the app's initial bundle.

Request: `GET /api/v1/skills/files/download?bucket={bucket}&path={path}&filePath=SKILL.md`. `bucket` and `path` are derived from the skill id `skills/{bucket}/{path}`.

Example, for skill id `skills/public/research/user-research`:

```http
GET /api/v1/skills/files/download?bucket=public&path=research%2Fuser-research&filePath=SKILL.md
```

```text
200 OK
Content-Type: text/markdown

---
name: User Research
description: Plan, conduct, and synthesize user research.
---
# User Research

Help plan, execute, and synthesize user research studies.
```

Rendered result: the description "Plan, conduct, and synthesize user research." above a "User Research" heading and its paragraph.

Example, a supporting CSV picked in the same skill:

```http
GET /api/v1/skills/files/download?bucket=public&path=research%2Fuser-research&filePath=data%2Fparticipants.csv
```

```text
200 OK
Content-Type: text/csv

name,role
Ann,Designer
Bob,Engineer
```

Rendered result: a table with the headers "name" and "role" and two rows.

#### Scenario: Manifest loads

- **WHEN** the details popup opens for a skill whose `SKILL.md` is returned as above
- **THEN** the Details tab SHALL show the description and the rendered heading and paragraph
- **AND** the frontmatter lines SHALL NOT be shown

#### Scenario: Manifest loading

- **WHEN** the manifest request is pending
- **THEN** the Details tab SHALL show the listing description, and the loading indicator with accessible label `quickAppEditor` `LoadingDetails` SHALL be shown next to the tab row

#### Scenario: Manifest fails to load

- **WHEN** the manifest and the file listing both fail
- **THEN** the Details tab SHALL show the listing description, and the `quickAppEditor` `FailedToLoadDetails` message with a **Retry** button (`quickAppEditor` key `Retry`) that repeats the requests
- **AND** the footer actions SHALL remain usable

#### Scenario: Manifest without frontmatter

- **WHEN** `SKILL.md` has no frontmatter block
- **THEN** the whole file SHALL be rendered as the body and the listing description SHALL be shown above it

#### Scenario: Skill unavailable

- **WHEN** the popup opens for an attached skill id that is not in `skillsMap`
- **THEN** no manifest request SHALL be made
- **AND** the Details tab SHALL show `quickAppEditor` `SkillUnavailable` ("This skill is no longer available")
- **AND** Delete SHALL still be offered in an editable application

#### Scenario: Choose another package file

- **WHEN** the skill package holds `SKILL.md` and `reference/guide.md` and the user picks `reference/guide.md` in the file selector
- **THEN** `GET /api/v1/skills/files/download?bucket={bucket}&path={path}&filePath=reference%2Fguide.md` SHALL be requested once
- **AND** its Markdown SHALL be rendered in place of the manifest body in the Details tab

#### Scenario: CSV file renders as a table

- **WHEN** the user picks `data/participants.csv` and it is returned as in the example above
- **THEN** the Details tab SHALL show a table with the headers "name" and "role" and the rows "Ann, Designer" and "Bob, Engineer"
- **AND** no raw file bytes SHALL be shown as text

#### Scenario: PDF file renders as pages

- **WHEN** the user picks `docs/guide.pdf` and it is returned with `Content-Type: application/pdf`
- **THEN** the Details tab SHALL show the PDF pages through the canvas PDF viewer, not the PDF bytes as text

#### Scenario: Type inferred from the extension

- **WHEN** the user picks `docs/report.docx` and it is returned with `Content-Type: application/octet-stream`
- **THEN** the file SHALL be rendered as a Word document, from its `.docx` extension

#### Scenario: Unsupported file type

- **WHEN** the user picks `bin/tool.exe`
- **THEN** the Details tab SHALL show `quickAppEditor` `ContentFileUnsupported` ("Preview is not supported for this file")

#### Scenario: Supporting file fails to load

- **WHEN** the download for a picked supporting file fails with a 5xx or a network error
- **THEN** the Details tab SHALL show `quickAppEditor` `ContentFileError`
- **AND** the file selector and the footer actions SHALL remain usable

#### Scenario: Supporting file is forbidden

- **WHEN** the download for a picked supporting file returns `403`
- **THEN** the Details tab SHALL show `quickAppEditor` `ContentFileForbidden`

#### Scenario: Superseded pick

- **WHEN** the user picks `a.pdf` and, before it loads, picks `b.csv`
- **THEN** only `b.csv` SHALL be shown once its download completes, even if `a.pdf` finishes later

#### Scenario: Renderer loaded on demand

- **WHEN** the app loads and a skill details popup opens on `SKILL.md`
- **THEN** the attachment-canvas code SHALL NOT have been requested
- **AND** it SHALL be requested the first time a supporting file is picked
