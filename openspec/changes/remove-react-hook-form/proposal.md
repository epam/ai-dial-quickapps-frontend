# Proposal

## Why

The Quick App editor depends on `react-hook-form` and `@hookform/resolvers`, although its domain schema, default-value builders, and application serialization are already separated in `src/form/quickApp2Form.ts`. Removing the dependency would reduce UI-framework coupling, but only if the replacement preserves the editor's current validation, dirty-state, autosave, reset, controlled-input, and host-event behavior.

This is an internal implementation change with no intended observable behavior change. The current codebase already tracks RHF removal as technical debt (`docs/TECH_DEBT.md:15`) and identifies the form wiring as disposable UI code (`docs/TRANSITION_PLAN.md:81-103,366-399`).

## What Changes

- Replace the RHF form-state and controller layer in `QuickApp2Form` with a project-owned reducer-backed form controller using the existing Zod schema.
- Replace RHF `Control`, `Controller`, `FieldErrors`, and watch/setter contracts in the seven editor sections with narrow typed value/change/error/blur adapters.
- Preserve `QuickApp2Schema`, default-value construction, toolset conversion, and application configuration serialization as RHF-independent domain logic.
- Preserve all current observable behavior: on-change and submit validation, invalid-submit suppression, dirty notifications, autosave gating, host-triggered save, reset/remount behavior, asynchronous model resolution, feature-flag cleanup, JSON/simple toolset views, MIME validation rollback, and starter-row identity.
- Add characterization and regression tests before and during migration for the behavior-sensitive cases listed in the design and project planning document.
- Remove `react-hook-form` and `@hookform/resolvers` from `package.json` and regenerate `package-lock.json` after parity is verified. Keep `zod` unless validation is intentionally redesigned.
- Delete the unused RHF-only `src/components/common/Forms/ControlledFormField.tsx` helper if no call sites are introduced.
- Update the project-facing removal plan and relevant technical-debt documentation when implementation is complete.

## Capabilities

### New Capabilities

None. This is a pure internal dependency replacement and does not introduce a new externally observable capability.

### Modified Capabilities

None. Existing observable behavior is intended to remain unchanged. The change opts out of delta specs with `skip_specs: true` in `.openspec.yaml`; acceptance is provided by characterization, unit, build, and host-integration regression checks instead.

## Impact

- **Primary UI code:** `src/components/QuickApp2Form.tsx` and the seven sections that currently receive RHF control objects: Advanced Settings, Agent Skills, Context and Tools, Conversation Starters, Instructions, User Attachments, and Model Configuration.
- **Tests:** RHF fixture setup in `InstructionsSection.test.tsx` and `ModelConfigurationSection.test.tsx`, plus `src/components/tests/QuickApp2Form.test.tsx`; new focused tests for validation, dirty state, autosave, reset, async model loading, arrays, and controlled inputs.
- **Domain code:** `src/form/quickApp2Form.ts` should remain the source of truth for the schema and serialization; no API, auth, host protocol, or persistence contract should change.
- **Dependencies:** remove `react-hook-form` and `@hookform/resolvers`; retain `zod`.
- **i18n:** no new user-visible strings are expected. Existing validation messages and translation keys must remain unchanged.
- **RTL/direction:** no layout or direction behavior is intended to change; existing logical-direction and icon rules remain applicable if component markup is touched.
- **Cross-cutting scope:** auth, API, and host-integration protocol changes are out of scope. Host save/reset behavior is covered only as a regression contract because `EditorClient` consumes the form's dirty and save signals.

### Alternatives considered

1. **Keep RHF and only isolate it behind a semantic hook (conservative baseline):** lowest migration risk, but does not remove the dependency. This is a useful intermediate step and rollback boundary.
2. **Use plain `useState` in each section:** rejected because correlated nested arrays, dirty baselines, validation, and external updates would become scattered and difficult to keep consistent.
3. **Use a reducer-backed custom form controller around Zod:** selected for the removal target because it keeps validation in the existing schema, centralizes form semantics, and can be tested independently of components.

## Acceptance criteria

- The application has no runtime or test imports from `react-hook-form` or `@hookform/resolvers`.
- `npm run lint`, `npm run typecheck`, `npm run build`, and `npm test` pass.
- Regression tests demonstrate parity for validation/error paths, dirty notifications, ordinary submit, host-triggered save, autosave gating, reset, async model resolution, feature flags, JSON/simple toolset switching, MIME rollback, and starter/array behavior.
- Existing application serialization and host/API contracts are unchanged.
- A rollback remains possible by restoring the RHF adapter before deleting the old implementation, or by reverting the dependency-removal change as a whole.
