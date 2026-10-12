# Spec Delta

## MODIFIED Requirements

### Requirement: Max attachments is validated before Save
The max attachments draft SHALL be a positive integer when attachments are enabled (`attachmentsEnabled` is `true`), and SHALL accept an empty value or a positive integer otherwise, using the same rule as the form schema. An invalid or required-but-empty value SHALL block Save.

#### Scenario: Empty value
- **WHEN** attachments are disabled, the input is cleared and the user activates Save
- **THEN** the form value `maxInputAttachments` SHALL become empty and the saved application SHALL omit `maxInputAttachments`

#### Scenario: Empty value with attachments enabled
- **WHEN** attachments are enabled, the input is cleared and the user activates Save
- **THEN** the popup SHALL stay open
- **AND** the input SHALL be marked invalid and show the translated message `quickAppEditor.MaxAttachmentsRequired` ("Maximum attachments amount is required"), associated with the input for assistive technology
- **AND** no form value SHALL change

#### Scenario: Invalid value
- **WHEN** the input holds `0` (or any value that is not a positive integer) and the user activates Save
- **THEN** the popup SHALL stay open
- **AND** the input SHALL be marked invalid and show the translated message `quickAppEditor.MaxAttachmentsInvalid` ("Enter a whole number greater than 0"), associated with the input for assistive technology
- **AND** no form value SHALL change
