# Spec Delta

## ADDED Requirements

### Requirement: Configuration footer holds the Edit JSON entry

The Configuration column SHALL end with a footer, separated from the rows above by a thin divider and pinned to the bottom of the column, that contains the Edit JSON link button defined by `application_json-editor`, aligned to the end edge.

#### Scenario: Footer position

- **WHEN** the editor renders Configuration at the desktop layout
- **THEN** the Edit JSON link button SHALL be at the bottom-end corner of the column, below a divider drawn in the `border-tertiary` colour
- **AND** it SHALL stay below all Configuration rows whether they are few or many

#### Scenario: Configuration column does not scroll

- **WHEN** the editor content is taller than the view at the desktop layout and the user scrolls
- **THEN** only the primary content column SHALL scroll, and its scrollbar SHALL sit at that column's own end edge, between it and the Configuration column
- **AND** there SHALL be space between that scrollbar and the cards, and the cards' shadows SHALL NOT be cut off into a band between the cards
- **AND** the Configuration column SHALL stay in place
- **AND** the Edit JSON footer SHALL stay at the bottom of the view, never scrolled out of sight
- **AND** the Configuration rows SHALL scroll inside the column only when they cannot fit in the view

#### Scenario: Right-to-left document

- **WHEN** the document direction is `rtl`
- **THEN** the link SHALL be aligned to the end edge in that direction (the physical left), using logical alignment

#### Scenario: Narrow viewport

- **WHEN** the editor is stacked below the desktop breakpoint
- **THEN** the footer SHALL follow the Configuration rows without horizontal scrolling
