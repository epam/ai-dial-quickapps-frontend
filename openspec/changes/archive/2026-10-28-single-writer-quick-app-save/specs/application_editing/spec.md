## ADDED Requirements

### Requirement: Quick app is the single writer of a save

A save SHALL send exactly one update request to chat-api per save trigger that passes the gating
(see "Save request"), carrying both the General-step fields (when `general` is present) and the
configuration. QuickApps SHALL NOT rely on a second write by the host to persist either.

After a successful save with a `general` payload, the General-step values held by `EditorClient`
SHALL be those the payload carried, so that a later save without `general` (every auto-save)
sends them and not the values loaded when the editor opened. This holds for a save the host
triggered for any reason, including a preview.

#### Scenario: Save with general sends one request

- **WHEN** a TriggerSave with `general` passes the gating
- **THEN** QuickApps SHALL send one update request containing the General-step fields and
  `applicationProperties`, and no other write for this save

#### Scenario: Auto-save after a save with general

- **WHEN** a TriggerSave with `general.name` `"Renamed"` and `general.description` `"New text"`
  succeeds, the user then changes the instructions, and a TriggerAutoSave runs
- **THEN** the auto-save's update request SHALL carry `name` `"Renamed"` and `description`
  `"New text"`, not the values loaded when the editor opened

#### Scenario: Save without general keeps stored General values

- **WHEN** a save without `general` runs after the application was loaded and not yet saved
- **THEN** the update request SHALL carry the loaded General-step values unchanged
