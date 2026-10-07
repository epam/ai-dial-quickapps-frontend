## ADDED Requirements

### Requirement: Configuration shows an Attachments row
The Configuration area SHALL render an Attachments row directly below the Settings row. The row SHALL show the translated title `quickAppEditor.Attachments` ("Attachments"), the translated description `quickAppEditor.AttachmentsDescription` ("Lets end users upload files during a conversation. Useful for sharing documents, images, or data the agent needs to process."), and a switch at the row's trailing edge. The switch state and `inputAttachmentTypes` SHALL both be owned by the Quick App form controller (`useQuickApp2Form`). The switch SHALL reflect the form value `attachmentsEnabled`, which is a form-only field: on load it SHALL be `true` exactly when `inputAttachmentTypes` is non-empty, and it SHALL never be sent to chat-api. The Attachments section SHALL be a controlled component with no form state of its own. No context, host message or persisted field SHALL be added.

#### Scenario: Application with attachment types
- **WHEN** the editor loads an application whose `inputAttachmentTypes` is `["application/pdf"]`
- **THEN** the Attachments switch SHALL be on
- **AND** an Attachment types field SHALL be rendered below the row with an `application/pdf` tag

#### Scenario: Application without attachment types
- **WHEN** the editor loads an application whose `inputAttachmentTypes` is empty or missing
- **THEN** the Attachments switch SHALL be off
- **AND** no Attachment types field SHALL be rendered

### Requirement: Toggling Attachments updates attachment types
Turning the switch off SHALL set `attachmentsEnabled` to `false` and `inputAttachmentTypes` to `[]` in one form update. Turning it on SHALL set `attachmentsEnabled` to `true`, render the Attachment types field with no tags, and leave `inputAttachmentTypes` unchanged. While `attachmentsEnabled` is `true`, the field SHALL stay rendered even when it holds no tags, including after the last tag is removed. Previously entered types SHALL NOT be restored after turning the switch off and on again.

#### Scenario: Turn off an enabled application
- **WHEN** the switch is on with `application/pdf` and `image/png` tags and the user turns it off
- **THEN** the Attachment types field SHALL be hidden
- **AND** the form values SHALL be `attachmentsEnabled: false` and `inputAttachmentTypes: []`, and the form SHALL be dirty

#### Scenario: Turn on, then off without adding
- **WHEN** an application without attachment types is loaded, and the user turns the switch on and then off without adding anything
- **THEN** the form SHALL NOT be dirty

#### Scenario: Turn on without adding
- **WHEN** an application without attachment types is loaded and the user turns the switch on
- **THEN** the form value `attachmentsEnabled` SHALL be `true` and the form SHALL be dirty

#### Scenario: Re-enable after turning off
- **WHEN** the user turns the switch off and then on again
- **THEN** the Attachment types field SHALL show no tags

### Requirement: Attachment types is a MIME tag input with suggestions
The Attachment types field SHALL be a text input that holds the entered MIME types as removable tags, matching the attachment-types input of the DIAL admin app. It SHALL be labelled `quickAppEditor.AttachmentTypes` ("Attachment types") with a required marker. While it holds no tags it SHALL show the placeholder `quickAppEditor.EnterAttachmentTypes` ("Enter attachment types"). While there is no error it SHALL show the caption `quickAppEditor.AttachmentTypesCaption` ("Choose from suggested MIME types or add a new one using <type>/<subtype>.").

Each tag SHALL be labelled with its raw MIME string, in the order the types were added. The form value `inputAttachmentTypes` SHALL be exactly the list of tags. Saved values SHALL be shown as tags unchanged, whether or not they appear in the suggestion list.

The field SHALL suggest these MIME types. Each suggestion SHALL show a format name at the leading edge and the MIME type at the trailing edge. Format names are file-format identifiers and SHALL NOT be translated.

| Name | MIME type |
| --- | --- |
| GIF | `image/gif` |
| PNG | `image/png` |
| JPG | `image/jpeg` |
| TIFF | `image/tiff` |
| JSON | `application/json` |
| XML | `application/xml` |
| HTML | `application/html` |
| CSV | `application/csv` |
| TEXT-JSON | `text/json` |
| TEXT-XML | `text/xml` |
| TEXT-HTML | `text/html` |
| TEXT-CSV | `text/csv` |
| MARKDOWN | `text/markdown` |
| PLAIN-TEXT | `text/plain` |
| CSS | `text/css` |
| JAVASCRIPT | `text/javascript` |
| PDF | `application/pdf` |
| APNG | `image/apng` |
| AVIF | `image/avif` |
| BMP | `image/bmp` |
| ICO | `image/vnd.microsoft.icon` |
| SVG | `image/svg+xml` |
| WEBP | `image/webp` |
| X-ICON | `image/x-icon` |
| DOC | `application/msword` |
| DOCX | `application/vnd.openxmlformats-officedocument.wordprocessingml.document` |
| PDB | `chemical/x-pdb` |
| PLOTLY | `application/vnd.plotly.v1+json` |
| PPT | `application/vnd.ms-powerpoint` |
| PPTX | `application/vnd.openxmlformats-officedocument.presentationml.presentation` |
| TTYD-TABLE | `application/dial-ttyd-table` |
| UNKNOWN-BINARY | `application/octet-stream` |
| XLS | `application/vnd.ms-excel` |
| XLSX | `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` |

The suggestion list SHALL keep the order of this table.

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
- **THEN** the list SHALL show the first 5 image suggestions (GIF, PNG, JPG, TIFF, APNG) with their MIME types

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

### Requirement: Empty selection is a form validation error that blocks save
The Quick App form schema (`QuickApp2Schema`) SHALL report an error on the path `inputAttachmentTypes` with the message key `quickAppEditor.AttachmentTypesRequired` ("Select at least one attachment type") when `attachmentsEnabled` is `true` and `inputAttachmentTypes` is empty. The field SHALL be marked invalid and SHALL show the translated message in place of the caption, associated with the field for assistive technology. While this error exists, the editor's save (manual and host-triggered auto-save) SHALL NOT call chat-api, exactly as for any other invalid form value. The error SHALL clear as soon as a type is added or the switch is turned off.

#### Scenario: Enabled with nothing added
- **WHEN** the user turns the switch on and adds nothing
- **THEN** the required error SHALL be shown under the field
- **AND** a save or auto-save SHALL NOT send an application update request

#### Scenario: Last tag removed
- **WHEN** `application/pdf` is the only tag and the user removes it
- **THEN** the switch SHALL stay on, the required error SHALL be shown, and saving SHALL be blocked

#### Scenario: Error clears
- **WHEN** the required error is shown and the user adds `image/png` or turns the switch off
- **THEN** the error SHALL disappear and saving SHALL proceed

### Requirement: Attachment types persist through the existing application save
`inputAttachmentTypes` SHALL be sent as a `string[]` in the existing chat-api application update request (`@epam/ai-dial-chat-api-client` `updateApplicationBodyDto`, via `saveDialApp`). This feature adds no endpoint.

#### Scenario: Save body
- **WHEN** the editor saves an application with `application/pdf` and `image/png` tags
- **THEN** the update request body SHALL contain `"inputAttachmentTypes": ["application/pdf", "image/png"]`, for example `PUT /api/v1/applications/{id}` with `{ "inputAttachmentTypes": ["application/pdf", "image/png"], "maxInputAttachments": 5, ... }`
- **AND** a successful response SHALL return the application with the same `inputAttachmentTypes`

### Requirement: Attachments controls are read-only aware, accessible and direction-aware
When the editor is read-only or the application is shared, the switch and the attachment types input SHALL be disabled, and tags SHALL NOT be removable.

The switch SHALL use `quickAppEditor.Attachments` as its accessible name.

The text input SHALL follow the ARIA combobox pattern:
- `role="combobox"`, named by its visible label, with `aria-autocomplete="list"`;
- `aria-expanded` reflects whether the list is shown;
- `aria-controls` points to the suggestion list (`role="listbox"`);
- `aria-activedescendant` points to the highlighted suggestion (`role="option"`, `aria-selected` on the highlighted one).

The tags SHALL be a list named `quickAppEditor.AttachmentTypes`. Each remove control SHALL be named `quickAppEditor.RemoveAttachmentType` ("Remove {{type}}").

Keyboard focus SHALL reach the switch and then the text input. Suggestions SHALL NOT take focus.

The row SHALL use logical layout so the switch sits at the trailing edge in RTL. The suggestion name and MIME type SHALL sit at the leading and trailing edges of the active direction. The switch and the tag-remove × SHALL NOT be mirrored.

The section component SHALL be wrapped in `React.memo`, and its derived suggestion list and handlers SHALL be memoised (`useMemo` / `useCallback`) so unrelated form updates do not re-render it.

#### Scenario: Read-only editor
- **WHEN** the editor is read-only
- **THEN** the switch and the input SHALL be disabled, tags SHALL have no remove control, and form state SHALL NOT change

#### Scenario: Right-to-left locale
- **WHEN** the active locale is Arabic
- **THEN** the switch SHALL be at the left (trailing) edge of the row and the title at the right (leading) edge
- **AND** each suggestion SHALL show its name on the right and its MIME type on the left
- **AND** no icon SHALL be mirrored
