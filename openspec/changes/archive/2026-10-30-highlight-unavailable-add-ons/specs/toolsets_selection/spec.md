## MODIFIED Requirements

### Requirement: Attached toolsets list (editable)

The Toolsets row of the Add-ons card SHALL list the attached toolsets in `addOns` order. Each item SHALL show:

- the avatar: `DeploymentIcon` from `@epam/ai-dial-chat-shared` with the toolset's `iconUrl`, falling back to the name's initials;
- the name: `getLocalizedText(name, language)`, falling back to the id's last segment without version;
- the version as secondary text, only when one is known.

**Logged-out badge.** When the toolset needs authentication (`authSettings.authenticationType` is not `NONE`) and `authSettings.authStatus` is not `SIGNED_IN`, the avatar SHALL carry the catalog `CredentialsBadge` from `@epam/ai-dial-catalog`. Its label SHALL be `CatalogI18nKeys.CredentialsBadgeLoggedOut` ("Authorize to use this toolset.").

**Status line.** Below the name, the item SHALL show the status text from `getEntityStatusMessage` (read-only wording) when the toolset is logged out or is not found in the catalog. `getEntityStatusMessage` SHALL return the text together with an `EntityStatusSeverity` (string enum in `src/types/entity-status.ts`: `Info = 'info'`, `Error = 'error'`):

- **Not found in the catalog** (`ApplicationEditorI18nKeys.AddOnsUnavailableRemovalRequired` with `entityType` = `ApplicationEditorI18nKeys.AddOnsEntityTypeToolset`, "The toolset is not available and needs to be removed."): severity `Error`. The item SHALL render the text with the ui-kit 2.0 `ErrorText` (`dial-tiny-text`, `text-error`).
- **Logged out** (`ApplicationEditorI18nKeys.AddOnsLoggedOutToolset`): severity `Info`. The item SHALL render the text with the ui-kit 2.0 `CaptionText` in its default description variant (`dial-tiny-text`, `text-secondary`), unchanged from today.

The not-found status SHALL be shown only while `DataContext.status` is `LoadStatus.Ready`. While the status is `Idle`, `Loading` or `Error`, an id that is missing from `toolsetsMap` SHALL show no status line, because a missing entry then does not mean the toolset is unavailable.

The status line SHALL keep its `id` and stay the details button's `aria-describedby` target, whatever the severity, and SHALL keep truncating to one line. It SHALL NOT be a live region: it describes the item and is not announced. The text states the problem itself, so colour is not the only cue. RTL impact: none, since the line uses no directional classes.

**Details button.** Each item SHALL hold a button named by `ApplicationEditorI18nKeys.AddOnsDetails` with `{{name}}` (e.g. "Figma details"). Activating it SHALL open the toolset details popup.

**Remove button.** Each item SHALL also hold a remove button at its end: a ui-kit ghost icon button with a trash icon, named by `ApplicationEditorI18nKeys.AddOnsRemove` with `{{name}}`. It SHALL be visible only while the item is hovered or holds keyboard focus (`:focus-visible`), and SHALL stay in the tab order. Focus that returns to the item after a popup is closed with the mouse SHALL NOT reveal it. Activating it SHALL remove that id from `addOns` without opening the popup, and SHALL move focus to the first remaining item in the row.

**Not rendered.** Items SHALL NOT render a chip box, a tooltip or a configure (gear) button.

**Data.** The list SHALL be read from `DataContext` (including its `status`) and SHALL make no chat-api request of its own. The item component SHALL be shared with the Skills and Agents rows, and SHALL take the severity as an optional `statusSeverity` prop that defaults to `Info`. The open popup id SHALL be local `useState` in the list component. No new context SHALL be introduced.

#### Scenario: Toolsets are listed

- **WHEN** an application loads with toolsets Figma (version `1.0.0`, signed out, OAuth) and Jira (no auth)
- **THEN** the Toolsets row SHALL show Figma with "1.0.0" and the logged-out badge, and Jira without a badge
- **AND** each item SHALL have a "Remove <name>" button that is hidden until the item is hovered or focused

#### Scenario: Toolset missing from the catalog

- **WHEN** `DataContext.status` is `Ready` and an attached id `toolsets/public/old-tool` is not in `toolsetsMap`
- **THEN** its item SHALL show "old-tool" and, under it, "The toolset is not available and needs to be removed." rendered as `ErrorText` (class `text-error`)
- **AND** the item's details button SHALL have that text as its accessible description
- **AND** activating it SHALL open the details popup in its unavailable state

#### Scenario: Logged-out status stays neutral

- **WHEN** an attached OAuth toolset is in `toolsetsMap` with `authStatus` other than `SIGNED_IN`
- **THEN** its status line SHALL read `ApplicationEditorI18nKeys.AddOnsLoggedOutToolset` ("Logged out toolset.") with class `text-secondary`, and SHALL NOT have class `text-error`

#### Scenario: No unavailable status before the catalog has loaded

- **WHEN** `DataContext.status` is `Idle` or `Loading` and an attached id `toolsets/public/figma` is not yet in `toolsetsMap`
- **THEN** its item SHALL be listed with the fallback name "figma" and SHALL show no status line
- **AND** once the status becomes `Ready` with Figma in `toolsetsMap`, it SHALL still show no unavailable status

#### Scenario: No unavailable status after a failed catalog load

- **WHEN** `DataContext.status` is `Error` and `toolsetsMap` is empty
- **THEN** no item in the Toolsets row SHALL show the unavailable status

#### Scenario: Remove button hides after the details popup is closed with the mouse

- **WHEN** the user clicks an attached toolset to open its details popup, closes the popup with the mouse (header close control or Close) and the pointer is no longer over the item
- **THEN** the item's "Remove <name>" button SHALL be hidden, even though focus returned to the item's details button
- **AND** if the popup is closed with the keyboard, the button SHALL be visible while the details button holds that keyboard focus

#### Scenario: Remove from the row

- **WHEN** an editable application has toolsets `[T1, T2]` and the user activates the trash button of `T1`
- **THEN** `T1` SHALL be removed from `addOns`, the form SHALL become dirty, and focus SHALL move to `T2`'s details button
- **AND** the details popup SHALL NOT open
