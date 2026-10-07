## ADDED Requirements

### Requirement: Attached skills list

The Skills row of the Add-ons card SHALL list the application's attached skills (the `agentSkills` form value, owned by `useQuickApp2Form`) in saved order. Each item SHALL show:

- the skill's avatar: `DeploymentIcon` from `@epam/ai-dial-chat-shared` with the skill name's initials, since skills have no icon,
- the skill name,
- the version as secondary text, only when the catalog listing supplies one.

Each item SHALL hold a button whose accessible name comes from `quickAppEditor` key `SkillDetails` with the skill name interpolated (e.g. "Web Search details"); activating it SHALL open the skill details popup for that skill. Items SHALL NOT render a bordered chip box or a tooltip.

In an editable application, each item SHALL also hold a remove button at its end: a ui-kit 2.0 ghost icon button with a trash icon, named by `quickAppEditor` key `RemoveSkill` with the skill name interpolated (e.g. "Remove Web Search"). It SHALL be visible only while the item is hovered or holds keyboard focus, and SHALL stay in the tab order. Activating it SHALL remove that skill id from `agentSkills` without opening the details popup, and SHALL move focus to the first remaining item. Read-only and shared applications SHALL NOT render it. The list SHALL be read from `DataContext.skillsMap` and SHALL make no chat-api request of its own.

#### Scenario: Attached skills are listed

- **WHEN** an application loads with `agentSkills` `["skills/public/web-search", "skills/public/user-research"]` and both are in the catalog listing with names "Web Search" and "User Research"
- **THEN** the Skills row SHALL show two items in that order, each with an initials avatar ("WS", "UR") and the name
- **AND** each item SHALL have a "Remove <name>" button that is hidden until the item is hovered or focused

#### Scenario: Version is shown when available

- **WHEN** an attached skill's listing entry has version `1.4.6`
- **THEN** its item SHALL show "1.4.6" as secondary text after the name
- **AND** an attached skill without a version SHALL show the name only

#### Scenario: Attached skill missing from the catalog

- **WHEN** an attached skill id is not in `skillsMap` (deleted, or no longer visible to the user)
- **THEN** its item SHALL still be listed, using the last id segment as the name
- **AND** activating it SHALL open the details popup in its unavailable state

#### Scenario: Remove a skill from the list

- **WHEN** an editable application has `agentSkills` `["a", "b", "c"]` and the user hovers `b` and activates its trash button
- **THEN** `agentSkills` SHALL become `["a", "c"]` and the form SHALL become dirty
- **AND** the details popup SHALL NOT open
- **AND** focus SHALL move to the first remaining item

#### Scenario: Read-only application

- **WHEN** the editor is read-only or the application is shared
- **THEN** the attached skills SHALL still be listed and SHALL still open the details popup
- **AND** no remove button SHALL be rendered

### Requirement: Skill details popup

Activating a Skills row item SHALL open a modal dialog (ui-kit 2.0 `Popup`) for that skill. Layout, top to bottom:

- **Header:** the avatar, a caption from `quickAppEditor` key `SkillTypeLabel` ("Skill"), the skill name, and a close (×) control labelled by `common` key `CloseDialog`. The dialog's accessible name SHALL be the skill name.
- **Tabs:** ui-kit 2.0 `Tabs`, **Details** (`quickAppEditor` key `SkillDetailsTab`) and **Overview** (`quickAppEditor` key `SkillOverviewTab`). The popup SHALL open on Details.
- **Footer:**
  - **Delete** (`quickAppEditor` key `RemoveSkillFromApp`, label "Delete") at the start edge: a red (danger), solid, standard-size button with a leading trash icon.
  - **Close** (`quickAppEditor` key `Close`) at the end edge.

The open popup's skill id SHALL be local `useState` in the Skills list component. No new context SHALL be introduced.

#### Scenario: Popup opens on Details

- **WHEN** the user activates the "User Research" item
- **THEN** a dialog named "User Research" SHALL be displayed with the "Skill" caption, the Details and Overview tabs, Details selected, and Delete and Close in the footer

#### Scenario: Close

- **WHEN** the user activates **Close** or ×, presses Escape, or clicks outside the dialog
- **THEN** the popup SHALL close, the `agentSkills` form value SHALL be unchanged, and focus SHALL return to the item that opened it

### Requirement: Skill details content

The Details tab SHALL show the skill's description followed by the rendered Markdown body of the skill's `SKILL.md` manifest. The YAML frontmatter SHALL be stripped from the body.

- **Description:** the frontmatter `description`, falling back to the listing `description`.
- **Rendering:** `ContentTab` from `@epam/ai-dial-catalog` with no file tree.
- **Fetch:** the manifest SHALL be fetched only while the popup is open, through `skillsApi.downloadSkillFile` from `@epam/ai-dial-chat-api-client`.
- **State ownership:** the hook `useSkillManifest` (`src/hooks/use-skill-manifest.ts`) owns the fetch state. It SHALL ignore a response that arrives after the popup closed or switched skills.

Request: `GET /api/v1/skills/files/download?bucket={bucket}&path={path}&filePath=SKILL.md`. `bucket` and `path` are derived from the skill id `skills/{bucket}/{path}`.

Example, for skill id `skills/public/research/user-research`:

```http
GET /api/v1/skills/files/download?bucket=public&path=research%2Fuser-research&filePath=SKILL.md
```

```text
200 OK
Content-Type: text/markdown

---
name: User Research
description: Plan, conduct, and synthesize user research.
---
# User Research

Help plan, execute, and synthesize user research studies.
```

Rendered result: the description "Plan, conduct, and synthesize user research." above a "User Research" heading and its paragraph.

#### Scenario: Manifest loads

- **WHEN** the details popup opens for a skill whose `SKILL.md` is returned as above
- **THEN** the Details tab SHALL show the description and the rendered heading and paragraph
- **AND** the frontmatter lines SHALL NOT be shown

#### Scenario: Manifest loading

- **WHEN** the manifest request is pending
- **THEN** the Details tab SHALL show the listing description, plus a spinner with accessible label `quickAppEditor` key `LoadingSkillContent`

#### Scenario: Manifest fails to load

- **WHEN** the manifest request fails
- **THEN** the Details tab SHALL show the listing description and the `quickAppEditor` `FailedToLoadSkillContent` message with a **Retry** button (`quickAppEditor` key `Retry`) that repeats the request
- **AND** the Overview tab and the footer actions SHALL remain usable

#### Scenario: Manifest without frontmatter

- **WHEN** `SKILL.md` has no frontmatter block
- **THEN** the whole file SHALL be rendered as the body and the listing description SHALL be shown above it

#### Scenario: Skill unavailable

- **WHEN** the popup opens for an attached skill id that is not in `skillsMap`
- **THEN** no manifest request SHALL be made
- **AND** the Details tab SHALL show `quickAppEditor` `SkillUnavailable` ("This skill is no longer available")
- **AND** Delete SHALL still be offered in an editable application

### Requirement: Skill overview

The Overview tab SHALL list the skill's metadata from the catalog listing as label/value rows. Rows with no value SHALL be omitted. No additional chat-api request SHALL be made for the Overview tab. The rows are:

- **Author** (`quickAppEditor` key `SkillAuthor`),
- **Folder** (`quickAppEditor` key `SkillFolder`): the scope label followed by the folder segments, joined with " / ", derived the same way as the catalog Folder column,
- **Updated** (`quickAppEditor` key `SkillUpdated`): `updatedAt` formatted as a localized date in the active language,
- **Version** (`quickAppEditor` key `SkillVersion`): only when supplied.

#### Scenario: Overview content

- **WHEN** the user selects Overview for a skill with author "jane.doe", id `skills/public/research/user-research` and `updatedAt` 1759795200000
- **THEN** the tab SHALL show Author "jane.doe", Folder "Organization / research" and Updated as a localized date
- **AND** no Version row SHALL be shown when the listing has no version

### Requirement: Remove a skill from the application

**Delete** in the details popup SHALL remove that skill id from the `agentSkills` form value and close the popup. It SHALL NOT call any chat-api skill mutation: the skill resource in DIAL SHALL remain untouched. In a read-only or shared application, Delete SHALL NOT be rendered.

#### Scenario: Delete detaches the skill

- **WHEN** an editable application has `agentSkills` `["a", "b", "c"]` and the user activates Delete in the details popup of `b`
- **THEN** `agentSkills` SHALL become `["a", "c"]`, the form SHALL become dirty, and the popup SHALL close
- **AND** saving SHALL persist the same app config `skills` entries as for `["a", "c"]`
- **AND** no request to `/api/v1/skills` other than the manifest download SHALL have been made

#### Scenario: Deleting the last skill

- **WHEN** the user deletes the only attached skill
- **THEN** `agentSkills` SHALL become empty and the Skills row SHALL show its empty-state description again

#### Scenario: Read-only application

- **WHEN** the details popup opens in a read-only or shared application
- **THEN** only **Close** SHALL be rendered in the footer

### Requirement: Add skill popup catalog list

The Skills row's Add action SHALL open the Add skill popup: a modal dialog presenting skills as a catalog list, matching the model picker (`orchestrator_model-selection`) except for multi-selection. It SHALL use:

- `@epam/ai-dial-catalog`'s `ListView` (entity type `SKILL`) in its multi-select mode,
- the catalog `Filter` for the From filter.

It SHALL NOT show Favorites/Catalog tabs, a selected-items strip, a favorites column, a grid/list view toggle or a details panel.

Layout, top to bottom:

- **Dialog header:** title from `quickAppEditor` key `AddSkill` ("Add skill") and a close (×) control, separated from the body by a divider.
- **Heading row:** `quickAppEditor` key `SkillsCatalog` ("Skills catalog") followed by the number of rows currently listed, and the sort menu at the end side.
- **Toolbar:** a search input (placeholder and accessible name `quickAppEditor` key `SearchAgentSkills`, "Search skills...") followed by the From filter.
- **List:** a selection column whose header holds a select-all checkbox, then the columns **Name**, **Type**, **Folder**, **Tags**.
- **Footer:** separated from the list by a divider, with **Cancel** (ghost) and **Add** at the end side.

The popup state (search, filter, sort, checked ids) SHALL be local `useState` in the popup component. It SHALL reset each time the popup opens. The `DialSkill` → `CatalogItem` mapping SHALL be the pure util `mapSkillToCatalogItem` (`src/utils/map-skill-to-catalog-item.ts`), memoised with `useMemo` on the skill list, user bucket and scope labels. The filtered and sorted rows SHALL be memoised on those plus search, filter and sort. Hidden-folder skills SHALL be excluded, as today.

#### Scenario: Popup opens with the catalog list

- **WHEN** the user activates Add in an editable application and skills have loaded
- **THEN** a dialog named "Add skill" SHALL be displayed
- **AND** it SHALL contain "Skills catalog" with the row count, a search box, a "From" filter button, a sort menu showing "Recently updated", and a list with a select-all checkbox and column headers Name, Type, Folder and Tags

#### Scenario: Row content

- **WHEN** a skill `skills/public/web-search` named "Web Search" is listed
- **THEN** its Name cell SHALL show the initials avatar "WS" and the name, plus the version as secondary text when one is supplied
- **AND** its Type cell SHALL show the catalog's skill type label
- **AND** its Folder cell SHALL show a folder icon and "Organization", with the full path in a tooltip and in screen-reader text
- **AND** its Tags cell SHALL show the skill's tags when supplied, and be empty otherwise

#### Scenario: Folder is unknown

- **WHEN** a skill's scope cannot be determined (non-public bucket while the user bucket has not loaded)
- **THEN** its Folder cell SHALL be empty and the row SHALL still be selectable

### Requirement: Add skill popup search, filter and sort

The Add skill popup SHALL let the user narrow and reorder the rows with the same semantics as the model picker. The heading count SHALL equal the number of rows after search and filter. Searching, filtering or sorting SHALL NOT change which skills are checked.

#### Scenario: Search by name

- **WHEN** the user types "web" in the search box
- **THEN** only rows whose name contains "web" (case-insensitive, trimmed) SHALL be listed, with the matching text highlighted
- **AND** clearing the search (clear button labelled by `common` key `ClearSearch`) SHALL restore all rows

#### Scenario: Filter

- **WHEN** the user checks "My" (`quickAppEditor` key `FilterMy`) in the From filter and applies it
- **THEN** only the user's own skills (`isMy`) SHALL be listed
- **AND** the topic list SHALL contain the distinct tags of the listed skills, and is empty while chat-api supplies no tags

#### Scenario: Sort

- **WHEN** the popup opens
- **THEN** rows SHALL be sorted by "Recently updated" (`updatedAt` descending; rows without it last)
- **AND** the sort menu SHALL also offer "Newest" and "Name A-Z" (`quickAppEditor` keys `SortRecentlyUpdated`, `SortNewest`, `SortNameAZ`)

#### Scenario: No results

- **WHEN** search or filter leave no rows
- **THEN** the list area SHALL show the `quickAppEditor` `NoResultsFound` empty state and the count SHALL show 0
- **AND** **Add** SHALL stay enabled so that the checked set can still be applied

### Requirement: Add skill popup multi-selection

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

- **WHEN** `agentSkills` is `["a", "b"]`, the user unchecks `a`, checks `c` and `d` in that order, and activates **Add** (`common` key `Add`)
- **THEN** `agentSkills` SHALL become `["b", "c", "d"]`: previously attached skills that are still checked keep their order, and newly checked ones follow in the order they were checked
- **AND** the popup SHALL close

#### Scenario: Discard

- **WHEN** the user activates **Cancel** (`common` key `Cancel`) or ×, presses Escape, or clicks outside the dialog
- **THEN** the popup SHALL close and `agentSkills` SHALL remain unchanged
- **AND** reopening it SHALL show the attached skills checked, with search, filter and sort reset

#### Scenario: Attached skill not in the catalog

- **WHEN** an attached skill id is not in the listing
- **THEN** it SHALL have no row, SHALL stay in `agentSkills` after **Add**, and SHALL keep its position

#### Scenario: Read-only application

- **WHEN** the editor is read-only or the application is shared
- **THEN** the Add action SHALL be disabled with the existing shared-application tooltip, and the popup SHALL NOT open

### Requirement: Add skill popup loading and error states

The Add skill popup SHALL keep explicit loading, error and empty states while preserving its header and footer.

#### Scenario: Skills loading

- **WHEN** the `DataContext` status is `idle` or `loading`
- **THEN** the list area SHALL show a spinner with accessible label `quickAppEditor` key `LoadingSkills`
- **AND** **Add** SHALL be disabled

#### Scenario: Load error

- **WHEN** the `DataContext` status is `error`
- **THEN** the list area SHALL show `quickAppEditor` `FailedToLoadSkills` with the error text and a **Retry** button that calls `refreshAll`
- **AND** **Add** SHALL be disabled

#### Scenario: Empty catalog

- **WHEN** skills have loaded, no search or filter is active, and the catalog has no skills
- **THEN** the list area SHALL show the `quickAppEditor` `NoAgentSkillsAdded` empty state

### Requirement: Skills accessibility and direction

The Skills row, Add skill popup and details popup SHALL be keyboard operable, SHALL expose translated names, and SHALL follow the document direction.

#### Scenario: Keyboard in the Add skill popup

- **WHEN** the Add skill popup opens
- **THEN** focus SHALL move into the dialog, and Tab SHALL reach search, From, sort, the list, Cancel and Add in reading order
- **AND** the list SHALL be exposed as a grid named by `quickAppEditor` key `SkillsCatalog`
- **AND** each row checkbox SHALL be named by `quickAppEditor` key `SelectSkill` with the skill name interpolated
- **AND** the select-all checkbox SHALL be named by `quickAppEditor` key `SelectAllSkills` and expose `aria-checked="mixed"` for a partial selection

#### Scenario: Keyboard in the details popup

- **WHEN** the details popup is open
- **THEN** the tabs SHALL follow the ARIA tabs pattern (arrow keys move between Details and Overview)
- **AND** Delete and Close SHALL be reachable with Tab and activatable with Enter or Space

#### Scenario: Right-to-left locale

- **WHEN** `document.documentElement.dir` is `rtl`
- **THEN** Skills row items SHALL run avatar → name → version from right to left, with the trash button at the end (left)
- **AND** in the Add skill popup the heading SHALL be at the start (right) and the sort menu at the end (left), and the list columns SHALL run selection → Tags from right to left
- **AND** in the details popup Delete SHALL be at the start (right) and Close at the end (left)
- **AND** no icon SHALL be mirrored (avatar, folder, funnel, chevron-down, search, trash and × are not directional)

#### Scenario: Localization

- **WHEN** any of the three surfaces is rendered in a supported locale
- **THEN** every user-visible string SHALL come from the `quickAppEditor` or `common` namespace keys named in this spec, and none SHALL be hardcoded
