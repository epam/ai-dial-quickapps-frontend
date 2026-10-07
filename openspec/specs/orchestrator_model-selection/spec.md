# Orchestrator Model Selection Specification

## Purpose

Defines how the Quick App editor presents and changes the orchestrator settings in the Configuration column: the Default model block, the selected-model card, the model picker it opens (a catalog list with search, From filter, sort and single selection confirmed with Add), the Temperature control and the Process files control. State stays in the editor's form state (`useQuickApp2Form`) through the `model`, `temperature` and `processLargeFiles` fields, and model data comes from `DataContext`; the picker keeps its search, filter, sort and highlighted row in local state.

## Requirements

### Requirement: Default model block

The Configuration area SHALL present the orchestrator model selection as a **Default model** block. The block SHALL have a caption heading and an end-aligned **Change** action in the same header row, with the selected-model card below the header. State SHALL remain owned by the editor's form state (`useQuickApp2Form` in `src/hooks/use-quick-app2-form.ts`) through the existing `model` field. Model data SHALL come from the existing `DataContext` (`useDataContext`). No new context, hook state owner, or chat-api request SHALL be introduced.

This change introduces no chat-api endpoint. Models continue to come from the existing `DataContext` load, `deploymentsApi.listDeployments({ interfaceType: [ListDeploymentsInterfaceTypeEnum.Chat] })` in `src/utils/dial-client.ts`.

#### Scenario: Block header is rendered

- **WHEN** the editor renders the Configuration area
- **THEN** a heading with the text from `quickAppEditor` key `DefaultModel` ("Default model") SHALL be displayed, visually uppercased
- **AND** a button labelled with `quickAppEditor` key `Change` and a leading pencil icon SHALL be displayed at the end side of the same header row
- **AND** the block SHALL be exposed as a `section` whose accessible name is the heading text

#### Scenario: Change opens the model picker

- **WHEN** the user activates the **Change** button by pointer or keyboard (Enter/Space)
- **THEN** the model picker popup defined by "Model picker catalog list" SHALL open
- **AND** the `model` form value SHALL change only when the user confirms a highlighted row with **Add**, as defined by "Model picker single selection"

#### Scenario: Read-only or shared application

- **WHEN** the editor is read-only or the application is shared
- **THEN** the **Change** button SHALL be disabled and SHALL NOT open the picker
- **AND** the shared-application tooltip (`quickAppEditor` key `CannotChangeSharedApp`) SHALL remain available on the block

### Requirement: Picker offers only models

The model picker opened by **Change** SHALL list only deployments of `type: 'model'` that support tools (`features.tools`) and are not in a hidden DIAL folder. Applications (agents), including the application being edited, SHALL NOT be listed. A previously saved value that is an application SHALL remain displayed on the selected-model card.

#### Scenario: Applications are not offered

- **WHEN** the loaded deployments include tool-supporting models, models without tools, and applications
- **AND** the user opens the picker
- **THEN** only the tool-supporting models SHALL be listed

#### Scenario: Saved application is still shown

- **WHEN** the `model` form value is an application deployment id
- **THEN** the selected-model card SHALL show that application with the same `Model` type label as any selection
- **AND** the user SHALL be able to replace it only with a model from the picker

### Requirement: Model picker catalog list

The model picker SHALL be a modal dialog presenting models as a catalog list, matching the DIAL chat catalog list. It SHALL use `@epam/ai-dial-catalog`'s `ListView` (entity type `MODEL`) for the table and its `Filter` for the From filter. It SHALL NOT show Favorites/Catalog tabs, a grid/list view toggle, a favorites column, row checkboxes, or a details panel.

Layout, top to bottom:

- dialog header: title from `quickAppEditor` key `ChangeModel` ("Change model") and a close (×) control, separated from the body by a divider,
- a heading row: `quickAppEditor` key `ModelsCatalog` ("Models catalog") followed by the number of rows currently listed, and the sort menu at the end side,
- a search input (placeholder `quickAppEditor` key `SearchModels`, "Search models…") followed by the From filter,
- the list with columns **Name**, **Type**, **Folder**, **Tags**,
- a footer, separated from the list by a divider, with **Cancel** (ghost) and **Add** (neutral) at the end side.

The picker state (search query, filter, sort, highlighted row) SHALL be local `useState` in the picker component and SHALL reset when the picker closes. No new context SHALL be introduced. The `DialModel` → `CatalogItem` mapping SHALL be a pure util memoised with `useMemo` on the model list, user bucket and language; the filtered/sorted rows SHALL be memoised on those plus query, filter and sort.

#### Scenario: Picker opens with the catalog list

- **WHEN** the user opens the picker and models have loaded
- **THEN** a dialog named "Change model" SHALL be displayed
- **AND** it SHALL contain the "Models catalog" heading with the row count, a search box, a "From" filter button, a sort menu showing "Recently updated", and a list with column headers Name, Type, Folder and Tags
- **AND** no checkbox, tab or view toggle SHALL be rendered

#### Scenario: Row content

- **WHEN** a tool-supporting model `models/gemini__1.0.3` with name "Google Gemini 3.5 Flash Lite", version `1.0.3`, topics `["Business", "Domain"]` and an `iconUrl` is listed
- **THEN** its Name cell SHALL show the icon (initials of the name when `iconUrl` is absent or fails), the localized name and the version `1.0.3` as secondary text
- **AND** its Type cell SHALL show the catalog's model type label
- **AND** its Folder cell SHALL show a folder icon and the deepest segment of the path made of the scope label (`common` keys `PersonalScope` / `SharedScope` / `OrganizationScope`) followed by the folder segments — e.g. "Organization" for `models/gemini__1.0.3`, or "folder1" for a model under a public sub-folder, with the full path "Organization / folder1" in a tooltip and in screen-reader text
- **AND** its Tags cell SHALL show "Business" and "Domain" as tags

#### Scenario: Each version is its own row

- **WHEN** an entity has versions `1.0.0` and `2.0.0`
- **THEN** the list SHALL show two rows with the same name, one per version, and no version dropdown

#### Scenario: Folder is unknown

- **WHEN** the scope of a model cannot be determined (e.g. its bucket is not public and the user bucket has not loaded)
- **THEN** the Folder cell SHALL be empty for that row and the row SHALL still be selectable

### Requirement: Model picker search, filter and sort

The picker SHALL let the user narrow and reorder the rows. The heading count SHALL equal the number of rows after search and filter.

#### Scenario: Search by name

- **WHEN** the user types "gem" in the search box
- **THEN** only rows whose localized name contains "gem" (case-insensitive, trimmed) SHALL be listed, and matching text SHALL be highlighted in the Name cell
- **AND** clearing the search (clear button labelled by `common` key `ClearSearch`) SHALL restore all rows

#### Scenario: Filter by topic

- **WHEN** the user opens **From**, checks the topic "Business" and applies the filter
- **THEN** only rows that have the topic "Business" SHALL be listed
- **AND** the button label SHALL summarise the active filter as the catalog `Filter` does (e.g. "From: 1 of 3")
- **AND** the topic list SHALL contain the distinct topics of the selectable models

#### Scenario: Filter to my models

- **WHEN** the user checks "My" (`quickAppEditor` key `FilterMy`) in the From filter
- **THEN** only rows whose id is in the user's personal bucket SHALL be listed

#### Scenario: Sort

- **WHEN** the picker opens
- **THEN** rows SHALL be sorted by "Recently updated" (`updatedAt` descending; rows without `updatedAt` last)
- **AND** the sort menu SHALL also offer "Newest" and "Name A-Z" (`quickAppEditor` keys `SortRecentlyUpdated`, `SortNewest`, `SortNameAZ`), and choosing one SHALL reorder the rows
- **AND** the sort trigger SHALL be labelled with the applied order, as in the chat catalog (the kit's `Button` derives its accessible name from that label); `quickAppEditor` key `SortLabel` ("Sort") SHALL be used only as a fallback when no option matches

#### Scenario: No results

- **WHEN** search or filter leave no rows
- **THEN** the list area SHALL show the `quickAppEditor` `NoResultsFound` empty state with a search icon
- **AND** the count SHALL show 0 and **Add** SHALL be disabled

### Requirement: Model picker single selection

The picker SHALL support selecting exactly one model and SHALL commit it only on **Add**.

#### Scenario: Current value is pre-highlighted

- **WHEN** the picker opens and the current `model` value is one of the listed rows
- **THEN** that row SHALL be shown as selected (accent border, tint and check mark from the catalog list)
- **AND** **Add** SHALL be enabled

#### Scenario: Highlight another row

- **WHEN** the user clicks a row, or focuses it and presses Enter
- **THEN** that row SHALL become the only selected row
- **AND** the `model` form value SHALL NOT change yet and the picker SHALL stay open

#### Scenario: Confirm with Add

- **WHEN** a row is selected and the user activates **Add** (`common` key `Add`)
- **THEN** the `model` form value SHALL be set to that row's deployment id (including its version suffix)
- **AND** the picker SHALL close

#### Scenario: Discard

- **WHEN** the user activates **Cancel** (`common` key `Cancel`), the × control, presses Escape, or clicks outside the dialog
- **THEN** the picker SHALL close and the `model` form value SHALL remain unchanged
- **AND** reopening the picker SHALL show the current value selected with search, filter and sort reset

#### Scenario: Nothing selected

- **WHEN** the current value is not among the listed rows (e.g. a saved application, or filtered out) and the user has not clicked a row
- **THEN** **Add** SHALL be disabled

#### Scenario: Selected row hidden by search

- **WHEN** the user selects a row and then types a search that hides it
- **THEN** the selection SHALL be kept, **Add** SHALL remain enabled and confirm that row

### Requirement: Model picker loading and error states

The picker SHALL keep explicit loading, error and empty states while preserving the header and footer.

#### Scenario: Models loading

- **WHEN** the `DataContext` status is `idle` or `loading`
- **THEN** the list area SHALL show a spinner with accessible label `quickAppEditor` key `LoadingModels`
- **AND** **Add** SHALL be disabled

#### Scenario: Load error

- **WHEN** the `DataContext` status is `error`
- **THEN** the list area SHALL show `quickAppEditor` `FailedToLoadModels` with the error text and a **Retry** button (`quickAppEditor` key `Retry`) that calls `refreshAll`

#### Scenario: No selectable models

- **WHEN** models have loaded, no search or filter is active, and none is selectable
- **THEN** the list area SHALL show the `quickAppEditor` `NotAvailable` empty state

### Requirement: Model picker accessibility and direction

The picker SHALL be keyboard operable and follow the document direction.

#### Scenario: Keyboard

- **WHEN** the picker opens
- **THEN** focus SHALL move into the dialog, and Tab SHALL reach search, From, sort, the list, Cancel and Add in reading order
- **AND** the list SHALL be exposed as a grid with an accessible name from `quickAppEditor` key `ModelsCatalog`
- **AND** arrow keys SHALL move focus between rows, and Enter or Space on a focused row SHALL select it as a click does

#### Scenario: Right-to-left locale

- **WHEN** `document.documentElement.dir` is `rtl`
- **THEN** the heading SHALL be at the start (right) and the sort menu at the end (left); the search precedes the From filter from the right; the list columns SHALL run Name → Tags from right to left; Cancel/Add SHALL be at the end (left)
- **AND** no icon in the picker SHALL be mirrored (folder, filter funnel, chevron-down, search, check and × are not directional)

### Requirement: Selected-model card uses the shared entity header

The selected-model card SHALL render its identity row with `@epam/ai-dial-ui-kit`'s `EntityIdentity`, so the editor and the DIAL chat catalog present entities the same way. The name SHALL be a heading one level below the block caption. The featured chip SHALL NOT be shown.

#### Scenario: Name heading level

- **WHEN** the Default model block is rendered
- **THEN** the selected model name SHALL be exposed as a level-4 heading, below the level-3 "Default model" caption (itself below the level-2 "Configuration" heading)
- **AND** no "Featured" chip SHALL be rendered, even for a featured deployment

### Requirement: Selected-model card content

The selected-model card SHALL show, in reading order:

- the model icon,
- an uppercase accent label, always `Model`, since the picker offers only models,
- the model's localized display name,
- the version as plain text.

The card SHALL NOT contain an inline version selector.

#### Scenario: Model with a version

- **WHEN** the selected deployment has `type: 'model'` and a `version` (e.g. `1.0.3`)
- **THEN** the card SHALL show the entity icon (the image from `iconUrl`, or the initials of the name when absent or broken)
- **AND** a type label from `quickAppEditor` key `Model` ("Model"), displayed uppercase in the model entity colour (`text-blue`)
- **AND** the localized name (e.g. "Google Gemini 3.5 Flash Lite")
- **AND** the version `1.0.3` as secondary text next to the name, with no dropdown control

#### Scenario: Deployment without a version

- **WHEN** the selected deployment has no `version`
- **THEN** no version text SHALL be rendered and the name SHALL take the remaining width, truncating with an ellipsis when too long

#### Scenario: Multiple versions available

- **WHEN** the selected model's entity has several versions
- **THEN** the card SHALL show only the selected version as text
- **AND** switching to another version SHALL be possible only through the picker popup opened by **Change**

#### Scenario: Selected id is not in the loaded list

- **WHEN** the models have loaded but the `model` value is not among them
- **THEN** the card SHALL show the raw id as the name in secondary text and SHALL omit the type label and version

### Requirement: Default model loading and error states

The Default model block SHALL keep explicit loading and validation-error states.

#### Scenario: Models still loading

- **WHEN** the `DataContext` status is `idle` or `loading` and the selected model is not yet known
- **THEN** the card SHALL show a circular skeleton in place of the icon and a text skeleton in place of the label, name and version
- **AND** the **Change** button SHALL be disabled

#### Scenario: Validation error on model

- **WHEN** the `model` field has a validation error (e.g. "Selected model does not support tools")
- **THEN** the card SHALL render with the error border colour
- **AND** the error message SHALL be shown below the card

### Requirement: Default model block direction support

The Default model block SHALL follow the document direction.

#### Scenario: Right-to-left locale

- **WHEN** `document.documentElement.dir` is `rtl`
- **THEN** the heading SHALL be at the start (right) and the **Change** button at the end (left) of the header row
- **AND** within the card the icon SHALL be at the start side, with the label, name and version following it
- **AND** the pencil icon SHALL NOT be mirrored

### Requirement: Shared configuration section header

The app SHALL provide a reusable, non-collapsible configuration section component for Configuration-column blocks. It SHALL render:

- a caption heading,
- an optional end-aligned action,
- an optional secondary description below the header,
- its content below that.

It SHALL expose no `aria-expanded` state.

#### Scenario: Section with action and description

- **WHEN** the section is rendered with a title, an action element, and a description
- **THEN** the title SHALL be a heading element labelling the `section`
- **AND** the action SHALL be placed at the end side of the heading row and remain keyboard reachable
- **AND** the description SHALL be rendered as secondary text below the heading row

#### Scenario: Section without optional parts

- **WHEN** the section is rendered with only a title and content
- **THEN** no empty action container or description element SHALL be rendered

### Requirement: Temperature control

The Configuration area SHALL present the orchestrator temperature as a **Temperature** block below the Default model block: a caption `SectionRow` titled with `quickAppEditor` key `Temperature` ("Temperature"), described by `TemperatureDescription` ("Higher values will make the output more random, while lower values will make it more focused and deterministic."), containing the kit's 2.0 `Slider`. State SHALL be the editor form state's `temperature` field (`useQuickApp2Form`, default `1` via `DEFAULT_TEMPERATURE`), loaded from `application_properties.orchestrator.deployment.parameters.temperature`. No memoisation beyond the existing `useMemo` on the visibility check.

This requirement introduces no chat-api endpoint; the value is saved with the existing application save.

#### Scenario: Slider range and labels

- **WHEN** the Temperature block is shown
- **THEN** the slider SHALL range from `0` to `1` in steps of `0.1`
- **AND** it SHALL show the current value at the end of its label row with one decimal (e.g. `0.7`, `1.0`)
- **AND** it SHALL show the scale labels `TemperaturePrecise` ("Precise"), `TemperatureNeutral` ("Neutral") and `TemperatureCreative` ("Creative") below the track, from start to end
- **AND** the slider SHALL be named by `quickAppEditor` key `Temperature` for assistive technology and be operable with arrow keys

#### Scenario: Changing the temperature

- **WHEN** the user moves the slider to `0.3`
- **THEN** the form `temperature` value SHALL become `0.3`

#### Scenario: Model without temperature support

- **WHEN** the selected model is loaded and its `features.temperature` is not `true`
- **THEN** the Temperature block SHALL NOT be rendered
- **AND** on save `orchestrator.deployment.parameters` SHALL be omitted, so no temperature is sent

#### Scenario: Model with temperature support is saved

- **WHEN** the selected model has `features.temperature: true` and the form `temperature` is `0.3`
- **THEN** on save `orchestrator.deployment.parameters` SHALL be `{ "temperature": 0.3 }`

#### Scenario: Selected model not loaded yet

- **WHEN** the selected model id is not in the loaded models
- **THEN** the Temperature block SHALL be shown

#### Scenario: Read-only application

- **WHEN** the editor is read-only or the application is shared
- **THEN** the slider SHALL be disabled
- **AND** no read-only hint SHALL be shown on the slider (it is added later with the slider update)

### Requirement: Process files control

The Configuration area SHALL present the orchestrator attachment strategy as a **Process files** block below the Temperature block: a caption `SectionRow` titled with `quickAppEditor` key `ProcessFiles` ("Process files"), described by `ProcessFilesDescription`, containing the kit's `Switch` labelled `AllowOrchestratorToProcessFiles` ("Allow orchestrator to process files"). State SHALL be the form `processLargeFiles` field, loaded as `true` when `application_properties.orchestrator.attachment_strategy` is set and `false` otherwise.

This requirement introduces no chat-api endpoint.

#### Scenario: Shown only for models that accept attachments

- **WHEN** the selected model has a non-empty `inputAttachmentTypes`
- **THEN** the Process files block SHALL be rendered
- **WHEN** the selected model has no `inputAttachmentTypes`, or it is not loaded
- **THEN** the Process files block SHALL NOT be rendered

#### Scenario: Toggling the switch

- **WHEN** the user turns the switch on by pointer or keyboard (Space)
- **THEN** the form `processLargeFiles` value SHALL become `true`

#### Scenario: Saving the attachment strategy

- **WHEN** the selected model accepts attachments and `processLargeFiles` is `true`
- **THEN** on save `orchestrator.attachment_strategy` SHALL be `{ "type": "lazy_on_demand" }`
- **WHEN** the selected model accepts attachments and `processLargeFiles` is `false`
- **THEN** on save `orchestrator.attachment_strategy` SHALL be `null`
- **WHEN** the selected model does not accept attachments
- **THEN** the save SHALL leave `orchestrator.attachment_strategy` as it was in the loaded configuration

#### Scenario: Read-only application

- **WHEN** the application is shared
- **THEN** the switch SHALL be disabled
- **AND** an info button next to the switch label SHALL expose the shared-application hint (`quickAppEditor` key `CannotChangeSharedApp` with context `field`: "You cannot change the field of a shared application.") as its tooltip and accessible name

#### Scenario: Right-to-left locale

- **WHEN** `document.documentElement.dir` is `rtl`
- **THEN** the switch SHALL be at the start (right) with its label and info button following it
- **AND** no icon SHALL be mirrored
