# Spec Delta

## MODIFIED Requirements

### Requirement: Attached skills list

The Skills row of the Add-ons card SHALL list the application's attached skills (the `agentSkills` form value, owned by `useQuickApp2Form`) in saved order. Each item SHALL show:

- the skill's avatar: `DeploymentIcon` from `@epam/ai-dial-chat-shared` with the skill name's initials, since skills have no icon,
- the skill name,
- no version: DIAL skills are unversioned, so none is shown unless a skill listing entry ever supplies one, in which case it appears as secondary text after the name.

Each item SHALL hold a button whose accessible name comes from `ApplicationEditorI18nKeys.AddOnsDetails` with the skill name interpolated (e.g. "Web Search details"); activating it SHALL open the skill details popup for that skill. Items SHALL NOT render a bordered chip box or a tooltip.

In an editable application, each item SHALL also hold a remove button at its end: a ui-kit 2.0 ghost icon button with a trash icon, named by `ApplicationEditorI18nKeys.AddOnsRemove` with the skill name interpolated (e.g. "Remove Web Search"). It SHALL be visible only while the item is hovered or holds keyboard focus (`:focus-visible`), and SHALL stay in the tab order. Focus that returns to the item after a popup is closed with the mouse SHALL NOT reveal it. Activating it SHALL remove that skill id from `agentSkills` without opening the details popup, and SHALL move focus to the first remaining item. Read-only applications SHALL NOT render it. The list SHALL be read from `DataContext.skillsMap` and SHALL make no chat-api request of its own.

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

#### Scenario: Read-only application

- **WHEN** the editor is read-only
- **THEN** the attached skills SHALL still be listed and SHALL still open the details popup
- **AND** no remove button SHALL be rendered

### Requirement: Skill overview

The Overview tab SHALL be the catalog's `OverviewTab`, with the sections the catalog's `buildSkillOverview` produces, as defined by `catalog-entity-details`:

- **Specification** (`CatalogI18nKeys.DetailsOverviewSpecification`), from the `SKILL.md` frontmatter (parsed by the catalog's manifest parser):
  - **When to use** (`CatalogI18nKeys.DetailsSkillWhenToUse`);
  - **Allowed tools** (`CatalogI18nKeys.DetailsSkillAllowedTools`), joined with " · ";
  - **Bundled resources** (`CatalogI18nKeys.DetailsSkillBundledResources`), joined with " · ";
  - the section is omitted when none of them is present.
- **Skill** (`CatalogI18nKeys.DetailsSkillSection`):
  - **Author** (`CatalogI18nKeys.DetailsSkillAuthor`), when known;
  - **Last updated** (`CatalogI18nKeys.DetailsOverviewLastUpdated`), as the catalog's calendar date;
  - **Files** (`CatalogI18nKeys.DetailsSkillFileCount`): the number of files in the skill package.

The Overview data SHALL come from three requests, made in parallel when the popup opens (as the chat catalog does), together with the manifest download from "Skill details content":

- `skillsApi.getSkillMetadata({ bucket, path })` → `GET /api/v1/skills/metadata?bucket={bucket}&path={path}`. This is the authoritative author and timestamps; the listing entry is the fallback when it fails.
- `skillsApi.listSkillFiles({ bucket, path, filePath: '', recursive: true })` → `GET /api/v1/skills/files?bucket={bucket}&path={path}&filePath=&recursive=true`.

The Overview tab SHALL be shown only when the file listing succeeds. The folder is shown in the popup header, as for toolsets and agents. Skills are unversioned, so no version is shown in the header or as an Overview row.

Example, for skill `skills/public/research/user-research` whose frontmatter has `when_to_use: Planning interviews` and whose package has `SKILL.md` and `guide.md`:

```http
GET /api/v1/skills/files?bucket=public&path=research%2Fuser-research&filePath=&recursive=true
```

```json
{
  "items": [
    {
      "name": "SKILL.md",
      "url": "skills/public/research/user-research/SKILL.md",
      "nodeType": "ITEM"
    },
    {
      "name": "guide.md",
      "url": "skills/public/research/user-research/guide.md",
      "nodeType": "ITEM"
    }
  ]
}
```

Rendered result:

- Specification: When to use "Planning interviews".
- Skill: Author, Last updated and Files "2".

#### Scenario: Overview content

- **WHEN** the user selects Overview for a skill with author "jane.doe", `when_to_use` in its frontmatter and two package files
- **THEN** the tab SHALL show a Specification section with When to use, and a Skill section with Author "jane.doe", Last updated and Files "2"
- **AND** no Folder or Version row SHALL be shown in the tab

#### Scenario: File listing fails

- **WHEN** the file listing request fails
- **THEN** no Overview tab SHALL be shown, and Details (the manifest) SHALL still be shown

#### Scenario: Metadata request fails

- **WHEN** the metadata request fails
- **THEN** the Skill section SHALL use the author and updated date from the catalog listing

### Requirement: Remove a skill from the application

**Delete** in the details popup SHALL remove that skill id from the `agentSkills` form value and close the popup. It SHALL NOT call any chat-api skill mutation: the skill resource in DIAL SHALL remain untouched. Delete SHALL act immediately: it SHALL NOT ask for confirmation, because it only detaches the skill from this application and the skill can be attached again with Add. In a read-only application, Delete SHALL NOT be rendered.

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

#### Scenario: Read-only application

- **WHEN** the details popup opens in a read-only application
- **THEN** only **Close** SHALL be rendered in the footer

### Requirement: Add skill popup catalog list

The Skills row's Add action SHALL open the Add skill popup: a modal dialog presenting skills as a catalog list, matching the model picker (`orchestrator_model-selection`) except for multi-selection. It SHALL use:

- `@epam/ai-dial-catalog`'s `ListView` (entity type `SKILL`) in its multi-select mode,
- the catalog `Filter` for the From filter.

It SHALL NOT show Favorites/Catalog tabs, a selected-items strip, a favorites column, a grid/list view toggle or a details panel.

Layout, top to bottom:

- **Dialog header:** title from `ApplicationEditorI18nKeys.SkillsAdd` ("Add skill") and a close (×) control, separated from the body by a divider.
- **Heading row:** `ApplicationEditorI18nKeys.SkillsCatalogTitle` ("Skills catalog") followed by the number of rows currently listed, and the sort menu at the end side.
- **Toolbar:** a search input (placeholder and accessible name `ApplicationEditorI18nKeys.SkillsSearchPlaceholder`, "Search skills...") followed by the From filter.
- **List:** a selection column whose header holds a select-all checkbox, then the columns **Name**, **Type**, **Folder**, **Tags**.
- **Footer:** separated from the list by a divider, with **Cancel** (ghost) and **Add** at the end side.

The popup state (search, filter, sort, checked ids) SHALL be local `useState` in the popup component. It SHALL reset each time the popup opens. The `DialSkill` → `CatalogItem` mapping SHALL be the pure util `mapSkillToCatalogItem` (`src/utils/map-skill-to-catalog-item.ts`), memoised with `useMemo` on the skill list, user bucket and scope labels. The filtered and sorted rows SHALL be memoised on those plus search, filter and sort. Hidden-folder skills SHALL be excluded, as today.

#### Scenario: Popup opens with the catalog list

- **WHEN** the user activates Add in an editable application and skills have loaded
- **THEN** a dialog named "Add skill" SHALL be displayed
- **AND** it SHALL contain "Skills catalog" with the row count, a search box, a "From" filter button, a sort menu showing "Recently updated", and a list with a select-all checkbox and column headers Name, Type, Folder and Tags

#### Scenario: Row content

- **WHEN** a skill `skills/public/web-search` named "Web Search" is listed
- **THEN** its Name cell SHALL show the initials avatar "WS" and the name, with no version (shown as secondary text only if a listing entry ever supplies one)
- **AND** its Type cell SHALL show the catalog's skill type label
- **AND** its Folder cell SHALL show a folder icon and "Organization", with the full path in a tooltip and in screen-reader text
- **AND** its Tags cell SHALL show the skill's tags when supplied, and be empty otherwise

#### Scenario: Folder is unknown

- **WHEN** a skill's scope cannot be determined (non-public bucket while the user bucket has not loaded)
- **THEN** its Folder cell SHALL be empty and the row SHALL still be selectable

### Requirement: Skills accessibility and direction

The Skills row, Add skill popup and details popup SHALL be keyboard operable, SHALL expose translated names, and SHALL follow the document direction.

#### Scenario: Keyboard in the Add skill popup

- **WHEN** the Add skill popup opens
- **THEN** focus SHALL move into the dialog, and Tab SHALL reach search, From, sort, the list, Cancel and Add in reading order
- **AND** the list SHALL be exposed as a grid named by `ApplicationEditorI18nKeys.SkillsCatalogTitle`
- **AND** each row checkbox SHALL be named by `ApplicationEditorI18nKeys.AddOnsSelect` with the skill name interpolated
- **AND** the select-all checkbox SHALL be named by `ApplicationEditorI18nKeys.SkillsSelectAll` and expose `aria-checked="mixed"` for a partial selection

#### Scenario: Keyboard in the details popup

- **WHEN** the details popup is open
- **THEN** the tabs SHALL follow the ARIA tabs pattern (arrow keys move between Details and Overview)
- **AND** Delete and Close SHALL be reachable with Tab and activatable with Enter or Space

#### Scenario: Right-to-left document

- **WHEN** the document direction is `rtl` (as when an RTL locale is active — none ships yet, see `i18n`)
- **THEN** Skills row items SHALL run avatar → name from right to left, with the trash button at the end (left)
- **AND** in the Add skill popup the heading SHALL be at the start (right) and the sort menu at the end (left), and the list columns SHALL run selection → Tags from right to left
- **AND** in the details popup Delete SHALL be at the start (right) and Close at the end (left)
- **AND** no icon SHALL be mirrored (avatar, folder, funnel, chevron-down, search, trash and × are not directional)

#### Scenario: Localization

- **WHEN** any of the three surfaces is rendered in a supported locale
- **THEN** every user-visible string SHALL come from the translation keys named in this spec, and none SHALL be hardcoded

## ADDED Requirements

### Requirement: Read-only applications lock the Skills row

Whether the editor is read-only SHALL be decided by the host and apply to the whole Add-ons card, Skills row included; the Skills row SHALL NOT have its own permission rule. A shared application SHALL be editable like the user's own application (#208). In a read-only editor the Add action SHALL be disabled, no remove button SHALL be rendered, and the details popup SHALL offer only Close; skills SHALL still be listed and open the details popup.

#### Scenario: Read-only editor

- **WHEN** the host opens the editor as read-only
- **THEN** the Skills row's Add action SHALL be disabled, its items SHALL show no remove button, and the details popup footer SHALL hold only Close

#### Scenario: Shared application with edit access

- **WHEN** the host opens a shared application in an editable editor
- **THEN** the Skills row's Add action, remove buttons and Delete SHALL behave as in the user's own application
