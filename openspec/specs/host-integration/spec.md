# Host Integration Specification

## Purpose

QuickApps runs embedded inside a host page (typically an `<iframe>`) rather than as a
standalone site. This capability defines the public contract QuickApps exposes to any
embedding host: what it reads from its entry URL, what handshake and messages it emits,
what it accepts from the host, and how it validates the host's origin before trusting or
targeting it. The contract is host-agnostic — it describes only QuickApps' own observable
behavior, not any particular host's implementation, so that any compliant host (not only
ai-dial-chat) can embed QuickApps successfully.

## Requirements

### Requirement: Entry URL query parameters

QuickApps SHALL read the following query parameters from its entry URL:

- `authProvider` — the identity provider the host expects the current session to be
  authenticated with. Its absence is meaningful: QuickApps falls back to its default
  (non-provider-pinned) session behavior rather than treating it as an error.
- `id` — a percent-encoded application identifier for the app to open in the editor. It is
  required to reach a usable editor: without it, QuickApps has no application to load and
  never renders past its loading state.
- `theme` — the color theme the host wants QuickApps to render in. Its absence is
  meaningful: QuickApps falls back to its default theme.
- `applicationCredentials` — a flag indicating the current view should operate in an
  application-credentials configuration mode. Its absence is meaningful: QuickApps falls
  back to its default (non-credentials) mode.

#### Scenario: Entry URL carries no `id`

- **WHEN** QuickApps is loaded without an `id` query parameter (with or without the other
  parameters present)
- **THEN** QuickApps SHALL remain on its loading state indefinitely rather than falling
  back to any default application or editor view

#### Scenario: Entry URL carries no `authProvider`, `theme`, or `applicationCredentials`

- **WHEN** QuickApps is loaded with a valid `id` but without `authProvider`, `theme`, or
  `applicationCredentials`
- **THEN** QuickApps SHALL fall back to its default behavior for each missing parameter
  (no provider pinning, default theme, non-credentials mode) rather than failing to render

#### Scenario: Host supplies an application id

- **WHEN** the entry URL includes `id=<percent-encoded-id>`
- **THEN** QuickApps SHALL decode the id and use it to load the corresponding
  application into the editor

Keeping the active session consistent with `authProvider` is authentication behavior,
specified in `auth`'s "Session provider consistency" requirement, not repeated here.

### Requirement: Host handshake on load

QuickApps SHALL announce itself as ready to any host capable of receiving a
handshake, without requiring the host to poll or guess when QuickApps has finished
initializing.

#### Scenario: Host connection details become available

- **WHEN** QuickApps determines a target host origin and application name to address
  it by (see "Host origin resolution")
- **THEN** QuickApps SHALL send a "ready" signal and a "ready to interact" signal to
  that host, each exactly once for that load

#### Scenario: Host connection details are not yet available

- **WHEN** the host origin or application name QuickApps needs has not yet been
  resolved
- **THEN** QuickApps SHALL NOT send the ready handshake, and SHALL send it as soon as
  the required information becomes available

### Requirement: Host origin resolution

QuickApps SHALL determine which origin to address as "the host" using only
information available to the page itself, without requiring the host to declare its
own identity via a query parameter.

#### Scenario: Both an admin host and a chat host are configured

- **WHEN** QuickApps has both an admin-host and a chat-host origin configured, and the
  page's immediate embedding ancestor origin matches the configured chat-host origin
- **THEN** QuickApps SHALL address the chat-host origin as the host for its handshake
  and outbound messages

#### Scenario: Only one host origin is configured, or the ancestor does not match

- **WHEN** only one of the admin-host/chat-host origins is configured, or the
  embedding ancestor's origin does not match the configured chat-host
- **THEN** QuickApps SHALL address whichever configured origin is available (admin
  host, falling back to chat host) as the host

#### Scenario: No host origin or application name is configured

- **WHEN** neither host origin is configured, or no application name is configured
- **THEN** QuickApps SHALL NOT attempt to address a host and SHALL NOT send the
  handshake

### Requirement: Outbound message contract

QuickApps SHALL emit the following outbound message types toward the resolved host,
each identifying itself with the configured application name and, where noted,
carrying the stated payload:

- **Ready** — sent once when QuickApps has initialized and can receive host commands.
- **HeightChange** — sent whenever QuickApps' rendered content height changes, carrying
  `{ height }` so the host can size its embedding container.
- **DirtyState** — sent when the unsaved-changes state of the current editor session
  changes, carrying `{ isDirty }`.
- **SaveSuccess** — sent when a save completes successfully, carrying the updated
  application data and whether unsaved changes remain.
- **SaveError** — sent when a save attempt fails, carrying an error description.
- **AutoSaveComplete** — sent when an automatic (non-user-triggered) save completes.
- **RequestApplicationCredentials** — sent to ask the host to supply credentials for a
  given application id.
- **RequestToolsetLogin** / **RequestToolsetLogout** — sent to ask the host to run a
  toolset's login/logout flow on QuickApps' behalf.
- **`{applicationName}/readyToSave`** — a plain (non-typed) message sent once the
  editor session is ready to accept a save trigger from the host.
- **`{applicationName}/loggedOut`** — a plain (non-typed) message sent when QuickApps
  detects the current session has logged out.

#### Scenario: Rendered content height changes

- **WHEN** the height of QuickApps' rendered content changes
- **THEN** QuickApps SHALL post a HeightChange message with the new height to the
  resolved host, so the host can resize the embedding container without QuickApps
  needing to know how the host renders it

#### Scenario: A save attempt completes

- **WHEN** a save (user-triggered or automatic) finishes
- **THEN** QuickApps SHALL post exactly one of AutoSaveComplete, SaveSuccess, or
  SaveError describing the outcome, so the host does not need to infer save state by
  other means

### Requirement: Inbound message contract

QuickApps SHALL accept the following inbound message types from the host and SHALL
ignore any message whose origin fails the allowed-origin check (see "Origin
validation") regardless of its type:

- **TriggerSave** / **TriggerAutoSave** — instructs QuickApps to save the current
  editor state; QuickApps SHALL treat this as equivalent to a locally-triggered save
  for the purpose of the outbound save-outcome messages above.
- **Reset** — instructs QuickApps to discard in-progress edits and reload the editor
  state from scratch.
- **ToolsetLoginResult** / **ToolsetLogoutResult** — delivers the outcome of a
  previously requested toolset login/logout back to QuickApps.

#### Scenario: Host requests a save while QuickApps has unsaved changes

- **WHEN** QuickApps receives a TriggerSave or TriggerAutoSave message from an allowed
  origin
- **THEN** QuickApps SHALL perform a save of the current editor state and report the
  outcome via the outbound save-outcome messages

#### Scenario: Host requests a reset

- **WHEN** QuickApps receives a Reset message from an allowed origin
- **THEN** QuickApps SHALL discard in-progress edits and reload the editor state

### Requirement: Origin validation

QuickApps SHALL validate the origin of every inbound message against a configured
allowed-origin value before acting on it, and SHALL target outbound messages at that
same allowed-origin value (or a resolved host origin, per "Host origin resolution")
rather than broadcasting unconditionally to any origin.

#### Scenario: Allowed origin is configured as a specific origin

- **WHEN** an allowed-origin value other than the wildcard is configured, and an
  inbound message's origin does not match it exactly
- **THEN** QuickApps SHALL discard the message without acting on it

#### Scenario: Allowed origin is configured as the wildcard

- **WHEN** the allowed-origin value is configured as the wildcard (`*`)
- **THEN** QuickApps SHALL accept inbound messages regardless of origin, and SHALL
  target outbound messages using the wildcard as well

### Requirement: Application credentials request

QuickApps SHALL be able to ask the host to supply credentials for a specific
application without requiring the host to have pre-loaded them.

#### Scenario: QuickApps needs credentials for an application

- **WHEN** QuickApps determines it needs credentials for a given application id (for
  example, because `applicationCredentials` mode is active)
- **THEN** QuickApps SHALL post a RequestApplicationCredentials message carrying that
  application id to the resolved allowed origin
