## Why

The `redesign-model-picker-catalog-list` change rebuilt the Temperature and Process files controls (2.0 `Slider`, caption `SectionRow`s, kit `Switch` with an info hint) and removed the Conversation starters "populated input can't be edited" warning, but neither area has a spec: `orchestrator_model-selection` says "Not covered yet: the temperature control and process-files handling", and Conversation starters is only a candidate in `docs/TECH_DEBT.md`. AGENTS.md makes writing the spec part of any change that touches an unspecified area, so this change pays that debt.

## Problem

- Temperature and Process files behaviour (visibility, range, persistence, read-only state, hints) is only defined by code (`src/components/Orchestrator/ModelConfigurationSection/ModelConfigurationSection.tsx:64`, `src/form/quickApp2Form.ts:276-287`).
- Conversation starters behaviour (trailing blank row, settings gated on a valid starter, save shape, defaults) is only defined by code (`src/components/ConversationStarters/ConversationStartersSection.tsx`, `src/components/QuickApp2Form.tsx:137-140`, `src/form/quickApp2Form.ts:218-226,258-300`).
- `application_editor-layout` defers to "the temperature control behavior currently provided by the editor", which nothing defines.
- The removed warning is undocumented, so nothing records that its absence is intentional.

## Solution

Spec-only change describing **current, implemented** behaviour — no product behaviour changes:

1. Extend `orchestrator_model-selection` with requirements for the Temperature control and the Process files control, and drop "Not covered yet" from its purpose when synced.
2. Add a new `application_conversation-starters` spec for the Conversation starters section, including that no warning is shown for "populate prompt" + "disable chat input".
3. Add focused tests for documented scenarios that have no test yet (starters section gating, save mapping for starters / temperature / attachment strategy).
4. Update `docs/TECH_DEBT.md` (coverage matrix row, candidates list).

## Alternatives considered

- Put Temperature/Process files in `application_editor-layout` — rejected: that spec is about column placement and already delegates the model block to `orchestrator_model-selection`; the controls are orchestrator settings stored under `orchestrator.*`.
- A separate `orchestrator_parameters` spec — rejected: near-duplicate of `orchestrator_model-selection` (config rule: place content under the closest existing spec-id); the capability matrix already lists Orchestrator as one capability.
- Defer Conversation starters — rejected: the warning removal is fresh and otherwise unrecorded.

## Non-goals

- Any UI or behaviour change (e.g. restoring the warning, the slider's read-only hint, migrating `DialFormItem`/`RadioButton` to 2.0, RTL of the catalog list).
- Specifying the rest of the Configuration column (Settings row) or other unspecified sections.

## Acceptance criteria

- `openspec validate specify-configuration-controls-and-starters --strict` passes.
- Every scenario is true of the current code; new tests pin the scenarios that had no test, and `npm test`, `npm run lint`, `npm run typecheck` pass.
- `docs/TECH_DEBT.md` lists `application_conversation-starters` in the coverage matrix and marks Orchestrator temperature/process-files as specified.

## What Changes

- `orchestrator_model-selection`: ADDED requirements for Temperature and Process files (no existing requirement changes).
- New capability `application_conversation-starters`.
- New tests only; no production code changes.
- `docs/TECH_DEBT.md` updates.

## Capabilities

### New Capabilities

- `application_conversation-starters`: the Conversation starters section — starters list, starters settings (intro text, behaviour, disable chat input), gating on a valid starter, save shape and defaults.

### Modified Capabilities

- `orchestrator_model-selection`: adds the Temperature and Process files control requirements.

## Impact

- **Code:** none in production. New/updated tests: `src/components/ConversationStarters/tests/ConversationStartersSection.test.tsx` (new), `src/form/tests/quickApp2Form.test.ts`.
- **API / chat-api:** none. Values persist through the existing application save in `application_properties` (`orchestrator.deployment.parameters.temperature`, `orchestrator.attachment_strategy`, `conversation_starters`).
- **Auth / host integration:** none.
- **i18n:** no new strings; specs reference existing `quickAppEditor` keys.
- **RTL:** none (documentation only; scenarios state the existing logical placement).
- **Rollback:** delete the change folder; nothing to revert in code.
