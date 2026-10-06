# Tasks

## 1. Add the Add-ons composition and localized contract

- [x] 1.1 Add the `quickAppEditor` translation keys for the Add-ons heading and Skills row, preserving the existing Agents & Toolsets key and updating every supported locale resource; verify the new labels are returned through the existing translation setup by running `npm test -- src/components/tests/I18nProvider.test.tsx`, then run `npm run lint` and `npm run typecheck`.
- [x] 1.2 Create `src/components/AddOns/AddOnsSection.tsx` with a semantic, direction-aware Add-ons container and Skills/merged Agents & Toolsets rows that reuse the existing field components, form control, tool selection values, callbacks, read-only state, and translated labels; add `src/components/AddOns/tests/AddOnsSection.test.tsx` covering translated headings, keyboard-reachable Add actions, empty and populated row composition, and the absence of stale `aria-expanded` controls; verify with `npm test -- src/components/AddOns/tests/AddOnsSection.test.tsx`, then run `npm run lint` and `npm run typecheck`.

## 2. Integrate Add-ons into the editor without changing persistence

- [x] 2.1 Update `src/components/QuickApp2Form.tsx` to render Add-ons directly after Instructions, pass the existing React Hook Form state and callbacks, and keep all downstream settings sections in their existing order; update `src/components/ContextAndTools/ContextAndToolsSection.tsx` only to remove the moved Agents & Toolsets presentation while preserving its remaining controls; extend `src/components/tests/QuickApp2Form.test.tsx` with observable order, empty-state, and read-only assertions; verify with `npm test -- src/components/tests/QuickApp2Form.test.tsx`, then run `npm run lint` and `npm run typecheck`.
- [x] 2.2 Adapt `src/components/AgentSkills/AgentSkillsFormSection.tsx` into the Skills row used by Add-ons, preserving the `agentSkills` Controller and existing selector props without introducing a second state owner; update or add its co-located component test if the row remains a separately tested component; verify with `npm test -- src/components/AddOns/tests/AddOnsSection.test.tsx`, then run `npm run lint` and `npm run typecheck`.

## 3. Hide empty content windows while preserving populated selector behavior

- [x] 3.1 Update `src/components/common/SkillsSelector/SkillsSelector.tsx` so the Add button remains mounted for an empty selection while the existing no-data content window is omitted, leaving the populated chip-panel markup/classes and modal behavior unchanged; add `src/components/common/SkillsSelector/tests/SkillsSelector.test.tsx` for empty, selected, last-item-removed, and read-only behavior; verify with `npm test -- src/components/common/SkillsSelector/tests/SkillsSelector.test.tsx`, then run `npm run lint` and `npm run typecheck`.
- [x] 3.2 Update `src/components/common/AgentAndToolsetSelector/AgentAndToolsetSelector.tsx` so the Add button remains mounted for an empty selection while the existing no-data content window is omitted, leaving chip, JSON-view, configuration, login, and modal behavior unchanged; add `src/components/common/AgentAndToolsetSelector/tests/AgentAndToolsetSelector.test.tsx` for empty, selected, last-item-removed, JSON/read-only, and Add-action behavior; verify with `npm test -- src/components/common/AgentAndToolsetSelector/tests/AgentAndToolsetSelector.test.tsx`, then run `npm run lint` and `npm run typecheck`.

## 4. Preserve RTL and accessibility behavior

- [x] 4.1 Audit the new Add-ons and row classes against `.claude/rules/rtl.md`, replacing any new physical directional spacing or positioning with logical utilities and keeping the symmetric plus icon unmirrored; extend `src/components/AddOns/tests/AddOnsSection.test.tsx` with translated accessible labels and direction-safe Add-action assertions, and verify existing dynamic direction coverage with `npm test -- src/components/AddOns/tests/AddOnsSection.test.tsx src/components/tests/I18nProvider.test.tsx`, then run `npm run lint` and `npm run typecheck`.

## 5. Complete the vertical slice

- [x] 5.1 Run the full regression suite and production checks after the editor composition and selector changes: `npm test`, `npm run lint`, `npm run typecheck`, and `npm run build`; verify that the existing form serialization tests and the new Add-ons/selector tests all pass and that no new chat-api request or persistence field was introduced.

## 6. Refine Add-ons spacing and typography

- [x] 6.1 Update `src/components/AddOns/AddOnsSection.tsx` and `src/components/AgentSkills/AgentSkillsFormSection.tsx` to match the target visual hierarchy: add the gap between Instructions and Add-ons, use the section heading and row-title/body typography utilities shown in the design, increase consistent vertical spacing between rows, and keep Add actions aligned with their row titles without changing populated content-panel styles; verify the rendered class contract with `src/components/AddOns/tests/AddOnsSection.test.tsx`, then run `npm run lint` and `npm run typecheck`.
- [x] 6.2 Extend `src/components/AddOns/tests/AddOnsSection.test.tsx` with assertions for card separation, row typography classes, and consistent row spacing; verify with `npm test -- src/components/AddOns/tests/AddOnsSection.test.tsx --coverage.enabled=false`, then run `npm run lint` and `npm run typecheck`.

## 7. Correct Instructions title typography

- [x] 7.1 Update `src/components/InstructionsSection/InstructionsSection.tsx` so the Instructions title uses the same section-level typography and primary text color as the target design; extend `src/components/InstructionsSection/tests/InstructionsSection.test.tsx` with the title class assertion, then run the focused Vitest test and `npm run typecheck`.
