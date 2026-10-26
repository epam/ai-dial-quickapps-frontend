# Spec Delta

## ADDED Requirements

### Requirement: Configuration footer holds the Edit JSON entry

The Configuration column SHALL end with a footer, separated from the rows above by a thin divider and pinned to the bottom of the column, that contains the Edit JSON link button defined by `application_json-editor`, aligned to the end edge.

#### Scenario: Footer position

- **WHEN** the editor renders Configuration at the desktop layout
- **THEN** the Edit JSON link button SHALL be at the bottom-end corner of the column, below a divider
- **AND** it SHALL stay below all Configuration rows whether they are few or many

#### Scenario: Right-to-left document

- **WHEN** the document direction is `rtl`
- **THEN** the link SHALL be aligned to the end edge in that direction (the physical left), using logical alignment

#### Scenario: Narrow viewport

- **WHEN** the editor is stacked below the desktop breakpoint
- **THEN** the footer SHALL follow the Configuration rows without horizontal scrolling
