## Why

When an application has no stored model, the editor pre-selects one. If the deployment config has no `DEFAULT_DEPLOYMENT`, the editor falls back to a hardcoded deployment id, `gpt-4o` (`src/constants/quick-apps.ts:7`, used as a default parameter in `src/form/quickApp2Form.ts:177` and `:192`). Deployment ids depend on the installation. The fallback picks `gpt-4o` only on installations that have a deployment with that exact id, so the pre-selected model depends on a name in the source code instead of on configuration. The README already documents `DEFAULT_DEPLOYMENT` as the way to pre-select a model (`README.md:197-201`).

## What Changes

- Remove `DEFAULT_QUICK_APPS_MODEL` from `src/constants/quick-apps.ts`.
- `resolveDefaultModelId` and `getQuickApp2FormData` take the configured default model id as an optional value with no built-in fallback.
- The model pre-selected for an application without a stored model is resolved in this order:
  1. the stored model (unchanged),
  2. the configured default (`settings.defaultModelId`, from chat-api `config.defaultDeploymentId`), if it is among the loaded deployments (unchanged),
  3. the first tool-supporting model (unchanged),
  4. otherwise empty (unchanged).
- **Behaviour change** (not breaking for a configured installation): an installation without `DEFAULT_DEPLOYMENT` that has a `gpt-4o` deployment now pre-selects the first tool-supporting model instead of `gpt-4o`. Installations that set `DEFAULT_DEPLOYMENT` see no change.

**Problem.** A deployment-specific id is hardcoded in the SPA.

**Solution.** Use only the configured default. Steps 3–4 already exist as the fallback.

**Non-goals.**
- Requiring the configured default to support tools. Today it only has to be among the loaded deployments, and this change keeps that rule.
- Changing where `defaultDeploymentId` comes from, or changing chat-api.
- Any change to the model picker.

**Alternatives considered.** Keeping `gpt-4o` as a "sensible default" was rejected because it is the hardcoded value this change removes. Moving it to a build-time env variable was also rejected: `DEFAULT_DEPLOYMENT` already provides a runtime setting.

**Acceptance criteria.**
- `src/` has no hardcoded deployment id used to pre-select a model.
- With a `defaultModelId` that is among the loaded deployments, that model is pre-selected.
- Without a `defaultModelId`, or when it is not among the loaded deployments, the first tool-supporting model is pre-selected, even if a `gpt-4o` deployment exists.
- No tool-supporting model and no usable default → the model stays empty and the existing validation error is shown.
- A stored model is never replaced.

**Rollback.** Revert the commit. No data migration is needed: the pre-selected model is persisted only when the user saves.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `orchestrator_model-selection`: adds a requirement for the model pre-selected when the application has no stored model. The current spec does not cover this.

## Impact

- Code: `src/constants/quick-apps.ts`, `src/form/quickApp2Form.ts` (`resolveDefaultModelId`, `getQuickApp2FormData`), and form/hook tests. Call sites in `src/components/QuickApp2Form.tsx:63-68` and `src/hooks/use-quick-app2-form.ts:138-143` already pass `settings.defaultModelId` and need no change.
- API layer: none. No new chat-api call. `fetchAppSettings` (`src/utils/dialClient.ts:298`) is unchanged.
- Auth / host integration: none.
- Docs: in `README.md` "Default model", state what happens when `DEFAULT_DEPLOYMENT` is not set.
- i18n: no new user-visible strings.
- RTL / direction: none. No UI change.
