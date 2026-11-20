## MODIFIED Requirements

### Requirement: Toggling Attachments updates attachment types

Turning the switch off SHALL set `attachmentsEnabled` to `false` and `inputAttachmentTypes` to `[]` in one form update and SHALL keep `maxInputAttachments`. Turning it on SHALL set `attachmentsEnabled` to `true`, render the Attachment types field with no tags, leave `inputAttachmentTypes` unchanged, and, only when `maxInputAttachments` is empty, set it to the default of `10` in the same update. While `attachmentsEnabled` is `true`, the field SHALL stay rendered even when it holds no tags. Previously entered types SHALL NOT be restored after turning the switch off and on again; a previously set max SHALL be.

#### Scenario: Turn off an enabled application

- **WHEN** the switch is on with `application/pdf` and `image/png` tags and max `5`, and the user turns it off
- **THEN** the Attachment types field SHALL be hidden
- **AND** the form values SHALL be `attachmentsEnabled: false`, `inputAttachmentTypes: []` and `maxInputAttachments: 5`, and the form SHALL be dirty

#### Scenario: Turn on, then off without adding

- **WHEN** an application without attachment types or max is loaded, and the user turns the switch on and then off without changing anything else
- **THEN** `maxInputAttachments` SHALL be empty again and the form SHALL NOT be dirty

#### Scenario: Turn on without adding

- **WHEN** an application without attachment types or max is loaded and the user turns the switch on
- **THEN** `attachmentsEnabled` SHALL be `true`, `maxInputAttachments` SHALL be `10`, and the form SHALL be dirty
- **AND** saving with a type added SHALL send `maxInputAttachments: 10`

#### Scenario: Re-enable after turning off

- **WHEN** the user sets max `5` in Advanced settings, turns the switch off and then on again
- **THEN** the Attachment types field SHALL show no tags and `maxInputAttachments` SHALL be `5`

#### Scenario: Existing max is not overwritten

- **WHEN** an application with max `5` and no attachment types is loaded and the user turns the switch on
- **THEN** `maxInputAttachments` SHALL stay `5`

#### Scenario: Seeded max survives save

- **WHEN** the user turns the switch on, adds a type, saves, and then turns the switch off
- **THEN** `maxInputAttachments` SHALL stay `10` and the form SHALL be dirty relative to the saved baseline only for `attachmentsEnabled` and `inputAttachmentTypes`

#### Scenario: Max confirmed in the popup is kept

- **WHEN** the user turns the switch on, saves `10` in Advanced settings, and turns the switch off
- **THEN** `maxInputAttachments` SHALL stay `10`

#### Scenario: Max cleared while disabled

- **WHEN** attachments are disabled, the max is cleared in Advanced settings and saved, and the user turns the switch on
- **THEN** `maxInputAttachments` SHALL be `10`

### Requirement: Loaded apps with attachment types get the default max

When an application is loaded with at least one `inputAttachmentTypes` entry and no `maxInputAttachments`, the form SHALL show `maxInputAttachments` as `10`, and the form SHALL NOT be dirty.

#### Scenario: Host value is not a positive integer

- **WHEN** an application with attachment types is loaded with `maxInputAttachments` `0`, a negative number, a decimal or `null`
- **THEN** the form SHALL show `10`, and a numeric string such as `"3"` SHALL show `3`
- **AND** the form SHALL NOT be dirty

#### Scenario: Legacy application

- **WHEN** an application with `inputAttachmentTypes: ["application/pdf"]` and no `maxInputAttachments` is loaded
- **THEN** the Advanced settings input SHALL show `10`
- **AND** the form SHALL NOT be dirty

### Requirement: Attachment types is a MIME tag input with suggestions

The Attachment types field SHALL be a text input that holds the entered MIME types as removable tags, matching the attachment-types input of the DIAL admin app. It SHALL be labelled `ApplicationEditorI18nKeys.AttachmentsTypesLabel` ("Attachment types") with a required marker. While it holds no tags it SHALL show the placeholder `ApplicationEditorI18nKeys.AttachmentsTypesPlaceholder` ("Enter attachment types"). It SHALL NOT show a caption below the field.

Each tag SHALL be labelled with its raw MIME string, in the order the types were added. The form value `inputAttachmentTypes` SHALL be exactly the list of tags. Saved values SHALL be shown as tags unchanged, whether or not they appear in the suggestion list.

The field SHALL suggest these MIME types, preceded by the group suggestions in the second table below. Each suggestion SHALL show a format name at the leading edge and the MIME type at the trailing edge. Format names are file-format identifiers and SHALL NOT be translated.

| Name           | MIME type                                                                   |
| -------------- | --------------------------------------------------------------------------- |
| GIF            | `image/gif`                                                                 |
| PNG            | `image/png`                                                                 |
| JPG            | `image/jpeg`                                                                |
| TIFF           | `image/tiff`                                                                |
| JSON           | `application/json`                                                          |
| XML            | `application/xml`                                                           |
| HTML           | `application/html`                                                          |
| CSV            | `application/csv`                                                           |
| TEXT-JSON      | `text/json`                                                                 |
| TEXT-XML       | `text/xml`                                                                  |
| TEXT-HTML      | `text/html`                                                                 |
| TEXT-CSV       | `text/csv`                                                                  |
| MARKDOWN       | `text/markdown`                                                             |
| PLAIN-TEXT     | `text/plain`                                                                |
| CSS            | `text/css`                                                                  |
| JAVASCRIPT     | `text/javascript`                                                           |
| PDF            | `application/pdf`                                                           |
| APNG           | `image/apng`                                                                |
| AVIF           | `image/avif`                                                                |
| BMP            | `image/bmp`                                                                 |
| ICO            | `image/vnd.microsoft.icon`                                                  |
| SVG            | `image/svg+xml`                                                             |
| WEBP           | `image/webp`                                                                |
| X-ICON         | `image/x-icon`                                                              |
| DOC            | `application/msword`                                                        |
| DOCX           | `application/vnd.openxmlformats-officedocument.wordprocessingml.document`   |
| PDB            | `chemical/x-pdb`                                                            |
| PLOTLY         | `application/vnd.plotly.v1+json`                                            |
| PPT            | `application/vnd.ms-powerpoint`                                             |
| PPTX           | `application/vnd.openxmlformats-officedocument.presentationml.presentation` |
| TTYD-TABLE     | `application/dial-ttyd-table`                                               |
| UNKNOWN-BINARY | `application/octet-stream`                                                  |
| XLS            | `application/vnd.ms-excel`                                                  |
| XLSX           | `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`         |

The field SHALL also suggest these MIME type groups. A group matches every MIME type that starts with its prefix. Group names are identifiers and SHALL NOT be translated.

| Name            | MIME type group  |
| --------------- | ---------------- |
| ANY-IMAGE       | `image/*`        |
| ANY-TEXT        | `text/*`         |
| ANY-APPLICATION | `application/*`  |

The suggestion list SHALL show the groups first, in the order of the group table, followed by the types in the order of the first table.

Suggestion behaviour:

- Typing SHALL open the list. It SHALL show at most 5 suggestions that are not already tags and whose name or MIME type contains the typed text, case-insensitively, in list order. The first suggestion SHALL be highlighted.
- ArrowDown and ArrowUp SHALL open the list and move the highlight, wrapping at the ends.
- Enter or comma SHALL add the highlighted suggestion when the list is open and has suggestions. Otherwise it SHALL add the typed text, trimmed. After adding, the input SHALL clear and the list SHALL close.
- Clicking a suggestion SHALL add it.
- Escape and moving focus out of the field SHALL close the list. Typed text that wasn't added SHALL NOT be added on blur.
- Backspace in an empty input SHALL remove the last tag.
- Empty or whitespace-only text and values that are already tags SHALL be ignored. The format of entered text SHALL NOT be validated.
- When no suggestion matches, the list SHALL NOT be shown.

#### Scenario: Pick a suggestion by typing

- **WHEN** the user types `gif` and presses Enter
- **THEN** an `image/gif` tag SHALL be added and `inputAttachmentTypes` SHALL end with `"image/gif"`

#### Scenario: Suggestions match MIME and name

- **WHEN** the user types `image/`
- **THEN** the list SHALL show `image/*` (ANY-IMAGE) first, followed by the first 4 image type suggestions (GIF, PNG, JPG, TIFF), each with its MIME type

#### Scenario: Add a custom MIME type

- **WHEN** the user types `audio/mpeg` and presses Enter
- **THEN** an `audio/mpeg` tag SHALL be added

#### Scenario: Selected suggestions are not offered again

- **WHEN** `image/png` is already a tag and the user types `png`
- **THEN** PNG SHALL NOT be in the suggestion list

#### Scenario: Remove a tag

- **WHEN** `application/pdf` and `image/png` are tags and the user removes the `application/pdf` tag
- **THEN** `inputAttachmentTypes` SHALL be `["image/png"]`
- **AND** the Attachments switch SHALL stay on

#### Scenario: Saved values outside the list

- **WHEN** an application is loaded with `inputAttachmentTypes` `["audio/mpeg", "image/*"]`
- **THEN** tags `audio/mpeg` and `image/*` SHALL be shown
- **AND** saving without changes SHALL send both values, and the form SHALL NOT be dirty

#### Scenario: Pick a group suggestion

- **WHEN** the user types `text/` and presses Enter
- **THEN** a `text/*` tag SHALL be added and `inputAttachmentTypes` SHALL end with `"text/*"`

#### Scenario: Group suggestion matches by name

- **WHEN** the user types `any-app`
- **THEN** the list SHALL show ANY-APPLICATION with `application/*`

#### Scenario: Group coexists with concrete types

- **WHEN** `image/*` is a tag and the user also adds `image/png`
- **THEN** both tags SHALL be kept and `inputAttachmentTypes` SHALL be `["image/*", "image/png"]`
- **AND** the saved body SHALL contain both values unchanged

#### Scenario: Selected group is not offered again

- **WHEN** `image/*` is already a tag and the user types `image/`
- **THEN** ANY-IMAGE SHALL NOT be in the suggestion list
