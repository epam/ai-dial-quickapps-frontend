## ADDED Requirements

### Requirement: Initial model for an application without a stored model

When the loaded application has no stored orchestrator model (`application_properties.orchestrator.deployment.deployment_id` is empty or absent), the editor SHALL pre-select the `model` form value in this order:

1. the configured default model id, when it is among the loaded deployments,
2. otherwise the first tool-supporting model, in loaded-deployment order,
3. otherwise no model (empty value).

The configured default model id SHALL come only from chat-api's client config: `GET /api/v1/client-config?appId=chat-ui` (`appConfigApi.getClientConfig({ appId: 'chat-ui' })`), field `config.defaultDeploymentId` (`ClientConfigDto.defaultDeploymentId?: string | null`), exposed to the form as `AppSettings.defaultModelId` by `fetchAppSettings` in `src/utils/dialClient.ts`. The SPA SHALL NOT contain a hardcoded deployment id used as a default or fallback.

Example response (relevant part only):

```json
{ "config": { "defaultDeploymentId": "gemini-2.5-flash", "customVariables": { } } }
```

A stored model SHALL never be replaced by the pre-selection. The pre-selected value SHALL become the form's initial value: it SHALL NOT mark the form dirty, and it SHALL be persisted only when the application is saved.

State ownership is unchanged. The `model` value stays in the editor form state (`useQuickApp2Form` in `src/hooks/use-quick-app2-form.ts`). The loaded deployments come from `DataContext`, and the settings come from the editor's app state. No new context, endpoint or memoisation is introduced. The model id lists passed in stay memoised with `useMemo` in `src/components/QuickApp2Form.tsx`. The change adds no user-visible strings, no UI and no accessibility or RTL surface.

#### Scenario: Configured default is available

- **WHEN** the application has no stored model
- **AND** client config returns `defaultDeploymentId: "model-2"`
- **AND** the loaded deployments include `model-2`
- **THEN** the `model` form value SHALL be `model-2`

#### Scenario: Configured default is not set

- **WHEN** the application has no stored model
- **AND** client config returns no `defaultDeploymentId` (absent or `null`), or the client-config request fails
- **AND** the loaded deployments include a deployment with id `gpt-4o` and the tool-supporting models `model-1` and `gpt-4o`, in that order
- **THEN** the `model` form value SHALL be `model-1`

#### Scenario: Configured default is not among the loaded deployments

- **WHEN** the application has no stored model
- **AND** client config returns `defaultDeploymentId: "missing-model"`
- **AND** `missing-model` is not among the loaded deployments
- **AND** `model-1` is the first tool-supporting model
- **THEN** the `model` form value SHALL be `model-1`

#### Scenario: No usable model

- **WHEN** the application has no stored model
- **AND** there is no usable configured default and no tool-supporting model
- **THEN** the `model` form value SHALL stay empty
- **AND** the existing model validation error SHALL be shown on the Default model block

#### Scenario: Stored model is kept

- **WHEN** the application has a stored model `model-3`
- **AND** client config returns `defaultDeploymentId: "model-2"`
- **THEN** the `model` form value SHALL be `model-3`
