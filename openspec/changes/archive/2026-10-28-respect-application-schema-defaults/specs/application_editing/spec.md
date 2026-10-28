## ADDED Requirements

### Requirement: Application type schema defaults

When the loaded application has an `applicationTypeSchemaId`, QuickApps SHALL request the schema with
`GET /api/v1/application-schemas/{id}` (`applicationsApi.getApplicationSchema({ id })`) as part of the
application load. A missing id or a failed call SHALL NOT fail the load, and the editor SHALL then behave as if
the schema had no defaults.

Schema nodes SHALL be read the standard JSON Schema way, so that a default is found wherever the schema puts it:

- a local `$ref` (`#/$defs/<name>`, a JSON Pointer into the same schema) SHALL be resolved, and the keywords
  written next to the `$ref`, `default` included, SHALL take precedence over the referenced definition;
- an `anyOf` / `oneOf` that has exactly one non-`null` branch (the way an optional object is declared, for
  example `features`) SHALL be read as that branch;
- a reference that cannot be resolved, or that is circular, SHALL be treated as a node with no default.

The editor SHALL use a schema default only for a form value the application has not stored, and only for
properties the form edits. It SHALL NOT write schema-only properties (such as `max_iterations` or
`propagate_stages`) into the saved `application_properties`. A schema default SHALL NOT mark the form dirty, and
it SHALL be persisted only when the application is saved. A default of the wrong type SHALL be ignored.

The supported properties are:

| Schema property (after resolution) | Form value |
|---|---|
| `orchestrator.deployment.default.deployment_id` | `model` |
| `orchestrator.deployment` → `parameters` → `temperature.default` | `temperature` |
| `conversation_starters` → `intro_text.default` | `introText` |
| `conversation_starters` → `auto_submit.default` | `autoSubmit` |
| `conversation_starters` → `chat_message_input_disabled.default` | `chatMessageInputDisabled` |
| `features.representation_tooling` → `add_attachment.default` | `addAttachment` |
| `features.web_fetch` → `enabled.default` | `webFetch` |

Conversation starters defaults SHALL apply only when the application has no stored `conversation_starters`
object: an object that is stored without `intro_text` means the intro text was left empty, and SHALL be read as
stored. A schema default SHALL take precedence over the editor's own fallback for the same value, and the
editor's own fallback SHALL apply for a value the schema does not provide.

#### Scenario: New app takes the schema default

- **WHEN** the application has no stored orchestrator model
- **AND** the schema default for `orchestrator.deployment` is `{ "deployment_id": "model-2" }`
- **AND** `model-2` is loaded and tool-capable
- **THEN** the `model` form value SHALL be `model-2`
- **AND** the form SHALL NOT be dirty
- **AND** a save SHALL send `deployment_id: "model-2"`

#### Scenario: Stored value wins

- **WHEN** the application stores `deployment_id: "model-3"`
- **AND** the schema default is `model-2`
- **THEN** the `model` form value SHALL be `model-3`

#### Scenario: Schema call fails or has no default

- **WHEN** the schema request fails, the application has no `applicationTypeSchemaId`, or the property has no `default`
- **THEN** the load SHALL succeed
- **AND** the form SHALL be pre-filled exactly as it is without this requirement

#### Scenario: Default beside a reference

- **WHEN** `orchestrator.deployment` is `{ "$ref": "#/$defs/DialDeploymentConfig", "default": { "deployment_id": "model-2" } }`
- **THEN** the default SHALL be `model-2`

#### Scenario: Default inside a referenced definition

- **WHEN** `features.web_fetch` is `{ "anyOf": [{ "$ref": "#/$defs/WebFetchConfig" }, { "type": "null" }] }`
- **AND** `#/$defs/WebFetchConfig.properties.enabled.default` is `false`
- **THEN** the default for `webFetch` SHALL be `false`

#### Scenario: Unresolvable or circular reference

- **WHEN** a node references `#/$defs/Missing`, or references itself
- **THEN** that node SHALL yield no default and the load SHALL succeed

#### Scenario: Temperature default

- **WHEN** the application stores no `orchestrator.deployment.parameters.temperature`
- **AND** the schema default of `temperature` is `0.2`
- **THEN** the `temperature` form value SHALL be `0.2`
- **AND** the form SHALL NOT be dirty

#### Scenario: Temperature default that is not a usable number

- **WHEN** the schema default of `temperature` is `null`, a string, or a number outside `0`–`1`
- **THEN** it SHALL be ignored and the `temperature` form value SHALL be the editor's own default

#### Scenario: Conversation starters defaults for an app without them

- **WHEN** the application has no stored `conversation_starters`
- **AND** the schema defaults are `intro_text: "Select an action"`, `auto_submit: true`, `chat_message_input_disabled: false`
- **THEN** the form values SHALL be `introText: "Select an action"`, `autoSubmit: true`, `chatMessageInputDisabled: false`
- **AND** the form SHALL NOT be dirty

#### Scenario: Stored conversation starters are not overridden

- **WHEN** the application stores `conversation_starters` without `intro_text`
- **AND** the schema default for `intro_text` is `"Select an action"`
- **THEN** the form value `introText` SHALL stay empty

#### Scenario: Schema-only properties are not saved

- **WHEN** the schema declares defaults for `max_iterations` and `propagate_stages`
- **THEN** a save SHALL NOT contain them unless the application already stored them
