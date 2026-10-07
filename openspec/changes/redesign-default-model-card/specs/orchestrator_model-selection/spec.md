## ADDED Requirements

### Requirement: Default model block

The Configuration area SHALL present the orchestrator model selection as a **Default model** block. The block SHALL have a caption heading and an end-aligned **Change** action in the same header row, with the selected-model card below the header. State SHALL remain owned by the editor's react-hook-form instance through the existing `model` field. Model data SHALL come from the existing `DataContext` (`useDataContext`). No new context, hook state owner, or chat-api request SHALL be introduced.

This change introduces no chat-api endpoint. Models continue to come from the existing `DataContext` load, `deploymentsApi.listDeployments({ interfaceType: [ListDeploymentsInterfaceTypeEnum.Chat] })` in `src/utils/dialClient.ts`.

#### Scenario: Block header is rendered

- **WHEN** the editor renders the Configuration area
- **THEN** a heading with the text from `quickAppEditor` key `DefaultModel` ("Default model") SHALL be displayed, visually uppercased
- **AND** a button labelled with `quickAppEditor` key `Change` and a leading pencil icon SHALL be displayed at the end side of the same header row
- **AND** the block SHALL be exposed as a `section` whose accessible name is the heading text

#### Scenario: Change opens the model picker

- **WHEN** the user activates the **Change** button by pointer or keyboard (Enter/Space)
- **THEN** the existing model picker popup (search, Favorites/Catalog tabs, model cards with version selection) SHALL open
- **AND** selecting a model or a version in the popup SHALL set the `model` form value to that deployment id and close the popup, as it does today

#### Scenario: Read-only or shared application

- **WHEN** the editor is read-only or the application is shared
- **THEN** the **Change** button SHALL be disabled and SHALL NOT open the picker
- **AND** the shared-application tooltip (`quickAppEditor` key `CannotChangeSharedApp`) SHALL remain available on the block

### Requirement: Selected-model card uses the shared entity header

The selected-model card SHALL render its identity row with `@epam/ai-dial-ui-kit`'s `EntityIdentity`, so the editor and the DIAL chat catalog present entities the same way. The name SHALL be a heading one level below the block caption. The featured chip SHALL NOT be shown.

#### Scenario: Name heading level

- **WHEN** the Default model block is rendered
- **THEN** the selected model name SHALL be exposed as a level-4 heading, below the level-3 "Default model" caption (itself below the level-2 "Configuration" heading)
- **AND** no "Featured" chip SHALL be rendered, even for a featured deployment

### Requirement: Selected-model card content

The selected-model card SHALL show, in reading order:

- the model icon,
- an uppercase accent label naming the entity type,
- the model's localized display name,
- the version as plain text.

The card SHALL NOT contain an inline version selector.

#### Scenario: Model with a version

- **WHEN** the selected deployment has `type: 'model'` and a `version` (e.g. `1.0.3`)
- **THEN** the card SHALL show the entity icon (the image from `iconUrl`, or the initials of the name when absent or broken)
- **AND** a type label from `quickAppEditor` key `Model` ("Model"), displayed uppercase in the model entity colour (`text-blue`)
- **AND** the localized name (e.g. "Google Gemini 3.5 Flash Lite")
- **AND** the version `1.0.3` as secondary text next to the name, with no dropdown control

#### Scenario: Application selected as orchestrator

- **WHEN** the selected deployment has `type: 'application'`
- **THEN** the type label SHALL use `quickAppEditor` key `Agent` ("Agent") in the agent entity colour (`text-green-1`), matching the chat catalog

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
