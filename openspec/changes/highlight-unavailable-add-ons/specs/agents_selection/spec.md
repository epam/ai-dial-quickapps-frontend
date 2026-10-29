## MODIFIED Requirements

### Requirement: Attached agents list (editable)

The Agents row SHALL list the attached agents in `addOns` order. It SHALL use the same shared row item as the Skills and Toolsets rows. Each item SHALL show:

- the avatar: `DeploymentIcon` with `iconUrl`, falling back to initials;
- the localized name, falling back to the id's last segment without version;
- the version as secondary text when one is known.

**Status line.** Below the name, the item SHALL show the `getEntityStatusMessage` text (read-only wording) when the agent is not found in the catalog, or is deploying, undeploying, redeploying or undeployed. Its severity (`EntityStatusSeverity`, as defined in `toolsets_selection` "Attached toolsets list (editable)") SHALL be:

- **Not found in the catalog** (`ApplicationEditorI18nKeys.AddOnsUnavailableRemovalRequired` with `entityType` = `ApplicationEditorI18nKeys.AddOnsEntityTypeAgent`, "The agent is not available and needs to be removed."): `Error`, rendered with the ui-kit 2.0 `ErrorText` (`text-error`).
- **Deploying, undeploying, redeploying, undeployed** (`AddOnsDeployingApp`, `AddOnsUndeployingApp`, `AddOnsRedeployingApp`, `AddOnsUndeployedApp`): `Info`, rendered with the ui-kit 2.0 `CaptionText` (`text-secondary`), unchanged from today.

The not-found status SHALL be shown only while `DataContext.status` is `LoadStatus.Ready`. While it is `Idle`, `Loading` or `Error`, an agent missing from the maps SHALL show no status line. The status line SHALL keep its `aria-describedby` link to the details button and SHALL NOT be a live region.

**Details button.** Each item SHALL hold a button named by `ApplicationEditorI18nKeys.AddOnsDetails` with `{{name}}`. Activating it SHALL open the agent details popup.

**Remove button.** In an editable application, each item SHALL hold a hover/focus-revealed trash button named by `ApplicationEditorI18nKeys.AddOnsRemove` with `{{name}}`. It SHALL have the same visibility, tab-order, removal and refocus behaviour as the Toolsets row.

**Not rendered.** Items SHALL NOT render a chip box, a tooltip, or a configure (gear) or credentials button. Those actions live in the details popup.

**Data.** The list SHALL read `modelsMap`, `mcpAgentsMap`, `toolsetsMap` and `status` from `DataContext` and SHALL make no chat-api request of its own. The open popup id SHALL be local `useState` in the list component.

#### Scenario: Agents are listed

- **WHEN** an application loads with agents Research Agent (version `2.1`) and GPT-4o
- **THEN** the Agents row SHALL show both, with "2.1" after Research Agent's name
- **AND** each item SHALL have a "Remove <name>" button revealed on hover or focus

#### Scenario: Undeployed agent

- **WHEN** an attached application has `functionStatus` `UNDEPLOYED`
- **THEN** its item SHALL show the `ApplicationEditorI18nKeys.AddOnsUndeployedApp` text under the name with class `text-secondary`, and SHALL NOT have class `text-error`

#### Scenario: Agent missing from the catalog

- **WHEN** `DataContext.status` is `Ready` and an attached id `applications/public/old-agent` resolves to no model, application or MCP agent
- **THEN** its item SHALL show "The agent is not available and needs to be removed." rendered as `ErrorText` (class `text-error`)
- **AND** the item's details button SHALL have that text as its accessible description

#### Scenario: No unavailable status while the catalog is loading

- **WHEN** `DataContext.status` is `Loading` and an attached `applications/…` id is not yet in the maps
- **THEN** its item SHALL show no status line
