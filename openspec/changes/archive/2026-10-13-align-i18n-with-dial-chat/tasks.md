<!--
Slicing strategy: contract-first, then vertical.
Slice 1 lands the new resources, types, config and global mock behind the existing
enums, so the app works unchanged. Each later slice moves one feature area completely
(source and tests) and is green on its own. The old code is deleted only after the last
consumer is gone.

Deviation found while applying: slice 1 cannot be green on its own. Once the old enums point
at key paths, the tests that assert English text break, whichever way the per-file mock
answers. Source migration (2.1, 3.1, 4.1) and the removal of the old scheme were therefore
done in one pass. The test updates (1.10, 2.2, 3.2, 4.2) land together, and the suite turns
green only after they do.
-->

## 1. Infrastructure: chat's stack, resources and key map

- [x] 1.1 Add `i18next-browser-languagedetector` at chat's range (`^8.2.1`) to `package.json` dependencies and run `npm install`
  - Verification: `npm run typecheck`
- [x] 1.2 Write `openspec/changes/align-i18n-with-dial-chat/key-map.md` with one row per key from `src/i18n/locales/common.json` and `src/i18n/locales/quick-app-editor.json`: old namespace + key, old enum member, new group path, new `<Group>I18nKeys` member, English value. Reuse chat's path from `C:\projects\ai-dial-chat\apps\chat\src\i18n\locales\en.json` when the English value already exists there (design D4)
  - Verification: every old key appears exactly once in the table
- [x] 1.3 Create `src/i18n/locales/en.json` from the key map, nested by group, keeping the existing `dialFileManager` subtree unchanged, and add a throwaway check (in the scratchpad, not the repo) that the multiset of English values in the old two files equals that of `en.json` minus de-duplicated generics listed in the key map
  - Verification: the check passes; `npm run lint`
- [x] 1.4 Create `src/constants/translation-keys.ts` with one string enum per group (`BasicI18nKeys`, `ButtonsI18nKeys`, `AuthI18nKeys`, `CatalogI18nKeys`, `AttachmentCanvasI18nKeys`, `ApplicationCredentialsI18nKeys`, `ToolsetSignInI18nKeys`, `ApplicationEditorI18nKeys`, `DialFileManagerI18nKeys`, …), with values equal to the full key paths, named as chat names its enums
  - Verification: `npm run typecheck`
- [x] 1.5 Create `src/i18n/i18next.d.ts` as a copy of chat's (`defaultNS: 'translation'`, `resources: { translation: typeof en }`)
  - Verification: `npm run typecheck` (fixing type errors this surfaces is part of the task)
- [x] 1.6 Create `src/i18n/config.ts` as a copy of chat's `apps/chat/src/i18n/config.ts`, with the import paths adapted to this repo
  - Verification: `npm run typecheck`
- [x] 1.7 Bridge the old enums: re-point the values in `src/constants/i18n.ts` (`CommonI18nKeys`, `QuickAppEditorI18nKeys`, `DialFileManagerI18nKeys`) to the new key paths, and make `src/hooks/use-translation.ts` ignore its namespace argument and read the default `translation` namespace. Do not change components yet
  - Verification: `npx vitest run src/hooks/tests/use-translation.test.tsx`; `npm run typecheck`
- [x] 1.8 Switch `src/main.tsx` to `import '@/i18n/config'` and remove the `<I18nProvider>` wrapper; delete `src/i18n/index.ts`, `src/components/I18nProvider/I18nProvider.tsx` and its `tests/I18nProvider.test.tsx`; delete `src/i18n/locales/common.json` and `src/i18n/locales/quick-app-editor.json`
  - Verification: `npx vitest run src/tests/App.test.tsx`; `npm run typecheck`; `npm run build`
- [x] 1.9 Add `src/i18n/tests/config.test.ts`, a port of chat's `apps/chat/src/i18n/tests/config.spec.ts` that uses the real i18next and mocks only `initReactI18next`. It covers: start-up gives `lang="en"` / `dir="ltr"`; stored `uk` and stored `ar` without resources both give `lang="en"` / `dir="ltr"`; with `ar` resources registered, `changeLanguage('ar')` gives `dir="rtl"`, `ar-EG` gives `rtl`, and switching back to `en` gives `ltr`; a `fr` browser gives `resolvedLanguage` `en`
  - Verification: `npx vitest run src/i18n/tests/config.test.ts`
- [x] 1.10 Add chat's global `react-i18next` mock to `src/test-utils/setup.ts`, plus `i18n.resolvedLanguage: 'en'` and a pass-through `initReactI18next` (design D5). For now keep `src/test-utils/mock-translation.ts` and the per-file mocks of the wrapper; they still work because they mock the wrapper, not `react-i18next`
  - Verification: `npm test`; `npm run lint`; `npm run typecheck`

## 2. Migrate shell, auth and common components

- [x] 2.1 Move to `useTranslation()` from `react-i18next` and the new enums in `src/App.tsx`, `src/pages/`, `src/components/EditorClient/`, the auth screens (login / forbidden / auth-error) and `src/components/common/`. Read the language from `i18n.resolvedLanguage` (design D3)
  - Verification: `npm run typecheck`; `npm run lint`
- [x] 2.2 In those areas' tests, drop `vi.mock('@/hooks/use-translation', …)` and assert on enum values (keys), not English text
  - Verification: `npx vitest run src/tests src/pages src/components/EditorClient src/components/common` plus the auth component test folders; then `npm test`

## 3. Migrate add-ons: agents, toolsets, skills, catalog, details

- [x] 3.1 Move `src/components/Agents/`, `src/components/Toolsets/`, the skills components, the catalog picker and the catalog-entity-details components to `react-i18next` and the new enums, with `i18n.resolvedLanguage` passed to `getLocalizedText`, `getAddOnDisplay` and the `map*ToCatalogItem` helpers
  - Verification: `npm run typecheck`; `npm run lint`
- [x] 3.2 Update their tests to the global mock and key assertions
  - Verification: `npx vitest run src/components/Agents src/components/Toolsets` plus the skills and catalog component folders; then `npm test`

## 4. Migrate editor form: orchestrator, starters, settings, knowledge base, attachments, file manager

- [x] 4.1 Move `src/components/Orchestrator/`, `src/components/QuickApp2Form/`, the conversation starters, advanced settings, knowledge base, user attachments, content-file preview and DIAL file manager label wiring to `react-i18next` and the new enums. Also cover any hook under `src/hooks/` and any `src/form/` schema that builds messages through `t`
  - Verification: `npm run typecheck`; `npm run lint`
- [x] 4.2 Update their tests to the global mock and key assertions
  - Verification: `npx vitest run src/components/Orchestrator src/components/QuickApp2Form src/hooks src/form`; then `npm test`

## 5. Remove the old scheme

- [x] 5.1 Confirm that `grep` finds nothing for `@/hooks/use-translation`, `Translation.`, `CommonI18nKeys`, `QuickAppEditorI18nKeys` or `mock-translation` under `src/`, and that no `t('` / `i18nKey="` takes a string literal; then delete `src/hooks/use-translation.ts`, `src/hooks/tests/use-translation.test.tsx`, `src/types/translation.ts`, `src/constants/i18n.ts` and `src/test-utils/mock-translation.ts`
  - Verification: `npm test`; `npm run lint`; `npm run typecheck`; `npm run build`

## 6. Specs, rules and docs

- [x] 6.1 Rewrite the key references in `openspec/specs/{agents_selection,application_advanced-settings,application_conversation-starters,application_credentials,application_editing,application_editor-layout,application_knowledge-base,application_user-attachments,auth,catalog-entity-details,orchestrator_model-selection,skills_catalog,toolsets_login,toolsets_selection}/spec.md` from `` `quickAppEditor` `X` `` / `` `common` `X` `` / `quickAppEditor.X` to `` `<Group>I18nKeys.X` `` using `key-map.md`, keeping the English text in parentheses (design D6). Do not change any behaviour wording
  - Verification: `openspec validate --specs`; `grep -rn "quickAppEditor\|\`common\`" openspec/specs` returns nothing
- [x] 6.2 Update `.claude/rules/all-ts.md` with chat's translation-key rule, and update the "Direction attribute" and "Adding a new locale" sections of `.claude/rules/rtl.md` and the i18n/RTL paragraphs of `AGENTS.md` to the `config.ts` / `en.json` / `RTL_LANGUAGES` scheme (design D7)
  - Verification: `npm run format:check`
- [x] 6.3 Update `openspec/config.yaml` (tech-stack i18n line; drop "pick the correct namespace"; change "namespace + key" to "enum member + key path") and `docs/TECH_DEBT.md` (the i18n row and section; add follow-ups: host-driven UI language via `host-integration`, and a shared i18n config with chat if one is extracted)
  - Verification: `openspec validate align-i18n-with-dial-chat`
- [x] 6.4 Final gate for the whole change
  - Verification: `npm test`; `npm run lint`; `npm run typecheck`; `npm run build`
