## MODIFIED Requirements

### Requirement: Outbound message contract

QuickApps SHALL emit the following outbound message types. The typed messages SHALL be posted
as `{ type, payload? }` (types from `OutboundMessageType`, `src/types/editor-messages.ts`) to the
allowed origins, per "Origin validation", and SHALL NOT carry the application name; only the host
handshake and the plain `{applicationName}/…` messages SHALL use the application name supplied by
the entry URL, and they SHALL be addressed to the resolved host (see "Host origin resolution").

- **Ready** — sent once when the editor mounts, before the application has loaded.
- **HeightChange** — sent whenever QuickApps' rendered content height changes, carrying
  `{ height }` so the host can size its embedding container.
- **DirtyState** — sent when the unsaved-changes state of the current editor session
  changes, carrying `{ isDirty }`.
- **SaveSuccess** — sent when a manual save completes successfully, carrying the updated
  application data and `hasChanges` (its meaning is defined in `application_editing`).
- **SaveError** — sent when a save request fails, carrying `{ error }`, the error's message.
- **AutoSaveComplete** — sent when an automatic (non-user-triggered) save completes.
- **RequestApplicationCredentials** — sent to ask the host to supply credentials for a
  given application id (see "Application credentials request").
- **RequestToolsetLogin** / **RequestToolsetLogout** — sent to ask the host to run a
  toolset's login/logout flow on QuickApps' behalf (see `toolsets_login`).
- **`{applicationName}/readyToSave`** — a plain (non-typed) message sent once the
  editor session is ready to accept a save trigger from the host.
- **`{applicationName}/loggedOut`** — a plain (non-typed) message sent when QuickApps
  detects the current session has logged out.

#### Scenario: Rendered content height changes

- **WHEN** the height of QuickApps' rendered content changes
- **THEN** QuickApps SHALL post a HeightChange message with the new height to the
  allowed origins, so the host can resize the embedding container without QuickApps
  needing to know how the host renders it

#### Scenario: A save request completes

- **WHEN** a save (user-triggered or automatic) sends its request to chat-api and that request
  finishes
- **THEN** QuickApps SHALL post exactly one of AutoSaveComplete, SaveSuccess, or
  SaveError describing the outcome, so the host does not need to infer save state by
  other means

#### Scenario: A save trigger is skipped

- **WHEN** a save trigger is skipped before any request is sent (the cases listed in
  `application_editing`, such as an auto-save before the first save or an invalid form)
- **THEN** QuickApps SHALL post no save-outcome message for it

#### Scenario: Plain messages use the name from the entry URL

- **WHEN** the entry URL carries `applicationName=X` and the editor becomes ready to
  save or the session logs out
- **THEN** QuickApps SHALL post `X/readyToSave` or `X/loggedOut` respectively to the
  resolved host

### Requirement: Inbound message contract

QuickApps SHALL accept the following inbound message types from the host and SHALL
ignore any message whose origin fails the allowed-origin check (see "Origin
validation") regardless of its type:

- **TriggerSave** / **TriggerAutoSave** — instructs QuickApps to save the current
  editor state; QuickApps SHALL treat this as equivalent to a locally-triggered save
  for the purpose of the outbound save-outcome messages above. When a trigger is skipped is
  defined in `application_editing`.
- **Reset** — instructs QuickApps to discard in-progress edits by remounting the editor form
  with the values loaded when the editor opened; it SHALL NOT refetch the application.
- **ToolsetLoginResult** / **ToolsetLogoutResult** — delivers the outcome of a toolset
  login/logout back to QuickApps: the outcome of a login/logout QuickApps requested, and also a
  login the host ran on its own (see `toolsets_login`).

#### Scenario: Host requests a save while QuickApps has unsaved changes

- **WHEN** QuickApps receives a TriggerSave or TriggerAutoSave message from an allowed
  origin, and `application_editing` does not skip the trigger
- **THEN** QuickApps SHALL perform a save of the current editor state and report the
  outcome via the outbound save-outcome messages

#### Scenario: Host requests a reset

- **WHEN** QuickApps receives a Reset message from an allowed origin
- **THEN** QuickApps SHALL discard in-progress edits and remount the editor form with the
  values loaded when the editor opened, without a chat-api request

### Requirement: Origin validation

QuickApps SHALL validate the origin of every inbound message against the configured list of
allowed origins (`allowedOrigin`, see `app-configuration`) before acting on it. Typed outbound
messages SHALL be addressed to each configured allowed origin individually, or to the wildcard
when the list allows any origin; the host handshake and the plain `{applicationName}/…` messages
are addressed to the resolved host instead (see "Host origin resolution").

#### Scenario: Allowed origins are configured as specific origins

- **WHEN** one or more allowed origins other than the wildcard are configured, and an
  inbound message's origin does not exactly match any of them
- **THEN** QuickApps SHALL discard the message without acting on it

#### Scenario: Several allowed origins are configured

- **WHEN** more than one specific allowed origin is configured
- **THEN** QuickApps SHALL accept inbound messages from any of them, and SHALL address
  each outbound message to every configured origin individually, so that only the
  embedding host whose origin matches receives it

#### Scenario: Allowed origin is configured as the wildcard or not configured

- **WHEN** the allowed origins include the wildcard (`*`), or none are configured
- **THEN** QuickApps SHALL accept inbound messages regardless of origin, and SHALL
  target outbound messages using the wildcard as well

### Requirement: Application credentials request

QuickApps SHALL be able to ask the host to supply credentials for a specific
application without requiring the host to have pre-loaded them. The conditions for offering
the request and the hand-over itself are defined in `application_credentials`.

#### Scenario: User asks for an application's credentials

- **WHEN** the user activates the Application credentials action of an attached application
  in credentials mode (see `application_credentials`)
- **THEN** QuickApps SHALL post a RequestApplicationCredentials message carrying that
  application id to the allowed origins, per "Origin validation"
