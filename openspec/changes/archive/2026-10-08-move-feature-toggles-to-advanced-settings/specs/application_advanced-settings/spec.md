## MODIFIED Requirements

### Requirement: Popup lists the Advanced Settings controls
The Advanced Settings popup body SHALL render, in this order: the Temperature slider (when available, see "Temperature in the popup"), a max attachments number input, a Time awareness switch, a Built-in file tools switch, the Allow orchestrator to process files switch (when available, see "Allow orchestrator to process files in the popup"), and then the Code Interpreter, Add attachment and Web fetch switches (when enabled, see "Feature toggles in the popup"). Each control SHALL show its translated label, and each control except the Temperature slider SHALL show its translated helper text.

#### Scenario: Controls and copy
- **WHEN** the Advanced Settings popup opens for a model that supports temperature and accepts attachments
- **THEN** it SHALL first show the Temperature slider labelled `quickAppEditor.Temperature`
- **AND** a number input labelled with `quickAppEditor.MaxAttachmentsUserCanAdd` ("Maximum attachments amount user can add") and the hint `quickAppEditor.MaxAttachmentsHint` ("Valid only for the cases when attachments enabled for the agent") below it, with the placeholder `quickAppEditor.MaxAttachmentsPlaceholder` ("Enter the maximum number of attachments") while empty
- **AND** a switch labelled `quickAppEditor.TimeAwareness` ("Time awareness") with the description `quickAppEditor.TimeAwarenessDescription` ("Gives the agent the current date and time, helping it understand references like \"today,\" deadlines, and schedules.")
- **AND** a switch labelled `quickAppEditor.BuiltInFileTools` ("Built-in file tools") with the description `quickAppEditor.BuiltInFileToolsDescription` ("Lets the agent browse, search, read, and edit files within the app's file context. Includes write access, so worth reviewing for agents handling sensitive files.")
- **AND** a switch labelled `quickAppEditor.AllowOrchestratorToProcessFiles` with the description `quickAppEditor.ProcessFilesOnDemandDescription`
- **AND** any enabled feature toggles after it, in the order Code Interpreter, Add attachment, Web fetch
- **AND** no visible string in the popup body SHALL be hardcoded in the component

#### Scenario: Conditional controls absent
- **WHEN** the popup opens for a loaded model with no temperature support and no `inputAttachmentTypes`, and no host feature setting is enabled
- **THEN** the body SHALL show only the max attachments input, the Time awareness switch and the Built-in file tools switch, in that order

#### Scenario: Max attachments hint is informational
- **WHEN** the application has no attachment types configured
- **THEN** the max attachments input SHALL remain editable
- **AND** its value SHALL be kept and saved as entered

## ADDED Requirements

### Requirement: Feature toggles in the popup
The popup SHALL show, after the existing switches, a Code Interpreter switch when the host setting `isCodeInterpreterEnabled` is on, an Add attachment switch when `isAddAttachmentEnabled` is on, and a Web fetch switch when `isWebFetchEnabled` is on. Each SHALL be a kit `Switch` presented like the Time awareness switch, labelled with the control's title and captioned with its description. A control whose setting is off SHALL NOT render.

#### Scenario: Copy
- **WHEN** all three host settings are on and the popup opens
- **THEN** a switch labelled `quickAppEditor.CodeInterpreter` ("Code Interpreter") SHALL show the caption `quickAppEditor.CodeInterpreterInfo`
- **AND** a switch labelled `quickAppEditor.AddAttachment` ("Add attachment") SHALL show the caption `quickAppEditor.AddAttachmentDescription`
- **AND** a switch labelled `quickAppEditor.WebFetch` ("Web fetch") SHALL show the caption `quickAppEditor.WebFetchDescription`
- **AND** no "Allow the agent to ..." inline label SHALL be rendered

#### Scenario: Host setting off
- **WHEN** a host setting is off
- **THEN** the matching switch SHALL NOT render
- **AND** its saved form value SHALL be `false`, as before

#### Scenario: Read-only application
- **WHEN** the application is shared or the editor is read-only
- **THEN** the Advanced button SHALL be disabled and the popup SHALL NOT open, so the switches cannot be changed

### Requirement: Feature toggles are drafted and saved with the popup
The draft SHALL be seeded from the form values `codeInterpreter`, `addAttachment` and `webFetch`. Edits SHALL change only the draft; Save SHALL write them with the other popup values in a single update; dismissal SHALL discard them. Persistence SHALL be unchanged: the values are serialized by the editor's existing application save, with no new request and no change in saved shape.

#### Scenario: Toggle and save
- **WHEN** a user turns Web fetch on and activates Save
- **THEN** the form value `webFetch` SHALL be `true`, the popup SHALL close and the editor SHALL report a dirty state
- **AND** no chat-api request SHALL be made until the editor's own save or auto-save

#### Scenario: Toggle and dismiss
- **WHEN** a user changes any of the three switches and closes the popup without saving
- **THEN** the form values and dirty state SHALL be unchanged

#### Scenario: Unrendered toggle is preserved
- **WHEN** a host setting is off and the user saves the popup
- **THEN** the corresponding form value SHALL be written back unchanged

#### Scenario: Keyboard and names
- **WHEN** a keyboard user tabs through the popup
- **THEN** focus SHALL reach each rendered feature switch after the process files switch and before the footer actions
- **AND** each SHALL expose a switch role, its checked state and an accessible name from its label
