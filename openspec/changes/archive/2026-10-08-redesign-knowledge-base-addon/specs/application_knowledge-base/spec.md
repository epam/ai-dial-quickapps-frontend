# Spec Delta

## Purpose

Defines the Quick App editor's Knowledge base add-on: the Add-ons row that lists the files and folders the agent can use as context, how each item is presented (icon plus path), how items are added through the file-manager popup and removed, and how they persist as the application's context files.

## ADDED Requirements

### Requirement: Knowledge base add-on row

The Add-ons section SHALL contain a **Knowledge base** row titled with the `quickAppEditor` key `KnowledgeBase`, rendered with the same row header, typography and Add button as the other Add-ons rows. The row SHALL be driven by the editor form value `documentRelativeUrl` (owned by `useQuickApp2Form`) and hold no state of its own beyond the popup's open flag. It SHALL introduce no context and call no chat-api endpoint of its own.

#### Scenario: Empty row

- **WHEN** the application has no context files
- **THEN** the row SHALL show its description `KnowledgeBaseDescription` ("Documentation and resources for your agent.")
- **AND** the header SHALL show an **Add** action labelled with the `common` key `Add` and a plus icon
- **AND** no items list and no "No context files added" box SHALL be rendered

#### Scenario: Populated row

- **WHEN** the application has at least one context file
- **THEN** the row SHALL NOT show its description
- **AND** the header SHALL keep the same **Add** action
- **AND** the row SHALL list every context file in saved order, one item per line

#### Scenario: Read-only or shared application

- **WHEN** the editor is read-only or the application is shared
- **THEN** Add SHALL be disabled and SHALL expose the shared-application tooltip when the application is shared
- **AND** activating it SHALL NOT open the popup
- **AND** the items list, when present, SHALL remain visible without trash buttons

### Requirement: Add opens the file-manager popup

Activating Add in an editable editor SHALL open the same file-manager popup that the former Context files control opened, initialised with the current context files as the selection. Confirming the popup SHALL append the newly chosen files and folders to the context files and close the popup. Chosen ids SHALL be fully decoded, and ids already present SHALL NOT be added twice. Dismissing the popup without a selection SHALL change nothing.

#### Scenario: Add new files

- **WHEN** the application has the context file `files/abc/docs/a.pdf` and the user picks `files/abc/docs/a.pdf` and `files/abc/docs/b.pdf` in the popup and confirms
- **THEN** the context files SHALL be `files/abc/docs/a.pdf` followed by `files/abc/docs/b.pdf`
- **AND** the editor SHALL become dirty

#### Scenario: Dismiss without selection

- **WHEN** the user opens the popup and closes it without selecting anything
- **THEN** the context files and the dirty state SHALL be unchanged

### Requirement: Knowledge base item presentation

Each item SHALL be a single line made of a file-type icon and a read-only path. The icon SHALL be the UI kit `FileIcon`: a folder glyph for a folder (stored id ending in `/`) and a glyph chosen by extension for a file. The path SHALL be the UI kit `Breadcrumbs`: a root label, then each folder, then the item's name, drawn on one line without wrapping. Path segments SHALL NOT be links. The last segment SHALL be the item name, drawn semibold in primary text; earlier segments SHALL be secondary text separated by chevrons. A path with more segments than fit the trail's visible limit SHALL collapse its middle behind an ellipsis, always keeping the root label and the item name.

The root label SHALL be `Personal` (`KnowledgeBasePersonal`) for the signed-in user's own bucket, `Organization` (`KnowledgeBaseOrganization`) for the `public` bucket, and `Shared with me` (`KnowledgeBaseShared`) for any other bucket. An item stored at the root of a bucket SHALL show the root label alone as its single, semibold segment.

#### Scenario: Folder in the organization bucket

- **WHEN** the context file is the folder `files/public/user-research-reports/`
- **THEN** the item SHALL show a folder icon and the path `Organization › user-research-reports`
- **AND** `user-research-reports` SHALL be semibold and `Organization` SHALL be secondary

#### Scenario: File in nested folders

- **WHEN** the context file is `files/public/Dial-Design/survey results.pdf`
- **THEN** the item SHALL show a PDF file icon and the path `Organization › Dial-Design › survey results.pdf`

#### Scenario: Bucket root folder

- **WHEN** the context file is `files/<own bucket>/`
- **THEN** the item SHALL show a folder icon and the single segment `Personal`, semibold

#### Scenario: Deep path

- **WHEN** the context file has more folders than the trail shows
- **THEN** the path SHALL show the root label, an ellipsis control, the last visible folders and the item name
- **AND** the ellipsis control SHALL reveal the hidden segments

#### Scenario: Encoded names

- **WHEN** a stored id contains percent-encoded characters
- **THEN** the item SHALL display the decoded segment names

### Requirement: Knowledge base items are removed with a hover trash button

Each item in an editable editor SHALL have a trash icon button named by `RemoveKnowledgeBaseItem` ("Remove {{name}} from knowledge base"). The button SHALL be visually hidden until the item is hovered or contains keyboard focus, but SHALL stay in the tab order. The item SHALL show a subtle background while hovered. Activating the button SHALL remove only that item from the context files and mark the editor dirty, without a confirmation step.

#### Scenario: Reveal on hover

- **WHEN** the user moves the pointer over an item
- **THEN** the item background SHALL be tinted and its trash button SHALL become visible

#### Scenario: Reveal on keyboard focus

- **WHEN** the user tabs to an item's trash button
- **THEN** the button SHALL be visible

#### Scenario: Remove an item

- **WHEN** the user activates the trash button of the second of three items
- **THEN** the context files SHALL contain the first and third items in their original order
- **AND** keyboard focus SHALL move to the list rather than being lost

#### Scenario: Removing the last item

- **WHEN** the user removes the only item
- **THEN** the row SHALL return to its empty state with its description

### Requirement: Knowledge base persistence is unchanged

The Knowledge base items SHALL be saved as the application's context files in the same property and format as before this change: each id single-encoded on save, in the order shown. Loading an application SHALL populate the row from its saved context files.

#### Scenario: Round trip

- **WHEN** an application with two saved context files is opened, one is removed and the application is saved
- **THEN** the saved application SHALL contain only the remaining context file, single-encoded

### Requirement: Knowledge base UI is localized, direction-aware and accessible

All user-visible text SHALL come from the `quickAppEditor` and `common` namespaces and none SHALL be hardcoded. The row SHALL be exposed as a section labelled by its title. Layout SHALL use logical (start/end) alignment; the breadcrumb chevron separators SHALL mirror in right-to-left locales. The trail SHALL have an accessible name (`KnowledgeBasePathLabel`, "Path of {{name}}") and the file icon SHALL be decorative, since the path already names the item.

#### Scenario: Right-to-left locale

- **WHEN** the editor renders with an RTL locale
- **THEN** items SHALL read right to left with the trash button at the leading-opposite (inline-end) edge
- **AND** the separators SHALL point in the reading direction

#### Scenario: Assistive technology

- **WHEN** a screen reader reaches an item
- **THEN** it SHALL announce the path as a navigation landmark named for the item
- **AND** the icon SHALL NOT be announced separately
