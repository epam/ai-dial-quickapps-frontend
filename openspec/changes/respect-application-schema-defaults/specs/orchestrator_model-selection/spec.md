## MODIFIED Requirements

### Requirement: Initial model for an application without a stored model

When the loaded application has no stored orchestrator model (`application_properties.orchestrator.deployment.deployment_id` is empty or absent), the editor SHALL pre-select the `model` form value in this order:

1. the application type schema default model id (`application_editing`, "Application type schema defaults"), when it is among the loaded deployments and is tool-capable,
2. otherwise the configured default model id, when it is among the loaded deployments,
3. otherwise the first tool-supporting model, in loaded-deployment order,
4. otherwise no model (empty value).

A schema default that is unavailable or not tool-capable SHALL be skipped silently and the order continues; no error is shown for it.

The configured default model id SHALL come only from chat-api's client config: `GET /api/v1/client-config?appId=chat-ui` (`appConfigApi.getClientConfig({ appId: 'chat-ui' })`), field `config.defaultDeploymentId` (`ClientConfigDto.defaultDeploymentId?: string | null`), exposed to the form as `AppSettings.defaultModelId` by `fetchAppSettings` in `src/utils/dial-client.ts`. The SPA SHALL NOT contain a hardcoded deployment id used as a default or fallback.

Example response (relevant part only):

```json
{ "config": { "defaultDeploymentId": "gemini-2.5-flash", "customVariables": {} } }
```

A stored model SHALL never be replaced by the pre-selection. The pre-selected value SHALL become the form's initial value: it SHALL NOT mark the form dirty, and it SHALL be persisted only when the application is saved.

The `model` value is owned by the editor form state (`useQuickApp2Form` in `src/hooks/use-quick-app2-form.ts`). The loaded deployments come from `DataContext`, and the settings come from the editor's app state. The model id lists passed to the form are memoised with `useMemo` in `src/components/QuickApp2Form/QuickApp2Form.tsx`. The pre-selection has no user-visible strings, UI, accessibility or RTL surface of its own.

#### Scenario: Schema default is available

- **WHEN** the application has no stored model
- **AND** the schema default is `model-4` and client config returns `defaultDeploymentId: "model-2"`
- **AND** `model-4` is loaded and tool-capable
- **THEN** the `model` form value SHALL be `model-4`

#### Scenario: Schema default is unusable

- **WHEN** the application has no stored model
- **AND** the schema default is `model-4`, which is not loaded or does not support tools
- **AND** client config returns `defaultDeploymentId: "model-2"` and `model-2` is loaded
- **THEN** the `model` form value SHALL be `model-2`

#### Scenario: Configured default is available

- **WHEN** the application has no stored model
- **AND** there is no usable schema default
- **AND** client config returns `defaultDeploymentId: "model-2"`
- **AND** the loaded deployments include `model-2`
- **THEN** the `model` form value SHALL be `model-2`

#### Scenario: Configured default is not set

- **WHEN** the application has no stored model
- **AND** there is no usable schema default
- **AND** client config returns no `defaultDeploymentId` (absent or `null`), or the client-config request fails
- **AND** the loaded deployments include a deployment with id `gpt-4o` and the tool-supporting models `model-1` and `gpt-4o`, in that order
- **THEN** the `model` form value SHALL be `model-1`

#### Scenario: Configured default is not among the loaded deployments

- **WHEN** the application has no stored model
- **AND** there is no usable schema default
- **AND** client config returns `defaultDeploymentId: "missing-model"`
- **AND** `missing-model` is not among the loaded deployments
- **AND** `model-1` is the first tool-supporting model
- **THEN** the `model` form value SHALL be `model-1`

#### Scenario: No usable model

- **WHEN** the application has no stored model
- **AND** there is no usable schema default, no usable configured default and no tool-supporting model
- **THEN** the `model` form value SHALL stay empty
- **AND** the existing model validation error SHALL be shown on the Default model block

#### Scenario: Stored model is kept

- **WHEN** the application has a stored model `model-3`
- **AND** the schema default is `model-4` and client config returns `defaultDeploymentId: "model-2"`
- **THEN** the `model` form value SHALL be `model-3`
