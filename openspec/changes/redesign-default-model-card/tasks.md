**Slicing strategy:** vertical, in three slices.

1. The shared header component, which ships standalone with tests.
2. The Default model block, end to end through `ModelField` and `ModelConfigurationSection`.
3. i18n, RTL and spec sync.

Slice 2 depends on slice 1. Task 3.1 (i18n keys) must land before or together with slice 2, because slice 2 references the new enum keys.

Conventions for every task:

- Extensionless relative code imports, with bundler resolution kept.
- Class names composed with `mergeClasses`.
- Arrow-function components.
- No nested ternaries.
- `{ComponentName}Props` interfaces.

Tests use the repo's existing `react-dom/client` `createRoot` + `act` harness (see `src/components/Orchestrator/ModelConfigurationSection/tests/ModelConfigurationSection.test.tsx`). They query by role, accessible name and text.

## 0. ui-kit dependency (blocks group 2)

- [x] 0.1 Merge and release ui-kit `feat/entity-identity`, which adds `EntityIdentity`, `EntityIdentityProps`/`Item`/`Labels` and `EntityType`. Then bump `@epam/ai-dial-ui-kit` in `package.json` to that release and run `npm install`. Use the ui-kit MCP `getEntityDetails("component", "EntityIdentity")` to confirm the props.
  - **Verification:** `npm run typecheck`.

## 1. Shared ConfigurationSection header

- [ ] 1.1 Create `src/components/common/ConfigurationSection/ConfigurationSection.tsx`:
  - Use `ConfigurationSectionProps { title; action?; description?; className?; children? }`, exported as a named arrow component.
  - Render `<section aria-labelledby={useId()}>` with an `h4` caption using `dial-caption-text font-semibold uppercase tracking-[0.06em] text-secondary`.
  - Put the action in an end-aligned `shrink-0` wrapper, rendered only when it is provided.
  - Render the description as `p.dial-small-text text-secondary`, only when it is provided.
  - Render children below.
  - No `aria-expanded`.
  - Use logical/flex layout only (design D2).
  - **Verification:** `npx vitest run src/components/common/ConfigurationSection`, `npm run lint`, `npm run typecheck`.
- [ ] 1.2 Add `src/components/common/ConfigurationSection/tests/ConfigurationSection.test.tsx`. It must cover:
  - The section is labelled by its heading text.
  - The action is rendered and is a reachable button.
  - The description is rendered when given.
  - No action wrapper and no description element are rendered when they are omitted.
  - **Verification:** `npx vitest run src/components/common/ConfigurationSection/tests/ConfigurationSection.test.tsx`.

## 2. Default model block (depends on 0, 1, 3.1)

- [ ] 2.1 Add `getModelEntityType` and `getModelTypeI18nKey` to `src/utils/application.ts` (design D5). Both are `switch`es:
  - `getModelEntityType`: `'application'` maps to `EntityType.Agent`, anything else to `EntityType.Model`.
  - `getModelTypeI18nKey`: `'application'` maps to `QuickAppEditorI18nKeys.Agent`, anything else to `QuickAppEditorI18nKeys.Model`. Add unit tests in `src/utils/tests/application.test.ts`, creating the file if it is absent.
  - **Verification:** `npx vitest run src/utils/tests/application.test.ts`, `npm run lint`, `npm run typecheck`.
- [ ] 2.2 In `src/components/Orchestrator/ModelField.tsx`, wrap the collapsed card in `ConfigurationSection` with `title={t(QuickAppEditorI18nKeys.DefaultModel)}`. The `action` is the ui-kit 2.0 `Button`, configured as follows:
  - `appearance={ButtonAppearance.Outlined}`, `variant={ButtonVariant.Primary}`, `size={ElementSize.Small}`.
  - `iconBefore={<IconPencil size={16} />}`, `label={t(Change)}`, `onClick={handleOpen}`, `disabled={disabled || isModelInfoLoading}`.
  - `tooltipProps` set from `tooltip` when it is present.

  Remove the in-card `DialLinkButton`. Confirm the `Button`/`ButtonAppearance`/`ButtonVariant`/`ElementSize` props via the ui-kit MCP `getEntityDetails` before coding, then compare the visual result with the mockup and adjust the variant if needed (design D3).
  - **Verification:** `npm run lint`, `npm run typecheck`.

- [ ] 2.3 Restyle the collapsed card in `src/components/Orchestrator/ModelField.tsx` per design D4:
  - Container: raised `rounded-[16px]` with a border that turns error-coloured when there is an error, and `opacity-50` when disabled.
  - Inside it, the ui-kit `EntityIdentity`, configured as follows:
    - `item.type` from `getModelEntityType`;
    - `labels.type` = `t(getModelTypeI18nKey(...))`;
    - `iconUrl` passed through `resolveIconUrl`;
    - `hasFeaturedTag={false}`, `iconSize={44}`, `headingLevel={5}`, `nameClassName="dial-body-semi-text"`.
  - Skeletons while loading (circle 44 plus text lines).
  - The raw id in secondary text for an unknown model, with no label or version.
  - The error message stays below the card.
  - **Verification:** `npm run lint`, `npm run typecheck`.
- [ ] 2.4 Remove the dead inline-version code from the collapsed card in `src/components/Orchestrator/ModelField.tsx`:
  - Remove `cardVersionOptions`, `hasVersions`, the inline `DialSelect`, and the `VersionPrefix` usage in the card.
  - Remove `selectedGroup` if it is now unused.
  - Keep `VERSION_SELECT_CLASS`/`VersionPrefix` for the popup `ModelCard`.
  - Drop the `classNames` import if it is no longer used.
  - **Verification:** `npm run lint`, `npm run typecheck`.
- [ ] 2.5 In `src/components/Orchestrator/ModelConfigurationSection/ModelConfigurationSection.tsx`, remove the `DialFormItem label={t(Model)}` wrapper around the `model` `Controller` and render `ModelField` directly. Temperature and Process files stay unchanged.
  - **Verification:** `npx vitest run src/components/Orchestrator/ModelConfigurationSection`, `npm run lint`, `npm run typecheck`.
- [ ] 2.6 Update `src/components/Orchestrator/ModelConfigurationSection/tests/ModelConfigurationSection.test.tsx` so it no longer expects a "Model" form-item label. Keep the temperature, process-files and read-only assertions.
  - **Verification:** `npx vitest run src/components/Orchestrator/ModelConfigurationSection/tests/ModelConfigurationSection.test.tsx`.
- [ ] 2.7 Add `src/components/Orchestrator/tests/ModelField.test.tsx`, mocking `useDataContext`, `useAppContext`, `useTranslation` and the ui-kit `DialPopup`. It must cover:
  - The "Default model" heading labels the section, and the "Change" button is in it.
  - The card shows the "Model" label, the name as a level-5 heading and the version text, with no combobox and no "Featured" chip.
  - The type label is "Agent" for `type: 'application'`.

  Keep the real `EntityIdentity` (do not mock it) so the assertions cover what the user sees.
  - With several versions, only the selected version text shows and no combobox is rendered.
  - Clicking "Change" opens the picker.
  - "Change" is disabled when `disabled` is set and while models are loading.
  - The error message is rendered when `error` is set.
  - An unknown id renders as the name, with no label.
  - **Verification:** `npx vitest run src/components/Orchestrator/tests/ModelField.test.tsx`, then the full `npm test` once this slice is complete.

## 3. i18n, RTL and specs

- [ ] 3.1 Add `DefaultModel = 'Default model'` and `Agent = 'Agent'` to `QuickAppEditorI18nKeys` in `src/constants/i18n.ts`, and the matching entries to `src/i18n/locales/quick-app-editor.json`, the only registered locale (`en`).
  - **Verification:** `npm run lint`, `npm run typecheck`.
- [ ] 3.2 RTL pass over `ConfigurationSection.tsx` and the `ModelField.tsx` card:
  - No physical `ml/mr/pl/pr/left/right/text-left/text-right` classes.
  - The pencil icon is not mirrored.
  - Add an RTL test case to `ConfigurationSection.test.tsx`: with `document.documentElement.dir = 'rtl'`, the DOM order is heading first, then action, and no physical direction classes are present.
  - **Verification:** `npx vitest run src/components/common/ConfigurationSection`, `npm run lint`.
- [ ] 3.3 Remove the "Orchestrator / model selection" entry from `docs/TECH_DEBT.md`'s "OpenSpec spec creation candidates", or mark it as started. Add the follow-ups from design.md:
  - migrate the Add-ons rows to `ConfigurationSection`;
  - extract the `ModelField` popup.
  - **Verification:** `npm run format:check`.
