Slicing strategy: vertical, in one slice. The domain function changes first, together with its tests. Callers already pass `settings.defaultModelId`, so after task 1 the behaviour works end to end. Docs follow.

## 1. Resolve the initial model without a hardcoded fallback

- [x] 1.1 In `src/form/quickApp2Form.ts`, make `defaultModelId` an optional parameter with no default value in `resolveDefaultModelId` and `getQuickApp2FormData`, and remove the `DEFAULT_QUICK_APPS_MODEL` import. Keep the order: stored model → configured default if it is in `availableModelIds` → first of `toolSupportingModelIds` → `''`.
- [x] 1.2 Remove `DEFAULT_QUICK_APPS_MODEL` from `src/constants/quick-apps.ts`, and confirm that nothing in `src/` still references it.
- [x] 1.3 Add unit tests to `src/form/tests/quickApp2Form.test.ts` under `describe('resolveDefaultModelId')`, one per spec scenario:
  - the configured default is available,
  - no default is set, while a `gpt-4o` deployment and tool-supporting `model-1` exist → `model-1`,
  - the configured default is not among the loaded deployments → first tool-supporting model,
  - no usable model → `''`,
  - a stored model is kept.

  Also add one `getQuickApp2FormData` test: with no default argument, `model` is the first tool-supporting model.
- [x] 1.4 Add a test to `src/hooks/tests/use-quick-app2-form.test.tsx`: when the external state has no `defaultModelId`, the hook pre-selects the first tool-supporting model and the form stays not dirty.

**Verification**
- `npx vitest run src/form/tests/quickApp2Form.test.ts src/hooks/tests/use-quick-app2-form.test.tsx src/utils/tests/entity-id-encoding.test.ts src/form/tests/quickApp2Form-tool-sets.test.ts`
- `npm run lint` and `npm run typecheck`
- Full `npm test` once the slice is complete.

## 2. Documentation

- [x] 2.1 In `README.md`, section "Default model", state what happens when `DEFAULT_DEPLOYMENT` is not set or not available: the first tool-supporting model is pre-selected, and if there is none the model stays empty.

**Verification**
- `npm run format:check` passes for `README.md`.
