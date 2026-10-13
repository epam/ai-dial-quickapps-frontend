## Context

The reference for this change is ai-dial-chat:

- `apps/chat/src/i18n/config.ts`
- `apps/chat/src/i18n/i18next.d.ts`
- `apps/chat/src/i18n/locales/en.json`, about 60 groups
- `apps/chat/src/constants/translation-keys.ts`, 56 `*I18nKeys` enums
- `apps/chat/src/test-setup.ts`, the global `react-i18next` mock
- `apps/chat/src/i18n/tests/config.spec.ts`

Chat pins `i18next ^26.2.0`, `react-i18next ^17.0.13` and
`i18next-browser-languagedetector ^8.2.1`. QuickApps already has `i18next ^26.3.1` and
`react-i18next ^17.0.8`.

QuickApps today:

- `src/i18n/index.ts` initialises i18next with `lng: 'en'` and two namespaces.
- `src/i18n/locales/common.json` holds about 120 keys, including the chat-style
  `dialFileManager.*` block. `src/i18n/locales/quick-app-editor.json` holds about 230.
- `src/constants/i18n.ts` holds three enums.
- `src/hooks/use-translation.ts` is the wrapper hook. `src/types/translation.ts` holds the
  `Translation` enum.
- `src/components/I18nProvider/` contains the `I18nextProvider` and the `dir`/`lang` logic.
- `src/test-utils/mock-translation.ts` is the per-file mock, used in 39 test files.
- About 90 source files import the keys or the hook.
- 14 specs name keys in the form `` `quickAppEditor` `AddOnDetails` `` (about 160 references).

QuickApps runs on its own origin (`README.md:122`) inside an iframe in chat or admin.

## Goals / Non-Goals

**Goals:**

- Use the same libraries, file layout, key style, typing, `dir` logic and test mock as chat.
  Copy chat's file contents rather than adapting them.
- Reuse chat's key paths and English values for strings that both apps share.
- Change no rendered English text.

**Non-Goals:**

- A second locale, a language selector, or a host-driven language.
- A shared npm package for i18n config.
- Rewording any copy.

## Decisions

### D1. Copy chat's `config.ts` verbatim

`src/i18n/config.ts` is chat's file. It is imported for its side effects
(`import '@/i18n/config'`) at the top of `src/main.tsx`. `src/i18n/index.ts` and
`I18nProvider` are deleted, and `main.tsx` drops the `<I18nProvider>` wrapper, because
`initReactI18next` registers the instance globally.

- _Alternative: keep `I18nProvider` and move only the `dir` logic._ Rejected. It is a second
  pattern with no benefit, since chat has no provider.

### D2. Keep the language detector even though only `en` ships

The user asked for one stack. The detector costs a few kB. Because the logic is identical to
chat's, adding a locale is the same four steps in both repos.

The observable effect today is limited to a cached `i18nextLng` value in QuickApps' own
localStorage. QuickApps' origin differs from chat's, so chat's choice does _not_ carry over.
Making the editor follow the host's language needs a `host-integration` change, for example a
language in the init `postMessage`. That is recorded as a follow-up, not done here.

- _Alternative: drop the detector and pin `lng: 'en'`._ This is closer to the current spec,
  but it is a fork from chat's config. Rejected.

### D3. Use `resolvedLanguage` everywhere the language is read

Chat sets `<html lang/dir>` from `resolvedLanguage`. QuickApps also passes the language to
`getLocalizedText` in eight components (`AddAgentsModal`, `AgentDetailsPopup`, `AgentsList`,
`EditorClient`, `ModelCatalogModal`, `SelectedModelCard`, `AddToolsetsModal`,
`ToolsetDetailsPopup`).

With a detector, `i18n.language` becomes the browser's raw code, for example `fr-FR`. That
would show entity names in a language the UI isn't in. Reading `i18n.resolvedLanguage` keeps
today's behaviour (`en`).

- _Alternative: `i18n.language`._ Chat uses it for date-formatting locales only. Rejected for
  entity text.

### D4. Key mapping

- Each existing key moves to a group. When chat has the same English string, QuickApps uses
  chat's path. Examples:
  - `Cancel` → `buttons.cancel`
  - `Loading…` → `basic.loading`
  - `Clear search` → `basic.clearSearch`
  - `No results found` → `basic.noResults`
  - the `dialFileManager.*` paths are kept as they are, since they already match chat
- Strings unique to QuickApps go into chat's existing groups where the feature matches:
  `auth`, `catalog`, `attachmentCanvas`, `applicationCredentials`, `toolsetSignin` and
  `applicationEditor`.
- Editor-specific copy (starters, advanced settings, add-ons, knowledge base, orchestrator)
  goes into `applicationEditor` sub-groups, for example `applicationEditor.starters.*` and
  `applicationEditor.advancedSettings.*`. This keeps the number of top-level groups small.
- Enum member names keep their current PascalCase names where possible
  (`QuickAppEditorI18nKeys.AddOnDetails` → `ApplicationEditorI18nKeys.AddOnDetails`), so the
  diff and the spec sweep stay mechanical.
- The implementation produces the mapping table as `openspec/changes/align-i18n-with-dial-chat/key-map.md`
  (old namespace + key → new enum member + path). The code and spec sweeps are driven from
  that table.

### D5. Global test mock, assertions on keys

`src/test-utils/setup.ts` gets chat's `vi.mock('react-i18next', …)` block. Two things are
added to it:

- `i18n.resolvedLanguage: 'en'`, needed by D3. Chat's mock has only `language`.
- A pass-through `initReactI18next: { type: '3rdParty', init: () => {} }`, so a test that
  imports `config.ts` doesn't crash.

`mock-translation.ts` and every per-file `vi.mock('@/hooks/use-translation'…)` are deleted.
Assertions on English text such as `getByRole('button', { name: 'Cancel' })` become assertions
on keys (`{ name: ButtonsI18nKeys.Cancel }`).

- _Alternative: keep a mock that returns English._ Rejected. Chat asserts on keys, and the
  English-text mock only worked because keys used to be English.

`src/i18n/tests/config.test.ts` ports chat's `config.spec.ts`. It sets
`localStorage.i18nextLng` to `uk` or `ar`, re-imports the module, and expects `lang="en"` and
`dir="ltr"`. A second case registers `ar` resources and expects `rtl`.

### D6. Spec key references are swept in place

The 14 non-`i18n` specs change no behaviour, only key identifiers. Writing MODIFIED deltas for
about 160 references would copy whole requirements just to rename identifiers, and the copies
could drift from their source. Instead, one task rewrites the references directly in
`openspec/specs/*/spec.md`, driven by `key-map.md`. The new form is the enum member plus its
English text, for example `` `ApplicationEditorI18nKeys.AddOnDetails` ("{{name}} details") ``.
The `i18n` spec changes through the delta in this change.

- _Alternative: MODIFIED deltas for every affected requirement._ Rejected. The volume is high
  and a copied requirement can drift.

### D7. Repository rules

These files are updated to the new scheme:

- `.claude/rules/all-ts.md`: gets chat's rule. Never pass a raw string to `t()`, add the
  enum member together with the JSON key, and reuse `ButtonsI18nKeys` for generic strings.
- `.claude/rules/rtl.md`: "Direction attribute" and "Adding a new locale" use chat's four
  steps:
  1. add `locales/<lang>.json`;
  2. register it in `config.ts`;
  3. there is no `SUPPORTED_LANGUAGES` here, so state that no selector exists;
  4. add the language to `RTL_LANGUAGES` if it is right-to-left.
- `AGENTS.md`: i18n paragraph and the RTL section.
- `openspec/config.yaml`: tech-stack line ("namespaces: quickAppEditor, common") and the
  design rule "pick the correct namespace".

## Risks / Trade-offs

- **Large diff with merge conflicts against in-flight branches** (for example
  `refactor/catalog-picker-modal`). → Land it in vertical slices (tasks.md), each green on its
  own, and rebase other branches after each slice. The key-map table makes conflict
  resolution mechanical.
- **A key is mapped wrongly, so the UI shows a different string.** → Typed keys catch
  missing paths. A script checks that every old English value appears exactly once as a new
  value (see tasks 1.3 and 6.2).
- **Tests lose English-copy coverage once they assert on keys.** → This trade-off is accepted
  and matches chat. The config test still checks real resolution.
- **The detector writes localStorage in a partitioned third-party iframe.** → The detector
  handles storage that is unavailable (try/catch inside), and the fallback is `en`.
- **`CustomTypeOptions` makes `t()` return types strict**, so some call sites that cast
  through `as unknown as string` may need small type fixes. → These are handled per slice.

## Migration Plan

1. Infrastructure: dependency, `en.json` generated from the two old files with the
   key-map, `config.ts`, `i18next.d.ts`, `translation-keys.ts`, global mock, config test.
   During this slice the old files stay so the build keeps passing. The old enums are
   re-pointed to the new paths, so components work unchanged on the new resources.
2. Migrate components and tests group by group to `react-i18next` and the new enums.
3. Delete the old enums, the wrapper, `I18nProvider`, `mock-translation.ts` and the old JSON.
4. Sweep specs and update the docs and rules.

Rollback is a revert of the commits. No data migration is needed.

## Open Questions

- Should the editor follow the host's UI language, for example a `language` field in the
  init `postMessage`? This is a follow-up `host-integration` change and is not part of this
  change.
- If chat later extracts its i18n config into a shared lib, QuickApps should switch to it.
  That is tracked in `docs/TECH_DEBT.md`.
