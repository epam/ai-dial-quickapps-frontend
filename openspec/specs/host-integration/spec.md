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
- **THEN** QuickApps SHALL send `{applicationName}/READY` and
  `{applicationName}/READY_TO_INTERACT` through the legacy connector, and
  `{applicationName}/readyToInteract` through `AppsEditorClient`, to that host, each
  exactly once for the resolved connection

#### Scenario: Host connection details are not yet available

- **WHEN** the host origin QuickApps needs has not yet been resolved, or the entry URL
  supplies no application name
- **THEN** QuickApps SHALL NOT send the ready handshake, and SHALL send it as soon as
  the required information becomes available

#### Scenario: Settings revalidation keeps the connection unchanged

- **WHEN** settings are revalidated without changing the resolved host or application name
- **THEN** QuickApps SHALL NOT repeat the three handshake messages

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

QuickApps SHALL use shared editor message enums/types from the published connector and
app-specific types for Admin extensions. Unprefixed messages SHALL be posted through a
typed `postEditorMessage` adapter delegating to `postToHost`, to the allowed origins,
per "Origin validation", without the application name. The host handshake and typed
`{applicationName}/…` lifecycle messages SHALL use
the name from the entry URL and the resolved host (see "Host origin resolution").
The adapter SHALL preserve existing wire envelopes, including
`{ type: "SAVE_SUCCESS", payload: { updatedApp }, hasChanges }` and
`{ type: "SAVE_ERROR", payload: { error } }`.

- **Ready** — sent once when the editor mounts, before the application has loaded.
- **HeightChange** — sent whenever QuickApps' rendered content height changes, carrying
  `{ height }` so the host can size its embedding container.
- **DirtyState** — sent when the unsaved-changes state of the current editor session
  changes, carrying `{ isDirty }`.
- **ValidityState** — sent when whether the form values pass validation (`QuickApp2Schema`,
  deferred errors included) changes, carrying `{ isValid }`, so the host can disable its Save
  button while `isValid` is `false`. A form that starts invalid (e.g. a new application with
  blank Instructions) posts `{ isValid: false }` once it mounts; a valid form posts nothing
  until it first becomes invalid.
- **SaveSuccess** — sent when a manual save completes successfully, carrying the updated
  application data and `hasChanges` (its meaning is defined in `application_editing`).
- **SaveError** — sent when a save request fails, or a manual save is blocked by form
  validation, carrying `{ error }`, the error's message.
- **AutoSaveComplete** — sent when an automatic (non-user-triggered) save completes.
- **RequestApplicationCredentials** — sent to ask the host to supply credentials for a
  given application id (see "Application credentials request").
- **RequestToolsetLogin** / **RequestToolsetLogout** — sent to ask the host to run a
  toolset's login/logout flow on QuickApps' behalf (see `toolsets_login`).
- **`{applicationName}/readyToInteract`** — a typed lifecycle message sent as part of
  the host handshake.
- **`{applicationName}/readyToSave`** — a typed lifecycle message sent once the active
  authenticated editor generation is ready to accept a save trigger from the host.
- **`{applicationName}/loggedOut`** — a typed lifecycle message sent when QuickApps
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
  `application_editing`, such as an auto-save before the first save or an invalid auto-save)
- **THEN** QuickApps SHALL post no save-outcome message for it, except SaveError for a manual
  save that fails validation

#### Scenario: Lifecycle messages use the name from the entry URL

- **WHEN** the entry URL carries `applicationName=X` and the editor becomes ready to
  save or the session logs out
- **THEN** QuickApps SHALL post `X/readyToSave` or `X/loggedOut` respectively to the
  resolved host

### Requirement: Inbound message contract

QuickApps SHALL accept the following inbound message types only after the common
`readHostEditorMessage` utility verifies the parent window source, the allowed origin,
and the message shape. It SHALL use the shared protocol parser for save and toolset
messages, with app-domain validation of `general` and credentials; app-only autosave
and reset extensions SHALL be validated by the same utility. It SHALL ignore malformed
known fields and unknown message types without a save, reset, request completion, or
state update. Optional `general` may be absent; if present it SHALL match the app's
`TriggerSaveGeneralPayload`. Toolset result credentials and credentials level, if
present, SHALL match the app's existing domain types.

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

- **WHEN** QuickApps receives a TriggerSave or TriggerAutoSave message from its parent at an allowed
  origin with a valid payload, and `application_editing` does not skip the trigger
- **THEN** QuickApps SHALL perform a save of the current editor state and report the
  outcome via the outbound save-outcome messages

#### Scenario: Host requests a reset

- **WHEN** QuickApps receives a valid Reset message from its parent at an allowed origin
- **THEN** QuickApps SHALL discard in-progress edits and remount the editor form with the
  values loaded when the editor opened, without a chat-api request

#### Scenario: Save trigger omits general metadata

- **WHEN** the parent sends `{ "type": "TRIGGER_SAVE" }` from an allowed origin
- **THEN** QuickApps SHALL accept the trigger without inventing general metadata

#### Scenario: Known message fields are malformed

- **WHEN** the parent sends a save with malformed general fields, an autosave with a
  non-boolean `payload.ignoreDirty`, or a toolset result with malformed known fields
- **THEN** QuickApps SHALL ignore the entire message without side effects

### Requirement: Origin validation

QuickApps SHALL require `event.source === window.parent` and validate the origin of every
inbound message against the configured list of allowed origins (`allowedOrigin`, see
`app-configuration`) before acting on it. The source requirement SHALL apply even when
the allowed-origin configuration permits any origin. Typed outbound
messages SHALL be addressed to each configured allowed origin individually, or to the wildcard
when the list allows any origin; the host handshake and the typed `{applicationName}/…` lifecycle messages
are addressed to the resolved host instead (see "Host origin resolution").

#### Scenario: Allowed origins are configured as specific origins

- **WHEN** one or more allowed origins other than the wildcard are configured, and an
  inbound message's origin does not exactly match any of them
- **THEN** QuickApps SHALL discard the message without acting on it

#### Scenario: Several allowed origins are configured

- **WHEN** more than one specific allowed origin is configured
- **THEN** QuickApps SHALL accept valid inbound parent messages from any of them, and SHALL address
  each outbound message to every configured origin individually, so that only the
  embedding host whose origin matches receives it

#### Scenario: Allowed origin is configured as the wildcard or not configured

- **WHEN** the allowed origins include the wildcard (`*`), or none are configured
- **THEN** QuickApps SHALL accept valid inbound parent messages regardless of origin, and SHALL
  target outbound messages using the wildcard as well

#### Scenario: Another window uses an allowed origin

- **WHEN** a window other than the embedding parent sends a valid message from an
  allowed origin, including with wildcard or empty allowed-origin configuration
- **THEN** QuickApps SHALL discard the message without acting on it

### Requirement: Application credentials request

QuickApps SHALL be able to ask the host to supply credentials for a specific
application without requiring the host to have pre-loaded them. The conditions for offering
the request and the hand-over itself are defined in `application_credentials`.

#### Scenario: User asks for an application's credentials

- **WHEN** the user activates the Application credentials action of an attached application
  in credentials mode (see `application_credentials`)
- **THEN** QuickApps SHALL post a RequestApplicationCredentials message carrying that
  application id to the allowed origins, per "Origin validation"

### Requirement: Editor readiness belongs to the active authenticated editor

`App` SHALL own readiness for the currently mounted authenticated editor generation.
Readiness SHALL NOT carry across logout, replacement user, or an editor unmount and
remount. A readiness callback from a retired generation SHALL have no effect. The
active generation SHALL send `readyToSave` only after its own model-ready callback,
at most once per generation and resolved host connection. This introduces no new
chat-api endpoint or request shape. No new UI, strings/i18n keys, accessibility, or
RTL behavior is introduced; the bridge is direction-agnostic. Callback/effect
identities SHALL remain stable while their owning session and connection are unchanged.

#### Scenario: The same user logs out and signs in again

- **WHEN** a ready editor logs out and a new editor mounts after the same user signs in
- **THEN** QuickApps SHALL report logout and SHALL NOT report the replacement editor
  ready until that editor reports its own model readiness

#### Scenario: A retired editor reports readiness late

- **WHEN** an editor's saved readiness callback runs after its generation was retired
- **THEN** QuickApps SHALL NOT mark the active generation ready or emit `readyToSave`

#### Scenario: A different user replaces the current editor

- **WHEN** authentication changes to another user and a replacement editor mounts
- **THEN** readiness from the previous user SHALL NOT make the new editor ready

#### Scenario: Host details arrive after the current editor becomes ready

- **WHEN** the active editor reports readiness before host details resolve
- **THEN** QuickApps SHALL send its `readyToSave` once the target is available, provided
  that editor generation is still active
