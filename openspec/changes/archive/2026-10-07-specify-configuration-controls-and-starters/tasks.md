Slicing strategy: **vertical per capability** — each slice pins one spec's untested scenarios with tests, then the docs slice records the coverage. No production code changes; if a test reveals that the code contradicts a scenario, stop and raise it instead of changing either.

Conventions: tests co-locate in `tests/` folders, use role/label/text queries, and are named after observable behaviour (AGENTS.md, `.claude/rules/all-ts.md`).

## 1. Orchestrator: Temperature and Process files

- [x] 1.1 In `src/form/tests/quickApp2Form.test.ts`, add save-mapping tests for the `orchestrator_model-selection` scenarios: `orchestrator.deployment.parameters` is `{ temperature }` only when the model has `features.temperature: true` and omitted otherwise; `orchestrator.attachment_strategy` is `{ type: 'lazy_on_demand' }` / `null` for a model with `inputAttachmentTypes`, and keeps the loaded value for a model without them; loading sets `processLargeFiles` from the presence of `attachment_strategy` and `temperature` defaults to `1`.
  - Verification: `npx vitest run src/form/tests/quickApp2Form.test.ts`, `npm run lint`, `npm run typecheck`.
- [x] 1.2 In `src/components/Orchestrator/ModelConfigurationSection/tests/ModelConfigurationSection.test.tsx`, add the missing UI scenarios: the Process files block is omitted when the feature is unavailable; the Temperature block is shown when the selected model is not loaded; the slider is disabled with no hint in read-only.
  - Verification: `npx vitest run src/components/Orchestrator/ModelConfigurationSection`, `npm run lint`, `npm run typecheck`.

## 2. Conversation starters

- [x] 2.1 Create `src/components/ConversationStarters/tests/ConversationStartersSection.test.tsx` covering: collapsed by default; section content order; settings disabled with the starter hint until a starter has both title and prompt; enabled with no hint after; shared-application hint replaces the starter hint; the Disable chat input hint is in the switch label's info button; no warning for "populate prompt" + "disable chat input". The gating itself is computed outside the section, so also pin it where it lives: `hasStarters` in `src/components/QuickApp2FormLegacyFields/tests/QuickApp2FormLegacyFields.test.tsx` and the starter / shared-application hint in `src/components/tests/QuickApp2Form.behavior.test.tsx`.
  - Verification: `npx vitest run src/components/ConversationStarters src/components/QuickApp2FormLegacyFields src/components/tests/QuickApp2Form.behavior.test.tsx`, `npm run lint`, `npm run typecheck`.
- [x] 2.2 In `src/form/tests/quickApp2Form.test.ts`, add `conversation_starters` save/load tests: defaults (`auto_submit: true`, `chat_message_input_disabled: false`, empty intro); the full example payload from the spec; partially filled starters are saved; empty intro text is omitted; all-blank starters save `null`.
  - Verification: `npx vitest run src/form/tests/quickApp2Form.test.ts`, then the full `npm test` once slices 1–2 are done.

## 3. Docs

- [x] 3.1 Update `docs/TECH_DEBT.md`: in "Orchestrator / model selection" state that temperature and process files are now specified; add an `application_conversation-starters` row to the coverage matrix (Spec exists: Yes, Source area mapped: Yes, Tests exist: Partial, Behavior verified: Planned) and mark the "Conversation starters" candidate as written; record the observed quirk that a partially filled starter is saved but does not enable the settings, as a follow-up for a product decision.
  - Verification: `npx prettier --check docs/TECH_DEBT.md` — fails on the committed file already (prettier re-indents every `- []` item), so the new lines only follow the file's existing style and the file is not reformatted here.
- [x] 3.2 Validate the change: `openspec validate specify-configuration-controls-and-starters --strict`.
