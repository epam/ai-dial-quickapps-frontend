# Spec Delta

## ADDED Requirements

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

#### Scenario: RTL

- **WHEN** the document direction is `rtl`
- **THEN** the queue SHALL sit at the bottom-left corner
