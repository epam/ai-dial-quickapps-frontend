## Context

The agent details popup (`AgentDetailsPopup`) uses the shared shell
`AddOnDetailsPopup`: catalog `DetailsHeader`, an optional `actions` row
(`ps-[60px]`), the catalog tab row and panels, and the Delete/Close footer. For
agents the action row holds:

- **Connection.** Opens `DialAppConfigurationModal`, a `PopupSize.Sm` dialog over
  the details popup with a radio pair (MCP / Chat completion) and Apply.
- **Credentials.** Posts `REQUEST_APPLICATION_CREDENTIALS` to the host.

Facts this design relies on:

- **Who sees Connection today.** Only MCP-capable applications
  (`canConfigureAgentTransport`). Inside the dialog, "Chat completion" is enabled
  only when the id is in `DataContext.modelsMap`. That map holds the
  chat-completion deployments; MCP-only agents live in `mcpAgentsMap`.
- **What save writes.** For an MCP-capable application, save writes
  `transport ?? MCP` (`src/form/quickApp2Form.ts:398`). The dialog's own default
  is "Chat completion when supported". This mismatch is the bug the proposal
  names.
- **How tabs are built.** The shell's tab ids come only from
  `getCatalogDetailsTabs`, and its tab type is `AddOnDetailsTab = CatalogDetailsTab`
  (`src/types/entity-details.ts:25`).
- **When the credentials need is known.** `useApplicationAuthentication` resolves
  asynchronously and reports `false` until it does.

## Goals / Non-Goals

**Goals:**

- The transport in a Settings tab after the catalog tabs.
- Transport shown and edited in place, with the default that save actually writes.
- No nested dialog: Connection goes, and Credentials closes our popup before the
  host shows its forms.

**Non-Goals:**

- A Settings tab for other entity types. The shell API allows it later, but none
  is added now.
- Any catalog or chat-hooks change. Toolset credentials stay in `DetailsHeader`.
- Changing the host credentials flow or its gating.

## Decisions

### 1. App-owned tabs in the shell, appended after the catalog tabs

`AddOnDetailsPopup` gets an optional `appTabs` prop. Each tab is an object with an
`id` from a new string enum `AppDetailsTab` (`src/types/entity-details.ts`, value
`Settings = 'settings'`), a translated `label`, and the panel `content`. The shell
builds its tab list as `[...getCatalogDetailsTabs(item, …), ...appTabs]`.
`AddOnDetailsTab` widens to `CatalogDetailsTab | AppDetailsTab`.

- **Rendering.** `renderPanel` falls through to the app tab's `content` for
  non-catalog ids.
- **Selection.** Selection keeps its existing rule: a chosen id that disappears
  falls back to the first tab.
- **Why append.** Appending keeps the catalog order identical to the chat catalog.
  The popup still opens on the first tab (About).
- **Unavailable agents.** When the shell shows the unavailable state (`item == null`
  or `unavailableText`), app tabs are not rendered either.

_Alternatives:_

- Render Settings outside the tab system, as a section above the tabs. Rejected:
  it is the same visual weight as the action row it replaces.
- A generic `renderTab(id)` callback. Rejected: the shell would still need to know
  the ids and labels, so this is no simpler than passing them as data.

### 2. A focused panel component: `AgentSettingsTab`

New `src/components/Agents/AgentSettingsTab/AgentSettingsTab.tsx`, presentational,
with props `AgentSettingsTabProps`:

- `agentId` (names the radio group);
- `transport?`;
- `isTransportDisabled`;
- `onTransportChange`.

**Connect via.** ui-kit 2.0 `RadioGroup`:

- `labelProps.label` is `ConnectVia`, and `name` is per agent;
- the items are `MCP` and `ChatCompletion` with the `DialAppTransportType` values;
- `value` is `transport ?? DialAppTransportType.MCP`;
- `disabled` is driven by `isTransportDisabled`.

**Layout.** The radio group alone; no extra padding, since the tabpanel already
scrolls. Logical properties only.

The panel owns no state. The selected value is the form value, so a change
re-renders it from `useQuickApp2Form`.

_Alternative:_ reuse `DialAppConfigurationModal`'s body. Rejected: it carries the
identity block, the legacy `DialPopup` and `DialRadioButton`, and a local draft
state that the immediate-save model removes.

### 3. Immediate save, no Apply

A radio change calls `onConfigure(agentId, transport)`, which is `configureAgent`
in `useQuickApp2Form`. The form becomes dirty and is persisted by the app's normal
Save, the same as Delete. A draft plus Apply would add a second commit step inside
an already uncommitted form.

### 4. Visibility rules live in a pure util

`canChooseAgentTransport(agent, modelsMap)` decides whether Connect via shows.
It lives in `src/utils/map-agent-to-catalog-item.ts`, next to
`canConfigureAgentTransport`, which keeps its save-side meaning. The predicate is
`canConfigureAgentTransport(agent) && modelsMap[agent.id] != null`: an MCP-capable
application that also serves chat completion. With only one usable option there is
nothing to choose, so the tab is not shown.

`AgentDetailsPopup` passes the Settings tab only when `canChooseAgentTransport`
holds, in editable **and** read-only apps, with `isTransportDisabled = isReadonly`.

### 5. Credentials stay in the action row and close the popup

Credentials keep their place in the shell's `actions` row (`ps-[60px]`, where the
catalog header shows a toolset's Log in) and their gate (editable,
`applicationCredentials=true`, application, `useApplicationAuthentication` true).
`DetailsHeader` has no slot for a custom action, so the row stays ours.

Activating Credentials calls `onClose()` and then
`requestApplicationCredentials(agentId, allowedOrigins)`. The host opens its own
credential dialog over the editor, so closing ours first keeps the two from
stacking.

_Alternatives:_

- A Credentials section inside Settings with the same button. Tried and rejected
  in review: a button in a tab that only opens another popup adds a layer.
- Inline credential forms (catalog `ApplicationCredentials`) with OAuth through a
  new host message, like toolset login. Deferred: host-protocol change with a
  paired ai-dial-chat change.

### 6. Removals

- Removed:
  - the Connection button and its `IconSettings` import;
  - `DialAppConfigurationModal` and its folder;
  - the `AgentConnection` and `ApplyChanges` keys.
- `ConnectVia`, `MCP` and `ChatCompletion` stay; the new panel uses them.

## Risks / Trade-offs

- **[Credentials appear late]** The credentials need resolves after first render,
  so the button shows a moment after the popup opens, as before. → Unchanged
  behaviour.
- **[Closing loses the open tab]** Reopening the popup after the host's forms
  starts on About again. → Acceptable: the popup always opens on About.
- **[Less discoverable than a header button]** Settings is the last tab. → The
  agreed placement. The value is now visible in the tab, which the dialog never
  showed without being opened.
- **[Behaviour change for saved entries]** Entries with no saved transport used to
  preselect "Chat completion" in the dialog. Now they show MCP, which is what was
  always saved. → No data change. Only the display is corrected.
- **[Read-only now shows transport]** Before, read-only apps had no Connection at
  all. → An intended gain: viewers can see how the agent is called.

## Migration Plan

Frontend-only. No data migration: `tool_sets[].transport` values and their absence
keep their meaning. Rollback is a revert of the change.

## Open Questions

None. The placement and naming ("Settings"), keeping Credentials under the header
with close-on-click, and the read-only and visibility rules were agreed in
exploration and review.
