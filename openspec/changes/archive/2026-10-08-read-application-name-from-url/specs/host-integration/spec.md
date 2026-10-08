## MODIFIED Requirements

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
- `applicationName` — the name by which the host expects QuickApps to identify itself in
  the host handshake and in the `{applicationName}/…` messages. It is the only source of
  the application name: QuickApps SHALL NOT read it from runtime configuration. Its absence
  is meaningful: QuickApps does not address the host (see "Host handshake on load") but
  otherwise renders normally.

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

#### Scenario: Host supplies an application name

- **WHEN** the entry URL includes `applicationName=<percent-encoded-name>`
- **THEN** QuickApps SHALL decode the name and use it as the application name for the
  handshake and for every `{applicationName}/…` message

#### Scenario: Different hosts load one deployment with different names

- **WHEN** one QuickApps deployment is loaded with `applicationName=A` in one embedding
  and `applicationName=B` in another
- **THEN** each embedding SHALL be addressed using its own name, independent of any
  runtime configuration

#### Scenario: Entry URL carries no `applicationName`

- **WHEN** QuickApps is loaded without an `applicationName` query parameter, or with an
  empty one
- **THEN** QuickApps SHALL NOT send the host handshake or any `{applicationName}/…`
  message, and SHALL NOT fall back to a configured name, while the editor still renders

Keeping the active session consistent with `authProvider` is authentication behavior,
specified in `auth`'s "Session provider consistency" requirement, not repeated here.

### Requirement: Host handshake on load

QuickApps SHALL announce itself as ready to any host capable of receiving a
handshake, without requiring the host to poll or guess when QuickApps has finished
initializing.

#### Scenario: Host connection details become available

- **WHEN** QuickApps determines a target host origin (see "Host origin resolution") and
  the entry URL supplies an application name
- **THEN** QuickApps SHALL send a "ready" signal and a "ready to interact" signal to
  that host, each exactly once for that load

#### Scenario: Host connection details are not yet available

- **WHEN** the host origin QuickApps needs has not yet been resolved, or the entry URL
  supplies no application name
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

- **WHEN** neither host origin is configured, or the entry URL supplies no application
  name
- **THEN** QuickApps SHALL NOT attempt to address a host and SHALL NOT send the
  handshake

### Requirement: Outbound message contract

QuickApps SHALL emit the following outbound message types toward the resolved host,
each identifying itself with the application name supplied by the entry URL and, where
noted, carrying the stated payload:

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

#### Scenario: Plain messages use the name from the entry URL

- **WHEN** the entry URL carries `applicationName=X` and the editor becomes ready to
  save or the session logs out
- **THEN** QuickApps SHALL post `X/readyToSave` or `X/loggedOut` respectively to the
  resolved host
