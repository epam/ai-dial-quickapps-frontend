## ADDED Requirements

### Requirement: Host save obligations

QuickApps SHALL be the only writer of the application on a save. A host that embeds it SHALL
send the General-step values it owns in `general` with every `TRIGGER_SAVE`, whatever user
action caused the save (Save, Preview, or any other), and SHALL NOT send its own update
request for the application after a save outcome. QuickApps does not detect or reject a host
that breaks this; it only guarantees what it writes (see `application_editing`, "Quick app is
the single writer of a save").

QuickApps SHALL NOT depend on the host re-writing the application to keep any server-side flag
(such as `features.skills_supported`) set. Such flags are guaranteed by chat-api on every
update and are not part of this contract.

This introduces no new message, field, UI, string or RTL behavior.

#### Scenario: Host saves for Preview

- **WHEN** the host sends `TRIGGER_SAVE` with `general` because the user opened a preview
- **THEN** QuickApps SHALL persist those General-step values in its one update request, and
  post one SaveSuccess

#### Scenario: Host sends no second update

- **WHEN** QuickApps has posted SaveSuccess for a save that carried `general`
- **THEN** the application SHALL already hold the host's General-step values, so the host has
  nothing further to write for this save

#### Scenario: Host omits general

- **WHEN** the host sends `TRIGGER_SAVE` without `general`
- **THEN** QuickApps SHALL save with the General-step values it holds and SHALL NOT invent
  others, as in `application_editing`, "Save persists host-supplied General-step fields"
