# Context Files Specification

## Purpose

The file manager the editor uses to browse and manage DIAL files — My files, Shared,
Organization and the combined All view — with listing, permissions, upload, create folder, rename,
delete, download and path encoding. How the Knowledge base row uses it is in
`application_knowledge-base`.
## Requirements
### Requirement: File manager state ownership

The file manager SHALL be the `FileManagerModal` component (`src/components/common/FileManagerModal/`), rendered with `@epam/ai-dial-react-file-manager`'s `DialFileManager` inside the UI kit `Popup`. It SHALL take `isOpen`, `initialFileIds` and `onClose(fileIds)` from its caller and SHALL introduce no React context. The signed-in user's bucket SHALL come from `useAuthContext().user.bucket`. Listing, cache, permission and operation state SHALL be owned by `useDialFileManager` (`src/hooks/use-dial-file-manager.ts`), one instance per source (My files, Shared, Organization), and `useDialFileSources` (`src/hooks/use-dial-file-sources.ts`) SHALL compose the three instances and expose the active one, or the combined All view, through the same `UseDialFileManagerResult` shape. A source SHALL request nothing until it is first shown, and SHALL keep its loaded folders once it has been shown. My files SHALL request nothing while the user's bucket is unknown. The modal SHALL be wrapped in `React.memo`; the hook's tree (`items`), every callback and every option object passed to `DialFileManager` SHALL be memoised with `useMemo` / `useCallback`, so a parent re-render does not rebuild the tree. How the Knowledge base row opens the popup and consumes its result, and the popup's title, footer, tabs, All view, search, selection and upload-queue presentation, are specified by `application_knowledge-base` and are not repeated here.

#### Scenario: Sources load lazily

- **WHEN** the popup opens on My files
- **THEN** only the My files root SHALL be requested
- **AND** Shared and Organization SHALL send their first listing request only when their chip, or All, is first selected

#### Scenario: A shown source keeps its state

- **WHEN** the user opens Shared, then returns to My files and opens Shared again
- **THEN** Shared SHALL stay enabled and SHALL show the folders it had already loaded

#### Scenario: Bucket not known yet

- **WHEN** the auth session has not yet provided the user's bucket
- **THEN** no My files listing request SHALL be sent

### Requirement: Folder listing per source

Each folder SHALL be listed lazily, one request per folder the user opens, through `src/utils/dial-files-api.ts` and `@epam/ai-dial-chat-api-client`'s `FilesApi`, with `limit: 1000` on every listing except the Shared top level, which passes no limit:

- My files: `GET /api/v1/files/list` (`filesApi.listFiles`) with `bucket` = the user's bucket, `path` = the folder path relative to the bucket (`''` for the root, otherwise ending in `/`) and `permissions: true`.
- Shared, top level: `GET /api/v1/files/shared` (`filesApi.listSharedFiles`), whose items are the roots shared with the user.
- Shared, inside a root: `GET /api/v1/files/list` with the owner's `bucket`, the root's path in that bucket followed by the sub-path, and `permissions: true`. A path under a root that the top-level listing did not return SHALL list as empty without a request.
- Organization: `GET /api/v1/files/public` (`filesApi.listPublicFiles`) with `path` (omitted at the root).

Each `ListFilesItemDto` SHALL be normalised to `ListFilesItem` (`src/types/dial-files.ts`): `nodeType` `folder`/`item` to `FilesApiNodeType`, and `updatedAt` epoch milliseconds to an ISO string. The tree SHALL be a single root folder named with the source's label (`common` `DialFileManagerI18nKeys.TabMyFiles`, `TabShared`, `TabOrganization`), whose children are built from the folders loaded so far; a folder never opened SHALL have no children. Each node's `id` SHALL be the item's DIAL Core id (`path`, e.g. `files/<bucket>/docs/a.pdf`), its `name` the percent-decoded name, and its virtual `path` `/<label>/<decoded folders>/<name>` with a trailing `/` for folders. The grid SHALL show the columns Name, Updated, Size and Actions, plus Author in Shared, and SHALL format dates with the active i18n language as `{ year: 'numeric', month: 'short', day: '2-digit' }`. The Shared view SHALL pass the top-level root ids to the file manager as `sharedWithMeIds`.

Example request and response:

```http
GET /api/v1/files/list?bucket=abc&path=docs%2F&limit=1000&permissions=true
```

```json
{
  "bucket": "abc",
  "path": "docs/",
  "permissions": ["READ", "WRITE"],
  "items": [
    { "name": "spec%20v2.pdf", "path": "files/abc/docs/spec%20v2.pdf", "folderId": "files/abc/docs/",
      "nodeType": "item", "bucket": "abc", "contentType": "application/pdf",
      "contentLength": 20480, "updatedAt": 1760000000000 },
    { "name": "drafts", "path": "files/abc/docs/drafts/", "folderId": "files/abc/docs/",
      "nodeType": "folder", "bucket": "abc" }
  ]
}
```

#### Scenario: Open a subfolder

- **WHEN** the user opens `/My files/docs` and the user's bucket is `abc`
- **THEN** `listFiles` SHALL be called with `{ bucket: 'abc', path: 'docs/', permissions: true }`
- **AND** the current path SHALL become `/My files/docs/` and the folder's entries SHALL appear under `docs` in the tree

#### Scenario: Decoded names

- **WHEN** a listed item's name is `spec%20v2.pdf`
- **THEN** the row SHALL show `spec v2.pdf` and its virtual path SHALL end in `/spec v2.pdf`
- **AND** its `id` SHALL stay `files/abc/docs/spec%20v2.pdf`

#### Scenario: Shared roots and their contents

- **WHEN** the Shared top level returns the folder `Reports` with path `files/owner/reports/` in bucket `owner` and the user opens `/Shared/Reports/2024`
- **THEN** `listFiles` SHALL be called with `{ bucket: 'owner', path: 'reports/2024/', permissions: true }`
- **AND** the Author column SHALL be shown and `sharedWithMeIds` SHALL be `['files/owner/reports/']`

#### Scenario: Organization listing

- **WHEN** the user opens the Organization root
- **THEN** `listPublicFiles` SHALL be called without a path and with `limit: 1000`

#### Scenario: Listing error and retry

- **WHEN** a listing request fails
- **THEN** the popup SHALL replace the browser with an alert (`role="alert"`) showing `DialFileManagerI18nKeys.Error` ("Failed to load files") and a `Retry` button
- **AND** activating Retry SHALL request the folder again
- **AND** under All the alert SHALL be shown only when every source that has been shown fails

#### Scenario: Empty folder

- **WHEN** an opened folder has no entries
- **THEN** the grid SHALL show the empty state titled `DialFileManagerI18nKeys.Empty` ("This folder is empty")

### Requirement: Write permissions gate the actions

Upload and New folder SHALL be enabled only when the current folder carries the DIAL `WRITE` permission, taken from the item's own permissions or, failing that, from the folder listing's `permissions`. They SHALL always be disabled in Organization and at the Shared top level. While they are disabled, the Add menu SHALL be disabled with the tooltip `DialFileManagerI18nKeys.NoPermissionToCreate`. Every source SHALL offer Download (`DialFileManagerI18nKeys.Download`). Delete (`DeleteAction`) SHALL be offered only in My files, and Rename (`RenameAction`) only in My files and only where upload is enabled. Under All, these rules SHALL be those of the source owning the current folder.

#### Scenario: Writable My files folder

- **WHEN** the My files listing reports `["READ", "WRITE"]`
- **THEN** upload and New folder SHALL be enabled and Download, Delete and Rename SHALL be offered

#### Scenario: Read-only folder

- **WHEN** the listing reports only `READ`
- **THEN** upload SHALL be disabled, Rename SHALL NOT be offered and the Add menu SHALL show the `NoPermissionToCreate` tooltip

#### Scenario: Organization and Shared top level

- **WHEN** the current folder is in Organization or is the Shared top level
- **THEN** upload and New folder SHALL be disabled

### Requirement: Uploading files

Before an upload, the file manager SHALL sanitize each file name with `sanitizeFileName` (`src/utils/file-name.ts`): every character matched by the UI kit `NOT_ALLOWED_SYMBOLS_REGEXP` in the base name SHALL be replaced with `_` and trailing dots and spaces SHALL be dropped, keeping the extension; if nothing would remain, the original name SHALL be kept. Each file SHALL be sent as `POST /api/v1/files` multipart form data with the fields `file`, `bucket`, `path` (destination folder path plus file name, relative to the bucket) and `uploadMode`, with credentials and, when a CSRF token is present, the `X-CSRF-Token` header, through `XMLHttpRequest` so that upload progress is reported. In Shared the destination SHALL resolve to the owner's bucket and path. `uploadMode` SHALL be `overwrite` when the destination folder's loaded listing already has an entry with the same name, ignoring case, and `create-only` otherwise; the client SHALL never omit it. At most three files SHALL upload at the same time. Each file SHALL have its own `AbortController`: cancelling one file SHALL abort its request, or skip it if it has not started, and leave the others running. Cancelling the batch SHALL abort every file and show no notification. When the batch ends without being cancelled, an error notification titled `UploadFailed` with the message `CheckInternetConnection` SHALL be shown if every file failed, and otherwise a success notification `UploadSuccess` with `parentPath` set to the destination folder path, or to the source label at the root. The destination folder's cached listing SHALL then be dropped and the current folder listed again. The batch state SHALL stay available until the host clears it.

Example request (multipart fields):

```text
POST /api/v1/files
file=<binary a.pdf>  bucket=abc  path=docs/a.pdf  uploadMode=create-only
```

#### Scenario: Name sanitized

- **WHEN** the user uploads `a/b.txt`
- **THEN** the uploaded name SHALL NOT contain `/`

#### Scenario: Default mode is create-only

- **WHEN** the user uploads `new.pdf` into a folder that has no entry named `new.pdf`
- **THEN** the request SHALL carry `uploadMode=create-only`

#### Scenario: Replacing an existing file

- **WHEN** the user uploads `A.pdf` into a folder whose loaded listing contains `a.pdf`
- **THEN** the request SHALL carry `uploadMode=overwrite`

#### Scenario: Concurrency and per-file outcome

- **WHEN** the user uploads four files
- **THEN** three SHALL start at once and the fourth SHALL wait as queued
- **AND** a failed file SHALL be marked failed without stopping the others

#### Scenario: Cancel a queued file

- **WHEN** the user cancels the fourth file before it starts
- **THEN** it SHALL be marked cancelled and no request SHALL be sent for it

#### Scenario: Cancel the whole batch

- **WHEN** the batch is cancelled
- **THEN** every unfinished file SHALL be marked cancelled and no notification SHALL be shown

### Requirement: Upload conflict resolution labels

When an upload meets same-named files, the conflict popup of `DialFileManager` SHALL be labelled from the `common` namespace: titles `ConflictSingleTitle` / `ConflictMultipleTitle`, per-file actions `ConflictReplace`, `ConflictDuplicate` and `common` `Cancel`, strategies `ConflictReplaceAll`, `ConflictDuplicateAll` and `ConflictDecideForEach`. Choosing Replace SHALL keep the file name and so upload it with `uploadMode=overwrite`, as defined in "Uploading files".

#### Scenario: Conflict popup text

- **WHEN** the user uploads two files that both exist in the destination
- **THEN** the conflict popup SHALL be titled "Replace or Duplicate Items" and offer "Replace all", "Duplicate all" and "Decide for each"

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

### Requirement: Renaming and moving

A rename SHALL be validated in this order: empty or blank → `RenameNameEmpty`; exactly `.dial_folder` → `RenameReservedName`; contains `/` or `\`, or matches the UI kit `NOT_ALLOWED_SYMBOLS_REGEXP` → `RenameInvalidChars`; longer than 255 characters → `RenameNameTooLong`; same name as another entry of the current folder, ignoring case → `RenameDuplicateName`. The file manager's forbidden-symbol hint SHALL be `ForbiddenSymbolsTooltip`. Rename and move within one source SHALL be sent as `POST /api/v1/files/rename` (`filesApi.renameFiles`, `RenameItemDto[]`) in the user's bucket, folder paths ending in `/` and file paths without one. If some items fail, an error notification `RenamePartialError` with the failed `count` SHALL be shown; if all fail or the request fails, `RenameError`. When a renamed folder contains the open folder, the current path SHALL follow the new name. The parent folders of every source and destination SHALL then be dropped from the cache and the current folder listed again.

Example:

```json
POST /api/v1/files/rename
{ "items": [ { "bucket": "abc", "sourcePath": "docs/", "destinationPath": "papers/",
               "nodeType": "folder", "name": "docs" } ] }

200 OK
{ "results": [ { "sourcePath": "docs/", "success": true } ] }
```

#### Scenario: Rename validation

- **WHEN** the user renames `notes.txt` to `Docs` while a folder `docs` is in the same folder
- **THEN** the message SHALL be `RenameDuplicateName`
- **AND** keeping `notes.txt` unchanged SHALL be valid

#### Scenario: Forbidden symbol

- **WHEN** the new name matches the forbidden-symbols pattern
- **THEN** the message SHALL be `RenameInvalidChars`

### Requirement: Deleting items

Delete SHALL first show the file manager's confirmation, titled `DeleteConfirmTitleSingle` or `DeleteConfirmTitleMultiple`, whose body names the single item (`DeleteConfirmBodySingle`) or gives the item count (`DeleteConfirmBodyMultiple` + count + `DeleteConfirmBodyItems`), with `common` `Cancel`, `DeleteConfirmButton` and a close control named `CloseDialog`. Confirmed items SHALL be sent as `POST /api/v1/files/delete` (`filesApi.deleteFiles`, `DeleteItemDto[]`), with node types mapped to `folder` / `item`. When at least one item is deleted, a success notification SHALL be titled `ItemDeletedSuccessfully` / `ItemsDeletedSuccessfully` with `ItemDeletedFromFolder` (`fileName`, `folder`) / `ItemsDeletedFromFolder` (`count`, `folder`). When some fail, an error notification `ItemsDeletingFailed` SHALL list up to three failed names in `SomeItemsNotDeleted`, adding `AndOtherItems` with the remaining count. If the request fails, `DeleteFilesError` SHALL be shown. The affected folders SHALL be dropped from the cache and the current folder listed again, and when the open folder was deleted the current path SHALL move up to its parent.

Example:

```json
POST /api/v1/files/delete
{ "items": [ { "bucket": "abc", "path": "docs/", "name": "docs", "nodeType": "folder" } ] }

200 OK
{ "results": [ { "path": "docs/", "success": true } ] }
```

#### Scenario: Delete the open folder

- **WHEN** the user is in `/My files/docs` and deletes `docs`
- **THEN** `deleteFiles` SHALL be called with `[{ bucket: 'abc', path: 'docs/', name: 'docs', nodeType: FOLDER }]`
- **AND** a success notification SHALL be shown and the current path SHALL become `/My files`

#### Scenario: Partial failure

- **WHEN** five items are deleted and four fail
- **THEN** a success notification SHALL report the one deleted item
- **AND** an error notification SHALL name three failed items followed by " and 1 other items"

### Requirement: Downloading a file

Download SHALL support a single file only. A single file SHALL be fetched with `GET /api/v1/files/download?bucket=<bucket>&path=<decoded path in bucket>`, through a hand-written `chatApiFetch` call that returns the streaming `Response`. When the browser exposes `showSaveFilePicker`, the file SHALL be streamed into the file the user picks, with the file name suggested; when the picker is missing or throws `SecurityError` (the app runs in a cross-origin iframe), the response SHALL be saved as a blob under the `Content-Disposition` file name, with `/` and `\` stripped, or else the item's name. Dismissing the picker SHALL cancel the download without a notification. Any selection other than one file (a folder, or several items) SHALL fail without calling the archive endpoint and SHALL show `DownloadFileError` for one item or `DownloadFilesError` for several. A non-2xx response SHALL show `DownloadFileError`. While a download runs, the browser SHALL be covered by a busy overlay whose spinner is named `Downloading` and which is announced politely.

#### Scenario: Single file in a cross-origin iframe

- **WHEN** the user downloads `a.pdf` and `showSaveFilePicker` throws `SecurityError`
- **THEN** chat-api SHALL be called with `bucket` and `path` of the file
- **AND** the browser SHALL save the blob as the `Content-Disposition` name, or `a.pdf` without one

#### Scenario: Picker dismissed

- **WHEN** the user closes the save picker
- **THEN** no download request SHALL be sent and no notification SHALL be shown

#### Scenario: Folder or several items

- **WHEN** the user downloads a folder
- **THEN** no archive request SHALL be sent and the error notification "Failed to download file. Please try again later." SHALL be shown

### Requirement: Hidden files

A path SHALL count as hidden when it contains the `.dial_folder` marker (`isHiddenPath`, `src/utils/dial-file-path.ts`). The toolbar SHALL show the Show hidden files toggle labelled `ShowHiddenFiles` / `HideHiddenFiles`. A new folder name starting with `.` and a rename to `.dial_folder` SHALL be refused, as defined above. Hidden rows SHALL NOT be selectable and SHALL expose `AttachingHiddenFilesNotAllowed`, and a selected folder SHALL expand without its hidden files, as `application_knowledge-base` defines for the popup.

#### Scenario: Toggle labels

- **WHEN** the popup renders
- **THEN** the toolbar SHALL offer the toggle labelled "Show hidden files"

### Requirement: Path resolution and encoding

The file manager SHALL work with decoded names internally. A virtual path SHALL map to an API path by removing its leading `/<label>/` and ensuring a trailing `/` for folders (`virtualPathToApiPath`); the root SHALL map to `''`. In Shared, the first segment of an API path SHALL be resolved to the shared root's owner bucket and real path (`resolveOwnerCoords`); unknown roots SHALL fall back to the user's bucket unchanged. The download path of an item SHALL be taken from its DIAL Core id with the `files/<bucket>/` prefix removed and then percent-decoded (`resolveDialFileApiPath`), falling back to its virtual path. Percent-decoding SHALL never throw: a malformed sequence SHALL leave the text unchanged (`safeDecodeURI`). Query values SHALL be encoded only by `URLSearchParams` or the generated client, never by hand.

#### Scenario: Owner coordinates

- **WHEN** the Shared root `Reports` is `files/owner/reports/` and the API path is `Reports/2024/a.pdf`
- **THEN** the resolved coordinates SHALL be bucket `owner` and path `reports/2024/a.pdf`

#### Scenario: Malformed escape

- **WHEN** a name contains `%E0%A4%A`
- **THEN** it SHALL be shown unchanged instead of failing the listing

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

