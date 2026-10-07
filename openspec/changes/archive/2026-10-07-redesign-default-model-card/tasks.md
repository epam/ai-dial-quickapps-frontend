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

## 1. Shared SectionRow header

- [x] 1.1 Create `src/components/common/SectionRow/SectionRow.tsx`:
  - Use `SectionRowProps { title; action?; description?; className?; children? }`, exported as a named arrow component.
  - Render `<section aria-labelledby={useId()}>` with an `h3` title whose typography comes from `variant: SectionRowVariant` (`Caption`: `dial-caption-lead-semi-text text-secondary`; `Row`: `dial-small-semi-text text-primary`).
  - Put the action in an end-aligned `shrink-0` wrapper, rendered only when it is provided.
  - Render the description as `p.dial-small-text text-secondary`, only when it is provided.
  - Render children below.
  - No `aria-expanded`.
  - Use logical/flex layout only (design D2).
  - **Verification:** `npx vitest run src/components/common/SectionRow`, `npm run lint`, `npm run typecheck`.
- [x] 1.2 Add `src/components/common/SectionRow/tests/SectionRow.test.tsx`. It must cover:
  - The section is labelled by its heading text.
  - The action is rendered and is a reachable button.
  - The description is rendered when given.
  - No action wrapper and no description element are rendered when they are omitted.
  - **Verification:** `npx vitest run src/components/common/SectionRow/tests/SectionRow.test.tsx`.
- [x] 1.3 Make `src/components/AddOns/AddOnRow.tsx` a wrapper over `SectionRow` (`Row` variant, Add button as `action`, description only while empty), so the editor has one row-header component instead of two. Update the read-only Add test in `src/components/AddOns/tests/AddOnsSection.test.tsx`: with a tooltip the kit 0.15 `Button` is `aria-disabled` instead of natively `disabled`, so assert that the button is disabled either way and that clicking it opens nothing.
  - **Verification:** `npx vitest run src/components/AddOns src/components/common/SectionRow`, `npm run lint`, `npm run typecheck`.

## 2. Default model block (depends on 0, 1, 3.1)

- [x] 2.1 ~~Add `getModelEntityType` / `getModelTypeI18nKey` to `src/utils/application.ts`~~ — superseded by 2.8: the picker offers only models, so the card always uses `EntityType.Model` and the `Model` label; the helpers, their tests and the `Agent` i18n key are removed.
- [x] 2.2 In `src/components/Orchestrator/ModelField.tsx`, wrap the collapsed card in `SectionRow` with `title={t(QuickAppEditorI18nKeys.DefaultModel)}`. The `action` is the ui-kit 2.0 `Button`, configured as follows:
  - `appearance={ButtonAppearance.Outlined}`, `variant={ButtonVariant.Primary}`, `size={ElementSize.Small}`.
  - `iconBefore={<IconPencil size={16} />}`, `label={t(Change)}`, `onClick={handleOpen}`, `disabled={disabled || isModelInfoLoading}`.
  - `tooltipProps` set from `tooltip` when it is present.

  Remove the in-card `DialLinkButton`. Confirm the `Button`/`ButtonAppearance`/`ButtonVariant`/`ElementSize` props via the ui-kit MCP `getEntityDetails` before coding, then compare the visual result with the mockup and adjust the variant if needed (design D3).
  - **Verification:** `npm run lint`, `npm run typecheck`.

- [x] 2.3 Restyle the collapsed card in `src/components/Orchestrator/ModelField.tsx` per design D4:
  - Container: raised `rounded-[16px]` with a border that turns error-coloured when there is an error, and `opacity-50` when disabled.
  - Inside it, the ui-kit `EntityIdentity`, configured as follows:
    - `item.type` = `EntityType.Model`;
    - `labels.type` = `t(QuickAppEditorI18nKeys.Model)`;
    - `iconUrl` passed through `resolveIconUrl`;
    - `hasFeaturedTag={false}`, `iconSize={44}`, `headingLevel={4}`, `nameClassName="dial-body-semi-text"`.
  - Skeletons while loading (circle 44 plus text lines).
  - The raw id in secondary text for an unknown model, with no label or version.
  - The error message stays below the card.
  - **Verification:** `npm run lint`, `npm run typecheck`.
- [x] 2.4 Remove the dead inline-version code from the collapsed card in `src/components/Orchestrator/ModelField.tsx`:
  - Remove `cardVersionOptions`, `hasVersions`, the inline `DialSelect`, and the `VersionPrefix` usage in the card.
  - Remove `selectedGroup` if it is now unused.
  - Keep `VERSION_SELECT_CLASS`/`VersionPrefix` for the popup `ModelCard`.
  - Drop the `classNames` import if it is no longer used.
  - **Verification:** `npm run lint`, `npm run typecheck`.
- [x] 2.5 In `src/components/Orchestrator/ModelConfigurationSection/ModelConfigurationSection.tsx`, remove the `DialFormItem label={t(Model)}` wrapper around the `model` `Controller` and render `ModelField` directly. Temperature and Process files stay unchanged.
  - **Verification:** `npx vitest run src/components/Orchestrator/ModelConfigurationSection`, `npm run lint`, `npm run typecheck`.
- [x] 2.6 Update `src/components/Orchestrator/ModelConfigurationSection/tests/ModelConfigurationSection.test.tsx` so it no longer expects a "Model" form-item label. Keep the temperature, process-files and read-only assertions.
  - **Verification:** `npx vitest run src/components/Orchestrator/ModelConfigurationSection/tests/ModelConfigurationSection.test.tsx`.
- [x] 2.7 Add `src/components/Orchestrator/tests/ModelField.test.tsx`, mocking `useDataContext`, `useAppContext`, `useTranslation` and the ui-kit `DialPopup`. It must cover:
  - The "Default model" heading labels the section, and the "Change" button is in it.
  - The card shows the "Model" label, the name as a level-4 heading and the version text, with no combobox and no "Featured" chip.

  Keep the real `EntityIdentity` (do not mock it) so the assertions cover what the user sees.
  - With several versions, only the selected version text shows and no combobox is rendered.
  - Clicking "Change" opens the picker.
  - "Change" is disabled when `disabled` is set and while models are loading.
  - The error message is rendered when `error` is set.
  - An unknown id renders as the name, with no label.
  - **Verification:** `npx vitest run src/components/Orchestrator/tests/ModelField.test.tsx`, then the full `npm test` once this slice is complete.

- [x] 2.8 Restrict the picker in `src/components/Orchestrator/ModelField.tsx` to `type: 'model'` deployments with `features.tools`; drop the now-redundant "exclude the app being edited" check and the `useAppContext` read. Extend `src/components/Orchestrator/tests/ModelField.test.tsx`: the picker lists only tool-supporting models, and a saved application still shows on the card.
  - **Verification:** `npx vitest run src/components/Orchestrator/tests/ModelField.test.tsx`, `npm run lint`, `npm run typecheck`.

## 3. i18n, RTL and specs

- [x] 3.1 Add `DefaultModel = 'Default model'` to `QuickAppEditorI18nKeys` in `src/constants/i18n.ts`, and the matching entries to `src/i18n/locales/quick-app-editor.json`, the only registered locale (`en`).
  - **Verification:** `npm run lint`, `npm run typecheck`.
- [x] 3.2 RTL pass over `SectionRow.tsx` and the `ModelField.tsx` card:
  - No physical `ml/mr/pl/pr/left/right/text-left/text-right` classes.
  - The pencil icon is not mirrored.
  - Add an RTL test case to `SectionRow.test.tsx`: with `document.documentElement.dir = 'rtl'`, the DOM order is heading first, then action, and no physical direction classes are present.
  - **Verification:** `npx vitest run src/components/common/SectionRow`, `npm run lint`.
- [x] 3.3 Remove the "Orchestrator / model selection" entry from `docs/TECH_DEBT.md`'s "OpenSpec spec creation candidates", or mark it as started. Add the follow-ups from design.md:
  - extract the `ModelField` popup.
  - **Verification:** `npm run format:check`.
