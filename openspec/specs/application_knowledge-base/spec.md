# Application Knowledge Base Specification

## Purpose

Defines the Quick App editor's Knowledge base add-on: the Add-ons row that lists the files and folders the agent can use as context, how each item is presented (icon plus path), how items are added through the file-manager popup and removed, and how they persist as the application's context files.

## Requirements

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

All user-visible text SHALL come from the `quickAppEditor` and `common` namespaces and none SHALL be hardcoded. The row SHALL be exposed as a section labelled by its title. Layout SHALL use logical (start/end) alignment; the breadcrumb chevron separators SHALL mirror when the document direction is `rtl`. The trail SHALL have an accessible name (`KnowledgeBasePathLabel`, "Path of {{name}}") and the file icon SHALL be decorative, since the path already names the item.

#### Scenario: Right-to-left document

- **WHEN** the document direction is `rtl` (as when an RTL locale is active — none ships yet, see `i18n`)
- **THEN** items SHALL read right to left with the trash button at the leading-opposite (inline-end) edge
- **AND** the separators SHALL point in the reading direction

#### Scenario: Assistive technology

- **WHEN** a screen reader reaches an item
- **THEN** it SHALL announce the path as a navigation landmark named for the item
- **AND** the icon SHALL NOT be announced separately

### Requirement: Knowledge base file popup presentation

The popup opened by the Knowledge base Add action SHALL be titled with the `common` key `dialFileManager.addTitle` ("Add knowledge base file"). It SHALL show a header close control, a divider under the header, a divider above the footer and the default popup surface. The folders panel SHALL NOT show a heading. The popup SHALL keep the Show hidden files toggle and the Add (upload, new folder) menu, and SHALL show no "+" icon on that menu.

#### Scenario: Popup shell

- **WHEN** the user opens the popup
- **THEN** the title SHALL read "Add knowledge base file"
- **AND** a close control, a header divider and a footer divider SHALL be visible
- **AND** no "Files" heading SHALL appear above the tabs

#### Scenario: Close without selecting

- **WHEN** the user activates the close control, Cancel, Escape or an outside click
- **THEN** the popup SHALL close and the context files SHALL be unchanged

### Requirement: Knowledge base popup footer

The footer SHALL contain a **Cancel** button in link appearance and an **Add** button (`dialFileManager.add`, "Add") in the neutral style as the main action. Add SHALL be disabled while nothing is selected, while the listing is loading, or while an upload, rename, delete, download or folder creation is in progress. Activating Add SHALL confirm the selection exactly as the former Attach action did: files stay as their stored ids and each selected folder is expanded to the files inside it, hidden files excluded.

#### Scenario: Add disabled without selection

- **WHEN** no row is selected
- **THEN** Add SHALL be disabled and Cancel SHALL be enabled

#### Scenario: Confirm a selection

- **WHEN** the user selects a file and a folder and activates Add
- **THEN** the popup SHALL close and report the file id plus the ids of the files inside the folder
- **AND** the Knowledge base row SHALL receive them as in "Add opens the file-manager popup"

### Requirement: Knowledge base popup source tabs

The folders panel SHALL show the chips **All**, **My files**, **Shared** and **Organization** (`dialFileManager.tab.all`, `.myFiles`, `.shared`, `.organization`), with My files selected on open. Selecting a chip SHALL scope the tree and the grid to that source and clear the current selection. **All** SHALL show one top-level folder per source, labelled like the chips, in the same tree. Folders opened under All SHALL list the same entries as under the source's own tab. The Review tab SHALL NOT be offered.

#### Scenario: Default tab

- **WHEN** the popup opens
- **THEN** the chips All, My files, Shared and Organization SHALL be shown
- **AND** My files SHALL be selected

#### Scenario: All lists every source

- **WHEN** the user selects All
- **THEN** the tree SHALL show the top-level folders My files, Shared and Organization
- **AND** expanding one SHALL list its contents as its own tab does

#### Scenario: Selecting from All yields the same ids

- **WHEN** the user selects `files/public/Design/spec.pdf` under Organization in All and confirms
- **THEN** the reported id SHALL be `files/public/Design/spec.pdf`, identical to selecting it in the Organization tab

#### Scenario: Switching tabs clears the selection

- **WHEN** the user has ticked rows and selects another chip
- **THEN** no row SHALL be selected and Add SHALL be disabled
- **AND** context files already saved on the application SHALL stay unchanged

### Requirement: Knowledge base popup All view keeps full functionality

Every item under All SHALL offer the same actions, columns, permission rules and tooltips as the same item under its own source tab: opening folders, selecting, upload, new folder, rename, delete, move, copy, download, share indicators, and the Author column for shared items. Each action SHALL act on the source that owns the item or the current folder, and its result SHALL appear under both All and the source's own tab. The Add menu SHALL be disabled, with the tooltip `dialFileManager.addDisabledAtAllRoot`, only while All shows its top level (no source folder is open). A move or copy whose destination lies in a different source than its items SHALL be refused with an error notification and change nothing.

#### Scenario: Upload under All

- **WHEN** the user opens My files / `docs` under All and uploads `a.pdf`
- **THEN** the file SHALL be uploaded to `docs` in the user's bucket and listed there
- **AND** it SHALL also be listed under `docs` in the My files tab

#### Scenario: Rename and delete follow permissions

- **WHEN** the user opens a Shared folder without WRITE permission under All
- **THEN** rename, delete and upload SHALL be unavailable exactly as in the Shared tab
- **AND** under an Organization folder only the actions the Organization tab offers SHALL be available

#### Scenario: Mixed-source selection

- **WHEN** the user selects a My files item and an Organization item under All and activates download or delete
- **THEN** each item SHALL be handled by its own source and every requested item SHALL be processed

#### Scenario: Cross-source move

- **WHEN** the user moves a My files item into an Organization folder under All
- **THEN** an error notification SHALL explain that items cannot be moved between sources
- **AND** nothing SHALL be moved

#### Scenario: Add menu at the top level

- **WHEN** All shows only the three source folders
- **THEN** the Add menu SHALL be disabled with a tooltip asking the user to open a folder

### Requirement: Knowledge base popup search, sort and filters

Above the grid the popup SHALL show a search field with the placeholder `dialFileManager.searchPlaceholder` ("Search in {{folder}}...", `folder` being the current folder's name) and the Sort menu at its trailing edge. The grid SHALL NOT show a per-column filter row. Typing SHALL list the files and folders in the loaded folders of the current tab whose name contains the text, case-insensitively; clearing the text, changing folder or changing tab SHALL restore the normal listing.

#### Scenario: Search by name

- **WHEN** the My files folder lists `01folder` and `api keys.xls` and the user types `API`
- **THEN** only `api keys.xls` SHALL be listed

#### Scenario: No filter row

- **WHEN** the grid renders
- **THEN** no column filter inputs SHALL be shown under the column headers

#### Scenario: Search is reset by navigation

- **WHEN** a search is active and the user opens another folder
- **THEN** the search text SHALL be cleared and the folder's own listing SHALL be shown

### Requirement: Knowledge base popup row selection

Every selectable row SHALL show a checkbox and the header SHALL show a select-all checkbox that can express none, some and all. Several files and folders SHALL be selectable together. Hidden files and folders under a hidden marker SHALL NOT be selectable and SHALL expose the existing "attaching hidden files is not allowed" tooltip. A selected row SHALL be visually highlighted. The popup SHALL NOT show the floating bulk-actions bar (selected count, clear, Download, Delete) over the grid while rows are selected; the selection is confirmed with Add and changed through the row checkboxes.

#### Scenario: Select several rows

- **WHEN** the user ticks two rows
- **THEN** both SHALL be highlighted and Add SHALL be enabled

#### Scenario: No bulk-actions bar

- **WHEN** one or more rows are selected
- **THEN** no bar with the selected count, a clear control, Download or Delete SHALL appear over the grid
- **AND** the per-row actions available under the source tab SHALL stay available from the row

#### Scenario: Select all

- **WHEN** the user ticks the header checkbox
- **THEN** every selectable row in the listing SHALL be selected
- **AND** the header checkbox SHALL show the mixed state after one row is cleared

#### Scenario: Hidden entries

- **WHEN** a row is a hidden file
- **THEN** it SHALL have no active checkbox and SHALL expose the not-allowed tooltip

### Requirement: Knowledge base popup is localized and direction-aware

All popup text SHALL come from the `common` namespace (`dialFileManager.*`) and none SHALL be hardcoded. The Shared chip SHALL read "Shared". Layout SHALL follow the document direction. The search field and the checkbox column SHALL be keyboard operable and have accessible names.

#### Scenario: Right-to-left document

- **WHEN** the document direction is `rtl` (as when an RTL locale is active — none ships yet, see `i18n`)
- **THEN** the tabs, search row and grid SHALL lay out right to left through the library's direction handling
- **AND** the Cancel and Add buttons SHALL swap edges with the direction

### Requirement: Knowledge base popup upload progress

When the user uploads files from the Knowledge base popup, the popup SHALL show the kit `TransferQueue` at the bottom-end corner of the viewport, titled with `dialFileManager.uploadProgressTitle` ("Uploading files"). It SHALL list every file of the batch with its own status — in progress (with its percentage once the upload has started), completed, failed or canceled — and SHALL offer a cancel control for each file still in progress. Closing the queue while a file is in progress or has failed SHALL ask for confirmation and then cancel every file still in progress. When every file has completed, the queue SHALL close itself after the kit's default delay; a failed or canceled file SHALL keep it open until the user closes it. While any file is still in progress the file browser SHALL NOT accept input and Add SHALL be disabled; once no file is in progress both SHALL be available again, even while the queue is still shown. One queue SHALL be shown at a time for all source tabs, and starting a new upload SHALL replace a finished queue. Every queue string, including accessible names, SHALL come from the `common` namespace, and the queue's position SHALL follow the text direction.

#### Scenario: Per-file progress

- **WHEN** the user uploads `a.pdf` and `b.pdf`
- **THEN** the queue SHALL list both files with an in-progress status
- **AND** each row SHALL switch to completed once its upload ends

#### Scenario: Cancel one file

- **WHEN** the user cancels `b.pdf` while it is in progress
- **THEN** only `b.pdf` SHALL stop uploading and show canceled
- **AND** `a.pdf` SHALL continue

#### Scenario: Close while uploading

- **WHEN** the user closes the queue while a file is in progress
- **THEN** a confirmation SHALL be shown
- **AND** confirming SHALL cancel the remaining files and hide the queue

#### Scenario: Failed file stays visible

- **WHEN** one file fails and the others complete
- **THEN** the queue SHALL stay open with the failed row until the user closes it

#### Scenario: Input lock

- **WHEN** a file is still in progress
- **THEN** the file browser SHALL NOT accept input and Add SHALL be disabled
- **AND** when no file is in progress the browser SHALL accept input again

#### Scenario: Right-to-left document

- **WHEN** the document direction is `rtl` (as when an RTL locale is active — none ships yet, see `i18n`)
- **THEN** the queue SHALL sit at the bottom-left corner
