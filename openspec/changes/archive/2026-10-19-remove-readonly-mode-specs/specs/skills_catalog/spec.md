# Spec Delta

## MODIFIED Requirements

### Requirement: The Skills row is always editable

The editor SHALL have no read-only mode: the Skills row's Add action, the remove buttons and Delete in the details popup SHALL always be available, for the user's own applications and for shared ones alike (#208).

#### Scenario: Shared application

- **WHEN** a shared application is opened in the editor
- **THEN** the Skills row's Add action, remove buttons and Delete SHALL behave as in the user's own application

## REMOVED Requirements

### Requirement: Attached skills list

**Reason**: The editor has no read-only mode, so the read-only scenarios and wording of this requirement no longer apply. OpenSpec cannot drop a scenario from a MODIFIED block, so the requirement is re-added under a renamed title.
**Migration**: See the renamed requirement in the ADDED section below; its behaviour is otherwise unchanged.

### Requirement: Remove a skill from the application

**Reason**: The editor has no read-only mode, so the read-only scenarios and wording of this requirement no longer apply. OpenSpec cannot drop a scenario from a MODIFIED block, so the requirement is re-added under a renamed title.
**Migration**: See the renamed requirement in the ADDED section below; its behaviour is otherwise unchanged.

### Requirement: Add skill popup multi-selection

**Reason**: The editor has no read-only mode, so the read-only scenarios and wording of this requirement no longer apply. OpenSpec cannot drop a scenario from a MODIFIED block, so the requirement is re-added under a renamed title.
**Migration**: See the renamed requirement in the ADDED section below; its behaviour is otherwise unchanged.

## ADDED Requirements

### Requirement: Attached skills list (editable)

The Skills row of the Add-ons card SHALL list the application's attached skills (the `agentSkills` form value, owned by `useQuickApp2Form`) in saved order. Each item SHALL show:

- the skill's avatar: `DeploymentIcon` from `@epam/ai-dial-chat-shared` with the skill name's initials, since skills have no icon,
- the skill name,
- no version: DIAL skills are unversioned, so none is shown unless a skill listing entry ever supplies one, in which case it appears as secondary text after the name.

Each item SHALL hold a button whose accessible name comes from `ApplicationEditorI18nKeys.AddOnsDetails` with the skill name interpolated (e.g. "Web Search details"); activating it SHALL open the skill details popup for that skill. Items SHALL NOT render a bordered chip box or a tooltip.

Each item SHALL also hold a remove button at its end: a ui-kit 2.0 ghost icon button with a trash icon, named by `ApplicationEditorI18nKeys.AddOnsRemove` with the skill name interpolated (e.g. "Remove Web Search"). It SHALL be visible only while the item is hovered or holds keyboard focus (`:focus-visible`), and SHALL stay in the tab order. Focus that returns to the item after a popup is closed with the mouse SHALL NOT reveal it. Activating it SHALL remove that skill id from `agentSkills` without opening the details popup, and SHALL move focus to the first remaining item. The list SHALL be read from `DataContext.skillsMap` and SHALL make no chat-api request of its own.

#### Scenario: Attached skills are listed

- **WHEN** an application loads with `agentSkills` `["skills/public/web-search", "skills/public/user-research"]` and both are in the catalog listing with names "Web Search" and "User Research"
- **THEN** the Skills row SHALL show two items in that order, each with an initials avatar ("WS", "UR") and the name
- **AND** each item SHALL have a "Remove <name>" button that is hidden until the item is hovered or focused

#### Scenario: Version is shown when available

- **WHEN** an attached skill's listing entry has no version (the case for every skill chat-api returns today)
- **THEN** its item SHALL show the avatar and the name only
- **AND** if a listing entry ever supplies a version, it SHALL be shown as secondary text after the name

#### Scenario: Attached skill missing from the catalog

- **WHEN** an attached skill id is not in `skillsMap` (deleted, or no longer visible to the user)
- **THEN** its item SHALL still be listed, using the last id segment as the name
- **AND** activating it SHALL open the details popup in its unavailable state

#### Scenario: Remove button hides after the details popup is closed with the mouse

- **WHEN** the user clicks an attached skill to open its details popup, closes the popup with the mouse (header close control or Close) and the pointer is no longer over the item
- **THEN** the item's "Remove <name>" button SHALL be hidden, even though focus returned to the item's details button
- **AND** if the popup is closed with the keyboard, the button SHALL be visible while the details button holds that keyboard focus

#### Scenario: Remove a skill from the list

- **WHEN** an editable application has `agentSkills` `["a", "b", "c"]` and the user hovers `b` and activates its trash button
- **THEN** `agentSkills` SHALL become `["a", "c"]` and the form SHALL become dirty
- **AND** the details popup SHALL NOT open
- **AND** focus SHALL move to the first remaining item

### Requirement: Remove a skill from the application (editable)

**Delete** in the details popup SHALL remove that skill id from the `agentSkills` form value and close the popup. It SHALL NOT call any chat-api skill mutation: the skill resource in DIAL SHALL remain untouched. Delete SHALL act immediately: it SHALL NOT ask for confirmation, because it only detaches the skill from this application and the skill can be attached again with Add.

#### Scenario: Delete detaches the skill

- **WHEN** an editable application has `agentSkills` `["a", "b", "c"]` and the user activates Delete in the details popup of `b`
- **THEN** `agentSkills` SHALL become `["a", "c"]`, the form SHALL become dirty, and the popup SHALL close
- **AND** saving SHALL persist the same app config `skills` entries as for `["a", "c"]`
- **AND** no request to `/api/v1/skills` other than the manifest download SHALL have been made

#### Scenario: Delete needs no confirmation

- **WHEN** the user activates Delete in the details popup of an attached skill in an editable application
- **THEN** the skill SHALL be removed and the popup closed at once, with no confirmation dialog shown

#### Scenario: Deleting the last skill

- **WHEN** the user deletes the only attached skill
- **THEN** `agentSkills` SHALL become empty and the Skills row SHALL show its empty-state description again

### Requirement: Add skill popup multi-selection (editable)

The Add skill popup SHALL support checking any number of skills and SHALL commit the checked set only on **Add**.

#### Scenario: Attached skills are pre-checked

- **WHEN** the popup opens for an application with `agentSkills` `["skills/public/user-research", "skills/public/ux-writing"]`
- **THEN** those two rows SHALL be checked and every other row unchecked
- **AND** the select-all checkbox SHALL be in the mixed state

#### Scenario: Toggle a row

- **WHEN** the user activates a row's checkbox, clicks the row, or focuses the row and presses Space
- **THEN** that row's checked state SHALL toggle
- **AND** the `agentSkills` form value SHALL NOT change yet

#### Scenario: Select all

- **WHEN** some or none of the listed rows are checked and the user activates the select-all checkbox
- **THEN** every currently listed (searched and filtered) row SHALL become checked
- **AND** activating it again while all listed rows are checked SHALL uncheck every listed row
- **AND** checked skills hidden by search or filter SHALL keep their state

#### Scenario: Confirm with Add

- **WHEN** `agentSkills` is `["a", "b"]`, the user unchecks `a`, checks `c` and `d` in that order, and activates **Add** (`ButtonsI18nKeys.Add`)
- **THEN** `agentSkills` SHALL become `["b", "c", "d"]`: previously attached skills that are still checked keep their order, and newly checked ones follow in the order they were checked
- **AND** the popup SHALL close

#### Scenario: Discard

- **WHEN** the user activates **Cancel** (`ButtonsI18nKeys.Cancel`) or ×, presses Escape, or clicks outside the dialog
- **THEN** the popup SHALL close and `agentSkills` SHALL remain unchanged
- **AND** reopening it SHALL show the attached skills checked, with search, filter and sort reset

#### Scenario: Attached skill not in the catalog

- **WHEN** an attached skill id is not in the listing
- **THEN** it SHALL have no row, SHALL stay in `agentSkills` after **Add**, and SHALL keep its position
