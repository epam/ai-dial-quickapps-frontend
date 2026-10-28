# Proposal

## Why

A new QuickApp opens with values the editor hardcodes (`src/form/quickApp2Form.ts:64` `DEFAULT_TEMPERATURE`,
`resolveDefaultModelId` at `:209`), while the application type schema that DIAL Core publishes for QuickApps
(`GET /api/v1/application-schemas/{id}`) already carries `default`s. The editor never calls
`applicationsApi.getApplicationSchema`: it only passes `applicationTypeSchemaId` through
(`src/utils/dial-client.ts:362`). As a result the backend cannot steer what a new app starts with, for example
`DEFAULT_ORCHESTRATOR_DEPLOYMENT_ID`. Issue #290.

## What Changes

- On open, fetch the schema for the loaded app's `applicationTypeSchemaId` (`getApplicationSchema({ id })`).
  A missing id or a failed call is not an error: the editor behaves as today.
- Read the schema the standard JSON Schema way: resolve local `$ref` (`#/$defs/...`) with the keywords written
  next to it taking precedence (so `orchestrator.deployment.default`, which sits beside `$ref`, is kept), and read
  an optional object (`anyOf` with a `null` branch) as its object branch.
- Pre-fill the form from those defaults for properties the app has not stored: the model
  (`orchestrator.deployment.deployment_id`), the conversation starters settings (`intro_text`, `auto_submit`,
  `chat_message_input_disabled`), Add attachment (`RepresentationToolingConfig.add_attachment`) and Web fetch
  (`WebFetchConfig.enabled`).
- **Behaviour change:** the schema's Web fetch default is `false`, so a new app on such a backend starts with
  Web fetch off instead of on (`9913cff`). A backend whose schema gives no default keeps today's `true`.
- A schema default model that is not among the loaded deployments, or is not tool-capable, is skipped and the
  existing fallback chain continues (decision for the open point in the issue).
- The schema default takes precedence over the client-config `defaultDeploymentId`, which stays as the next
  fallback.
- Copy only what the form edits. `max_iterations`, `propagate_stages` and similar are not written to the
  manifest, so backend runtime defaults keep applying.
- **Not breaking.** Stored values always win.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `application_editing`: new requirement "Application type schema defaults" (load, `$ref` / `anyOf` reading,
  supported properties, failure fallback, scope of what is copied).
- `orchestrator_model-selection`: "Initial model for an application without a stored model" gains the schema
  default as the first choice.
- `application_advanced-settings`: "Feature toggles are drafted and saved with the popup" takes the schema default
  for Add attachment and Web fetch before the built-in `true`.
- `application_conversation-starters`: "Starters settings controls" takes the schema defaults for the intro
  message, Require a starter and When starter is selected.

## Non-goals

- Temperature and system prompt: the schema's `temperature: null` (model default) has no representation in the
  number field and the system prompt default is an empty string (see design, open question 1).
- Time awareness, Built-in file tools, Process files: `Features` / orchestrator defaults for them are `null`.
- Validating the manifest against the schema, remote `$ref`, and listing schemas (`listApplicationSchemas`).

## Alternatives considered

- **Read only the property node, no `$ref` resolution**: enough for the model, but it cannot reach
  `ConversationStartersConfig`, `WebFetchConfig` or `RepresentationToolingConfig`, which live in `$defs`.
- **A JSON Schema library (`$ref` parser)**: more general, but a new dependency for local refs only; the editor
  needs one pointer lookup and one `anyOf` unwrap.
- **Backend-side defaults only**: the backend already applies runtime defaults, but the editor shows and saves
  these values, so the form must know them.
- **Chosen**: a small pure reader that resolves local `$ref` and optional-object `anyOf`, applied only to unset
  form values.

## Acceptance criteria

- A new QuickApp opens with `orchestrator.deployment` set to the schema default and the saved `deployment_id`
  equals it.
- No schema default, an unusable default, or a failed schema call: behaviour as today.
- Existing apps keep their saved values; defaults apply only to unset properties.
- Covered by this OpenSpec change and unit tests.

## Impact

- **Code:** `src/utils/dial-client.ts` (fetch schema), a new pure reader in `src/utils/`, `src/form/quickApp2Form.ts`,
  `src/hooks/use-quick-app2-form.ts`, `src/components/QuickApp2Form/QuickApp2Form.tsx`, the `DialApp` type.
- **API:** one extra read-only call, `GET /api/v1/application-schemas/{id}`; its failure never fails the load.
- **Scope flag:** touches the API layer and the load path, so review that the failure fallback holds.
- **i18n:** none, no new user-visible strings. **RTL:** none, no UI change.
- **Rollback:** revert the commit; nothing is persisted that was not already a form field.
