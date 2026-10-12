# Spec Delta

## MODIFIED Requirements

### Requirement: Toggling Attachments updates attachment types
Turning the switch off SHALL set `attachmentsEnabled` to `false` and `inputAttachmentTypes` to `[]` in one form update and SHALL keep `maxInputAttachments`. Turning it on SHALL set `attachmentsEnabled` to `true`, render the Attachment types field with no tags, leave `inputAttachmentTypes` unchanged, and, only when `maxInputAttachments` is empty, set it to the default of `1` in the same update. While `attachmentsEnabled` is `true`, the field SHALL stay rendered even when it holds no tags. Previously entered types SHALL NOT be restored after turning the switch off and on again; a previously set max SHALL be.

#### Scenario: Turn off an enabled application
- **WHEN** the switch is on with `application/pdf` and `image/png` tags and max `5`, and the user turns it off
- **THEN** the Attachment types field SHALL be hidden
- **AND** the form values SHALL be `attachmentsEnabled: false`, `inputAttachmentTypes: []` and `maxInputAttachments: 5`, and the form SHALL be dirty

#### Scenario: Turn on, then off without adding
- **WHEN** an application without attachment types or max is loaded, and the user turns the switch on and then off without changing anything else
- **THEN** `maxInputAttachments` SHALL be empty again and the form SHALL NOT be dirty

#### Scenario: Turn on without adding
- **WHEN** an application without attachment types or max is loaded and the user turns the switch on
- **THEN** `attachmentsEnabled` SHALL be `true`, `maxInputAttachments` SHALL be `1`, and the form SHALL be dirty
- **AND** saving with a type added SHALL send `maxInputAttachments: 1`

#### Scenario: Re-enable after turning off
- **WHEN** the user sets max `5` in Advanced settings, turns the switch off and then on again
- **THEN** the Attachment types field SHALL show no tags and `maxInputAttachments` SHALL be `5`

#### Scenario: Existing max is not overwritten
- **WHEN** an application with max `5` and no attachment types is loaded and the user turns the switch on
- **THEN** `maxInputAttachments` SHALL stay `5`

#### Scenario: Seeded max survives save
- **WHEN** the user turns the switch on, adds a type, saves, and then turns the switch off
- **THEN** `maxInputAttachments` SHALL stay `1` and the form SHALL be dirty relative to the saved baseline only for `attachmentsEnabled` and `inputAttachmentTypes`

#### Scenario: Max confirmed in the popup is kept
- **WHEN** the user turns the switch on, saves `1` in Advanced settings, and turns the switch off
- **THEN** `maxInputAttachments` SHALL stay `1`

#### Scenario: Max cleared while disabled
- **WHEN** attachments are disabled, the max is cleared in Advanced settings and saved, and the user turns the switch on
- **THEN** `maxInputAttachments` SHALL be `1`

## ADDED Requirements

### Requirement: Max attachments is required while attachments are enabled
`QuickApp2Schema` SHALL report an error on the path `maxInputAttachments` with the message key `quickAppEditor.MaxAttachmentsRequired` when `attachmentsEnabled` is `true` and `maxInputAttachments` is empty. While this error exists, the editor's save (manual and host-triggered auto-save) SHALL NOT call chat-api.

#### Scenario: Enabled with empty max
- **WHEN** attachments are enabled with a type selected and `maxInputAttachments` is empty
- **THEN** save and auto-save SHALL NOT send an application update request

#### Scenario: Disabled with empty max
- **WHEN** attachments are disabled and `maxInputAttachments` is empty
- **THEN** saving SHALL proceed and omit `maxInputAttachments`

### Requirement: Loaded apps with attachment types get the default max
When an application is loaded with at least one `inputAttachmentTypes` entry and no `maxInputAttachments`, the form SHALL show `maxInputAttachments` as `1`, and the form SHALL NOT be dirty.

#### Scenario: Host value is not a positive integer
- **WHEN** an application with attachment types is loaded with `maxInputAttachments` `0`, a negative number, a decimal or `null`
- **THEN** the form SHALL show `1`, and a numeric string such as `"3"` SHALL show `3`
- **AND** the form SHALL NOT be dirty

#### Scenario: Legacy application
- **WHEN** an application with `inputAttachmentTypes: ["application/pdf"]` and no `maxInputAttachments` is loaded
- **THEN** the Advanced settings input SHALL show `1`
- **AND** the form SHALL NOT be dirty
