## MODIFIED Requirements

### Requirement: Attached skills list (editable)

The Skills row of the Add-ons card SHALL list the application's attached skills (the `agentSkills` form value, owned by `useQuickApp2Form`) in saved order. Each item SHALL show:

- the skill's avatar: `DeploymentIcon` from `@epam/ai-dial-chat-shared` with the skill name's initials, since skills have no icon,
- the skill name,
- no version: DIAL skills are unversioned, so none is shown unless a skill listing entry ever supplies one, in which case it appears as secondary text after the name.

**Status line.** When `DataContext.status` is `LoadStatus.Ready` and an attached skill id is not in `skillsMap`, the item SHALL show, below the name, `ApplicationEditorI18nKeys.AddOnsUnavailableRemovalRequired` with `entityType` = `ApplicationEditorI18nKeys.AddOnsEntityTypeSkill` (new key `applicationEditor.addOns.entityTypeSkill`, "skill"), which reads "The skill is not available and needs to be removed.". The severity SHALL be `EntityStatusSeverity.Error`, rendered with the ui-kit 2.0 `ErrorText` (`text-error`) by the shared row item, exactly as for the Toolsets and Agents rows (`toolsets_selection` "Attached toolsets list (editable)"). While the status is `Idle`, `Loading` or `Error`, no status line SHALL be shown. A skill found in `skillsMap` SHALL show no status line. The status line SHALL be the details button's `aria-describedby` target and SHALL NOT be a live region.

Each item SHALL hold a button whose accessible name comes from `ApplicationEditorI18nKeys.AddOnsDetails` with the skill name interpolated (e.g. "Web Search details"); activating it SHALL open the skill details popup for that skill. Items SHALL NOT render a bordered chip box or a tooltip.

Each item SHALL also hold a remove button at its end: a ui-kit 2.0 ghost icon button with a trash icon, named by `ApplicationEditorI18nKeys.AddOnsRemove` with the skill name interpolated (e.g. "Remove Web Search"). It SHALL be visible only while the item is hovered or holds keyboard focus (`:focus-visible`), and SHALL stay in the tab order. Focus that returns to the item after a popup is closed with the mouse SHALL NOT reveal it. Activating it SHALL remove that skill id from `agentSkills` without opening the details popup, and SHALL move focus to the first remaining item. The list SHALL be read from `DataContext.skillsMap` and `DataContext.status`, and SHALL make no chat-api request of its own.

#### Scenario: Attached skills are listed

- **WHEN** an application loads with `agentSkills` `["skills/public/web-search", "skills/public/user-research"]` and both are in the catalog listing with names "Web Search" and "User Research"
- **THEN** the Skills row SHALL show two items in that order, each with an initials avatar ("WS", "UR") and the name
- **AND** each item SHALL have a "Remove <name>" button that is hidden until the item is hovered or focused
- **AND** neither item SHALL show a status line

#### Scenario: Version is shown when available

- **WHEN** an attached skill's listing entry has no version (the case for every skill chat-api returns today)
- **THEN** its item SHALL show the avatar and the name only
- **AND** if a listing entry ever supplies a version, it SHALL be shown as secondary text after the name

#### Scenario: Attached skill missing from the catalog

- **WHEN** `DataContext.status` is `Ready` and an attached skill id is not in `skillsMap` (deleted, or no longer visible to the user)
- **THEN** its item SHALL still be listed, using the last id segment as the name
- **AND** it SHALL show "The skill is not available and needs to be removed." rendered as `ErrorText` (class `text-error`), as the details button's accessible description
- **AND** activating it SHALL open the details popup in its unavailable state

#### Scenario: No unavailable status before skills have loaded

- **WHEN** `DataContext.status` is `Idle`, `Loading` or `Error` and an attached skill id is not in `skillsMap`
- **THEN** its item SHALL be listed with the fallback name and SHALL show no status line

#### Scenario: Remove button hides after the details popup is closed with the mouse

- **WHEN** the user clicks an attached skill to open its details popup, closes the popup with the mouse (header close control or Close) and the pointer is no longer over the item
- **THEN** the item's "Remove <name>" button SHALL be hidden, even though focus returned to the item's details button
- **AND** if the popup is closed with the keyboard, the button SHALL be visible while the details button holds that keyboard focus

#### Scenario: Remove a skill from the list

- **WHEN** an editable application has `agentSkills` `["a", "b", "c"]` and the user hovers `b` and activates its trash button
- **THEN** `agentSkills` SHALL become `["a", "c"]` and the form SHALL become dirty
- **AND** the details popup SHALL NOT open
- **AND** focus SHALL move to the first remaining item
