# Spec Delta

## MODIFIED Requirements

### Requirement: Application properties written on save

`buildQuickApp2Config` (`src/form/quickApp2Form.ts`) SHALL build `application_properties`
with these top-level keys. Each section's values are owned by the capability named; this
requirement fixes only the top-level shape and what is carried over from the loaded
configuration.

| Key                     | Content                                                                                                                                                                                                                                     | Owner                                                                                                      |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `orchestrator`          | the loaded `orchestrator` object with `deployment` replaced by `{ deployment_id, parameters }`, `system_prompt` replaced by `{ type: "custom", variables, content }`, and `attachment_strategy` set only when the model accepts attachments | `orchestrator_model-selection` (model), `application_advanced-settings` (temperature, attachment strategy) |
| `contexts`              | `[{ url, type: "file" }]`, one per knowledge-base item, always present                                                                                                                                                                      | `application_knowledge-base`                                                                               |
| `tool_sets`             | MCP toolsets, then agents, then one `dial-deployment-tool-set` entry (always present, possibly with no tools), then inline toolsets, then the code interpreter when on                                                                      | `toolsets_selection`, `agents_selection`, `application_advanced-settings` (code interpreter)               |
| `conversation_starters` | the starters object, or `null` when there are no non-blank starters                                                                                                                                                                         | `application_conversation-starters`                                                                        |
| `skills`                | `[{ type: "dial-skill", url }]` in attached order; the key SHALL be omitted when no skill is attached                                                                                                                                       | `skills_catalog`                                                                                           |
| `features`              | the loaded `features` object with `timestamp`, `dial_files`, `representation_tooling` and `web_fetch` set                                                                                                                                   | `application_advanced-settings`                                                                            |

`orchestrator.system_prompt.content` SHALL be the instructions exactly as typed, whitespace
included, and `orchestrator.system_prompt.variables` SHALL be the loaded
`system_prompt.variables`, or `{}` when none were loaded. Keys inside the loaded
`orchestrator` and `features` objects that the editor does not set SHALL be kept, including
keys nested inside `orchestrator.deployment` (such as `name`, and `parameters` keys other than
`temperature`) and inside `orchestrator.system_prompt`.
Top-level keys of the loaded `application_properties` other than the six in the table (and
other than `input_attachment_types` and `max_input_attachments`, which the editor owns)
SHALL be kept as loaded. Keys of array items that the editor does not own SHALL be kept too:
extra keys on a starter, on a skill or on a context, and `skills` and `contexts` entries of a
`type` the editor does not manage, are saved as loaded.

#### Scenario: Unknown orchestrator and feature keys are kept

- **WHEN** the loaded `application_properties` has `orchestrator.custom_flag: true` and
  `features.beta: {}` and the user saves
- **THEN** the saved `orchestrator.custom_flag` SHALL be `true` and `features.beta` SHALL be
  `{}`

#### Scenario: No skills attached

- **WHEN** the user saves an application with no attached skills
- **THEN** the saved `application_properties` SHALL have no `skills` key

#### Scenario: System prompt variables are kept

- **WHEN** the loaded `orchestrator.system_prompt.variables` is `{ "team": "support" }` and
  the user changes the instructions to `"  Be brief  "` and saves
- **THEN** the saved `system_prompt` SHALL be
  `{ "type": "custom", "variables": { "team": "support" }, "content": "  Be brief  " }`

#### Scenario: Unknown top-level keys are kept

- **WHEN** the loaded `application_properties` has `my_section: { "a": 1 }` and the user
  changes the instructions and saves
- **THEN** the saved `application_properties.my_section` SHALL be `{ "a": 1 }`

#### Scenario: Unknown nested orchestrator keys are kept

- **WHEN** the loaded `orchestrator` has `max_iterations: 25`, `deployment.name: "Main"` and
  `tool_discovery: { "enabled": true }` and the user changes the model and saves
- **THEN** the saved `orchestrator` SHALL keep `max_iterations`, `tool_discovery` and
  `deployment.name`, with `deployment.deployment_id` set to the new model

#### Scenario: Deployment parameters other than temperature are kept

- **WHEN** the loaded `orchestrator.deployment.parameters` has `top_p` and `seed` and the user saves
- **THEN** the saved `parameters` SHALL still contain `top_p` and `seed` (see `application_advanced-settings` for `temperature`)

#### Scenario: Unknown skill type and item keys are kept

- **WHEN** the loaded `skills` has `{ "type": "dial-skill", "url": "skills/a", "note": "x" }` and
  `{ "type": "other-skill", "ref": "r" }`, the loaded starters have a starter with `"tag": "t"`,
  and the user saves
- **THEN** the saved `skills` SHALL contain both entries with their extra keys, and the saved
  starter SHALL still have `"tag": "t"`
