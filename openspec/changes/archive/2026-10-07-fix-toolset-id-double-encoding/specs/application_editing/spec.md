## ADDED Requirements

### Requirement: Saved entity references use the canonical id

QuickApps SHALL persist every referenced entity id — `tool_sets[].deployment_id` for
toolsets, agents and DIAL deployment tools — in chat-api's canonical form: each path
segment percent-encoded exactly once, identical to the `id` returned by
`GET /api/v1/toolsets` and `GET /api/v1/deployments`. Inside the editor ids are held
decoded and encoded once when written.

#### Scenario: Toolset name contains a space

- **WHEN** chat-api lists a toolset with id `toolsets/<bucket>/QA%20enc%20check__1.0.0`
  and the user adds it in Agents & Toolsets and saves
- **THEN** the saved `tool_sets[].deployment_id` SHALL be
  `toolsets/<bucket>/QA%20enc%20check__1.0.0`, not `QA%2520enc%2520check__1.0.0`

#### Scenario: Reopening and saving an app keeps the id unchanged

- **WHEN** an app whose `tool_sets[].deployment_id` is
  `toolsets/<bucket>/QA%20enc%20check__1.0.0` is opened and saved again
- **THEN** the saved `deployment_id` SHALL be unchanged
