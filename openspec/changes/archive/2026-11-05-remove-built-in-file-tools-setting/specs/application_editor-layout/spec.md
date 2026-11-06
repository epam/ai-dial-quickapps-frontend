# Spec Delta

## MODIFIED Requirements

### Requirement: Settings popup changes form state only on Save

The Settings row SHALL own only transient popup visibility in local component state. The popup SHALL own its in-progress values as a local draft and SHALL change the Quick App form state (`useQuickApp2Form`) only when Save is activated. This applies to every popup control, including temperature and process files. Neither SHALL introduce a context, host message, or chat-api endpoint; persistence SHALL happen only through the editor's existing save and auto-save.

#### Scenario: Existing form contract is preserved

- **WHEN** a user opens the popup, changes temperature, process files, Time awareness or max attachments, and closes it without saving
- **THEN** model, temperature, process-files, Time awareness, and max attachments form values SHALL remain unchanged
- **AND** no chat-api endpoint SHALL be called because of the Settings row or popup
- **AND** the editor's existing memoisation and dirty-state behavior SHALL remain unchanged

#### Scenario: Saved popup values persist through the editor save

- **WHEN** a user saves the popup and the editor later saves the application
- **THEN** the saved application SHALL contain the popup values in the existing persisted fields
- **AND** no additional chat-api request SHALL be made beyond the editor's existing application update

### Requirement: Advanced Settings controls live only in the popup

The primary content column SHALL NOT render a standalone Advanced settings (Time awareness) section, a Context and tools section, or a max attachments control. These settings SHALL be editable only from the Advanced Settings popup, including the Add attachment and Web fetch switches; the Code Interpreter switch is its own row in Configuration (see "Code Interpreter row"). The primary content column SHALL NOT render a User attachments section; attachment types SHALL be editable only from the Attachments row in Configuration. The primary content column SHALL NOT render a Context files control; context files SHALL be managed only from the Knowledge base row in Add-ons.

#### Scenario: Main column without moved controls

- **WHEN** the editor renders its primary content column
- **THEN** no Time awareness switch or max attachments input SHALL be rendered there
- **AND** no Context and tools section, and no Code Interpreter, Add attachment or Web fetch switch SHALL be rendered there (Code Interpreter appears only in Configuration)
- **AND** no User attachments section or Attachment types control SHALL be rendered there
- **AND** no Context files control SHALL be rendered there
