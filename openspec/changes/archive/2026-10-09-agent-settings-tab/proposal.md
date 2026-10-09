## Why

An agent's per-app settings — how the orchestrator calls it (transport) and the
host's credential forms — sit behind a row of buttons under the details header.
Connection opens a second, nested dialog (`DialAppConfigurationModal`) that
repeats the header and the Credentials button, and the saved transport is visible
nowhere else. That dialog also preselects "Chat completion" for an entry with no
saved transport, while saving writes MCP
(`src/components/Agents/DialAppConfigurationModal/DialAppConfigurationModal.tsx:48`
vs `src/form/quickApp2Form.ts:398`). The user sees one value, and a different one
is saved.

## What Changes

- **New Settings tab** in the agent details popup. It is this app's own tab, after
  the catalog tabs: `About | Overview | … | Connect | Settings`. It holds
  **Connect via**: a radio group (MCP / Chat completion) bound to the entry's
  `transport`. A change calls `configureAgent` at once (form becomes dirty),
  with no Apply step. An entry with no saved transport shows MCP, matching what
  save writes.
- **Visibility.** The tab shows only when the agent supports both MCP and chat
  completion. Read-only apps show Connect via disabled, with the saved value.
- **Credentials stay under the header.** The button keeps its place in the row
  under the header, where the catalog shows a toolset's Log in, and its gate is
  unchanged. Activating it now **closes the details popup** before posting
  `REQUEST_APPLICATION_CREDENTIALS`, so the host's credential forms never stack on
  top of it. (An earlier draft moved Credentials into Settings; review rejected a
  button there that only opens another popup.)
- **Popup shell.** `AddOnDetailsPopup` accepts app-owned tabs after the catalog
  tabs. Its tab type widens from `CatalogDetailsTab` to include an app enum.
- **BREAKING (UI only):**
  - the Connection button under the header is removed (Credentials stays);
  - `DialAppConfigurationModal` is deleted;
  - the `AgentConnection` and `ApplyChanges` i18n keys are dropped.
- **Unchanged:** the saved `tool_sets` shape and the `transport` values.

**Alternatives considered:**

- **Keep the dialog, clean it up.** Remove the duplicates and fix the default.
  Rejected: it is still a popup over a popup for a two-option choice, and the
  value stays hidden.
- **Inline control in the header row.** Rejected: a radio pair does not fit a
  row of buttons.
- **Credential forms inline in Settings**, with OAuth through a new host message
  as toolset login does. Deferred: it changes the host protocol and needs a paired
  ai-dial-chat change.
- **Fold transport into the catalog Connect tab** (its endpoint selector becomes
  the transport). Rejected for these reasons:
  - it needs upstream catalog changes (the selector is uncontrolled);
  - Connect is a read-only reference that hides without `dialCoreExternalUrl`;
  - a "view the snippet" selector that silently rewrites app config is a UX trap.

## Non-goals

- No change to the catalog (`@epam/ai-dial-catalog`) or to `@epam/ai-dial-chat-hooks`.
- No change to the host credentials protocol (`REQUEST_APPLICATION_CREDENTIALS`).
  Secrets still never enter the editor.
- No Settings tab for skills, toolsets or models.
- No change to how toolset credentials work (catalog `DetailsHeader` action).

## Capabilities

### New Capabilities

_None._

### Modified Capabilities

- `agents_selection`: the agent details popup loses Connection, gains the
  Settings tab (Connect via), and its Credentials action closes the popup before
  handing over to the host. The transport, credentials and accessibility
  scenarios change.
- `catalog-entity-details`: the popup shell gains app-owned tabs after the
  catalog tabs. The "actions this app owns" row holds only the agent Credentials.

## Impact

- **Code:**
  - `src/components/common/AddOnDetailsPopup/AddOnDetailsPopup.tsx`: app-owned tabs.
  - `src/components/Agents/AgentDetailsPopup/AgentDetailsPopup.tsx`: drops
    Connection, supplies the Settings tab, and closes before requesting credentials.
  - New `src/components/Agents/AgentSettingsTab/`.
  - `src/types/entity-details.ts`: the tab type.
  - `src/utils/map-agent-to-catalog-item.ts`: visibility predicate
    (`canConfigureAgentTransport`, `src/utils/map-agent-to-catalog-item.ts:17`).
  - Deletes `src/components/Agents/DialAppConfigurationModal/`.
- **State:** none new. Transport stays in `useQuickApp2Form`
  (`configureAgent`, `src/hooks/use-quick-app2-form.ts:305`). The credentials
  need stays in `useApplicationAuthentication`.
- **API / host:** no new chat-api calls. The host message is unchanged.
  Host integration is touched only by closing the popup before the existing
  message is sent.
- **i18n:**
  - no new keys;
  - reused keys: `Settings`, `ConnectVia`, `MCP`, `ChatCompletion`,
    `ApplicationCredentials`;
  - removed keys: `AgentConnection`, `ApplyChanges`.
- **RTL:** a new surface with no directional icons. The radio group and the
  section layout must use logical properties.
- **Rollback:** a frontend-only revert. Saved data is untouched in both directions.
- **Acceptance criteria:**
  - An MCP + chat-completion agent shows a Settings tab, last, with Connect via
    preselected to the saved transport (MCP when none).
  - Changing the transport marks the form dirty and keeps the popup open on Settings.
  - Credentials appear under the header under the existing gate; activating them
    closes the popup and posts exactly one host message.
  - No Connection button, no nested dialog.
  - Models, MCP-only agents and unavailable agents show no Settings tab.
  - Read-only apps show Connect via disabled.
