# Spec Delta

## ADDED Requirements

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

#### Scenario: Right-to-left locale

- **WHEN** the popup renders with an RTL locale
- **THEN** the tabs, search row and grid SHALL lay out right to left through the library's direction handling
- **AND** the Cancel and Add buttons SHALL swap edges with the direction
