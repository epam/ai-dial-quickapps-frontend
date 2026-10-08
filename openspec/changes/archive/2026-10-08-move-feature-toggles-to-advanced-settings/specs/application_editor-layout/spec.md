## MODIFIED Requirements

### Requirement: Advanced Settings controls live only in the popup
The primary content column SHALL NOT render a standalone Advanced settings (Time awareness) section, a Context and tools section, or a max attachments control. These settings SHALL be editable only from the Advanced Settings popup, including the Code Interpreter, Add attachment and Web fetch switches. The primary content column SHALL NOT render a User attachments section; attachment types SHALL be editable only from the Attachments row in Configuration. The primary content column SHALL NOT render a Context files control; context files SHALL be managed only from the Knowledge base row in Add-ons.

#### Scenario: Main column without moved controls
- **WHEN** the editor renders its primary content column
- **THEN** no Time awareness switch, File tools switch, or max attachments input SHALL be rendered there
- **AND** no Context and tools section, and no Code Interpreter, Add attachment or Web fetch switch SHALL be rendered there
- **AND** no User attachments section or Attachment types control SHALL be rendered there
- **AND** no Context files control SHALL be rendered there
