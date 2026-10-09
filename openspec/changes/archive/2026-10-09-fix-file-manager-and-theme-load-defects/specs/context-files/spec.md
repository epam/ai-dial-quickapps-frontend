## MODIFIED Requirements

### Requirement: Creating folders

A new folder name SHALL be validated in this order, and the first failing rule SHALL report its message: empty or blank → `FolderNameEmpty`; contains `/` or `\` → `FolderNameInvalidChars`; exactly `.dial_folder` (the hidden-folder marker) → `FolderNameReserved`; starts with `.` → `FolderNameHidden`; longer than 255 characters → `FolderNameTooLong`; same name as an entry of the parent folder, ignoring case → `FolderConflict`. A valid folder SHALL be created with `POST /api/v1/files/folders` (`filesApi.createFolder`, `CreateFolderDto`), in the owner's bucket when the parent is in Shared, with `parentPath` omitted at the bucket root. On success the folder SHALL be added to the parent's listing, unless a same-named entry is already there, and the current folder SHALL be listed again. On failure an error notification `FolderCreateError` SHALL be shown.

Example:

```json
POST /api/v1/files/folders
{ "bucket": "abc", "parentPath": "docs/", "name": "drafts" }

200 OK
{ "name": "drafts", "path": "files/abc/docs/drafts/", "parentPath": "docs/", "bucket": "abc",
  "nodeType": "folder", "folderId": "files/abc/docs/" }
```

#### Scenario: Invalid names

- **WHEN** the user enters ``, `a/b`, `.hidden`, a 256-character name or `DOCS` next to an existing `docs`
- **THEN** the messages SHALL be `FolderNameEmpty`, `FolderNameInvalidChars`, `FolderNameHidden`, `FolderNameTooLong` and `FolderConflict` respectively

#### Scenario: Reserved marker name

- **WHEN** the user enters `.dial_folder`
- **THEN** the message SHALL be `FolderNameReserved` ("This name is reserved"), not `FolderNameHidden`

#### Scenario: Create at the root

- **WHEN** the user creates `fresh` at the My files root of bucket `abc`
- **THEN** `createFolder` SHALL be called with `{ bucket: 'abc', parentPath: undefined, name: 'fresh' }`

#### Scenario: Creation fails

- **WHEN** chat-api rejects the request
- **THEN** an error notification "Failed to create folder" SHALL be shown

### Requirement: Notifications, busy states, direction and accessibility

Notifications from file operations SHALL appear as a banner at the top of the popup body, with an error or success background for those variants and a neutral one otherwise, showing the optional title in semibold above the message; a banner SHALL disappear after four seconds and a new one SHALL replace it. The banner SHALL be rendered inside a live region that exists while the popup is open, whether or not a banner is shown (`aria-live="polite"`, `aria-atomic="true"`), so screen readers announce each new banner; an error banner SHALL additionally carry `role="alert"`. Deleting and renaming SHALL each cover the browser with a busy overlay whose spinner is named `DeletingLabel` or `RenamingLabel` and which is announced politely (`aria-live="polite"`). All text SHALL come from the `common` namespace; the folder chips SHALL be named `TabsAriaLabel` ("File sources") and the popup's close control `CloseDialog`. Direction SHALL follow the document `dir` through the file manager and kit components; the app's own layout SHALL use only logical or direction-agnostic classes (the upload queue anchored with `end-4`, overlays with `inset-0`), and no icon SHALL be mirrored by the app.

#### Scenario: Notification auto-dismiss

- **WHEN** a folder creation fails
- **THEN** the error banner SHALL show "Failed to create folder" and SHALL disappear after four seconds

#### Scenario: Notifications are announced

- **WHEN** the popup is open and a notification appears
- **THEN** the banner SHALL be inside the popup's polite live region, which was already rendered before the banner appeared
- **AND** an error banner SHALL have `role="alert"`, and a success banner SHALL NOT

#### Scenario: Busy overlay

- **WHEN** a delete is in progress
- **THEN** a spinner named "Deleting…" SHALL cover the browser and SHALL be removed when the delete ends

#### Scenario: Right-to-left document

- **WHEN** the document direction is `rtl` (as when an RTL locale is active — none ships yet, see `i18n`)
- **THEN** the popup SHALL render without errors
- **AND** the upload queue SHALL sit at the inline-end corner
