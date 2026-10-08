# Spec Delta

## MODIFIED Requirements

### Requirement: Add-ons section groups add-on controls
The editor SHALL render an Add-ons section directly below Instructions. The section SHALL contain a Skills row, one merged Agents & Toolsets row, a Knowledge base row (defined by `application_knowledge-base`), and a Conversation starters row (defined by `application_conversation-starters`), in that order. Each row SHALL show its title and its action together in a row header. The Skills and Agents & Toolsets Add actions SHALL open that row's existing selection modal. The Knowledge base Add action SHALL open the file-manager popup. The Conversation starters action SHALL open the Set up conversation starters modal. The primary content column SHALL NOT render a separate Conversation starters section.

#### Scenario: Empty Add-ons section
- **WHEN** the editor loads with no selected skills, no selected agents or toolsets, no context files, and no conversation starters
- **THEN** the Add-ons heading SHALL be visible below Instructions
- **AND** the Skills, merged Agents & Toolsets, Knowledge base and Conversation starters rows SHALL each display their Add action in the row header
- **AND** no row SHALL display its populated content window

#### Scenario: Add action opens the selection modal
- **WHEN** a user activates the Add action of the Skills row or the Agents & Toolsets row in an editable editor
- **THEN** the existing selection modal for that row SHALL open
- **AND** confirming the modal SHALL update the corresponding `agentSkills` or `agentsAndToolsets` form value and close the modal

#### Scenario: No standalone starters section
- **WHEN** the editor renders its primary content column
- **THEN** no collapsible Conversation starters section SHALL be rendered outside the Add-ons card

#### Scenario: Add-on labels and localization
- **WHEN** the Add-ons section is rendered in any supported locale
- **THEN** user-visible section and row labels SHALL be translated through the `quickAppEditor` namespace keys `AddOns`, `Skills`, `AgentsAndToolsets`, `KnowledgeBase`, and `ConversationStarters`
- **AND** the Add action label and tooltips SHALL use existing `common`/`quickAppEditor` keys, and the Manage action SHALL use `quickAppEditor` key `Manage`
- **AND** no user-visible label SHALL be hardcoded in the component

#### Scenario: Add-ons accessibility
- **WHEN** a keyboard or assistive-technology user reaches the Add-ons section
- **THEN** the section and rows SHALL expose meaningful translated headings/labels
- **AND** the Add and Manage actions SHALL remain keyboard reachable and have button semantics
- **AND** hiding an empty content window SHALL not leave an orphaned `aria-expanded` control claiming that content is open

### Requirement: Advanced Settings controls live only in the popup
The primary content column SHALL NOT render a standalone Advanced settings (Time awareness) section, a File tools control inside Context and tools, or a max attachments control. These settings SHALL be editable only from the Advanced Settings popup. The primary content column SHALL NOT render a User attachments section; attachment types SHALL be editable only from the Attachments row in Configuration. The primary content column SHALL NOT render a Context files control; context files SHALL be managed only from the Knowledge base row in Add-ons.

#### Scenario: Main column without moved controls
- **WHEN** the editor renders its primary content column
- **THEN** no Time awareness switch, File tools switch, or max attachments input SHALL be rendered there
- **AND** Context and tools SHALL keep its other controls (Code interpreter, Add attachment, Web fetch) with their existing visibility
- **AND** no User attachments section or Attachment types control SHALL be rendered there
- **AND** no Context files control SHALL be rendered there
