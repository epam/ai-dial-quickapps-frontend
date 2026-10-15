## Why

QuickApps and ai-dial-chat are both Vite + React SPAs on i18next / react-i18next, but they use
different i18n conventions: different key style, namespaces, hook, typing, document-direction
logic and test mocks. A developer moving between the two repos has to learn two schemes, and
strings can't be copied between them. Several QuickApps keys already state that their English
"match the chat catalog's English" (`src/constants/i18n.ts:126`), and the `dialFileManager.*` block
(`src/constants/i18n.ts:322`) is already chat-style. This change finishes that alignment so
both apps run **one i18n stack**: chat's (`ai-dial-chat/apps/chat/src/i18n/config.ts`).

## Problem

- Keys are English source text (`'Cancel': 'Cancel'`), split across two namespaces
  (`common`, `quickAppEditor`). Chat uses semantic nested keys in one namespace
  (`buttons.cancel`).
- Keys are untyped. Chat types them through `CustomTypeOptions`, so a missing key fails
  `tsc`.
- QuickApps wraps `useTranslation` in its own hook (`src/hooks/use-translation.ts:5`) with
  a `Translation` namespace enum. Chat calls `react-i18next` directly.
- `<html dir>` comes from `i18n.dir(i18n.language)` in `I18nProvider`
  (`src/components/I18nProvider/I18nProvider.tsx:13`). It reports `rtl` for a language that
  has no resources. Chat reads `resolvedLanguage`, which describes the text actually shown.
- The language is pinned to `en`. Chat detects it from localStorage and then the browser.
- Tests mock the wrapper separately in each of 39 files. Chat has one global `react-i18next` mock.

## Solution

Adopt chat's stack as-is:

- One `en.json` in the default `translation` namespace, with semantic camelCase keys
  grouped by feature. Groups reuse chat's group names and keys wherever the string
  already exists there (`basic`, `buttons`, `auth`, `dialFileManager`, `catalog`,
  `attachmentCanvas`, `applicationCredentials`, `toolsetSignin`, `applicationEditor`, …).
- Per-group string enums in `src/constants/translation-keys.ts`. `t()` never takes a
  raw string.
- `src/i18n/i18next.d.ts` for typed keys.
- `src/i18n/config.ts`, a copy of chat's config: `i18next-browser-languagedetector`
  (localStorage → navigator), `fallbackLng: 'en'`, `RTL_LANGUAGES`, and
  `applyDocumentDirection` on `resolvedLanguage`. It is imported once for its side
  effects in `main.tsx`. `I18nProvider` and the `useTranslation` wrapper are removed.
- One global `react-i18next` mock in `src/test-utils/setup.ts`, where `t` returns the key.

## Non-goals

- Adding a locale other than `en`, or a language-selector UI.
- Taking the UI language from the host (postMessage, query parameter). That is a
  separate `host-integration` change.
- Changing any English copy. Every rendered string stays the same.
- Changing how `LocalizedText` is resolved or what the save payload contains.

## Alternatives considered

1. **Keep the current scheme (baseline).** No risk, but the two stacks stay split, which is
   the problem this change exists to solve. Rejected.
2. **Cherry-pick: semantic keys and typing, but keep the wrapper hook, the per-file mocks and
   the pinned `en`.** This means less test churn. The user asked for one stack, though, and a
   partly aligned scheme is still a second scheme. Rejected.
3. **Full alignment with chat (chosen).** Same libraries, layout, key style, typing, mocks
   and direction logic. The main cost is a large but mechanical diff: about 350 keys, about 90
   source files and about 40 test files.
4. **Extract a shared i18n package used by both repos.** Out of proportion for one config
   file. It also doesn't fix the per-app key layout. It can come later if a third app appears.

## Acceptance criteria

- `src/i18n/locales/en.json` is the only locale file. `common.json` and
  `quick-app-editor.json` are deleted.
- No `t()` / `i18nKey` call passes a string literal, and `npm run typecheck` rejects a key
  that is not in `en.json`.
- `src/hooks/use-translation.ts`, `src/types/translation.ts`, `src/constants/i18n.ts`,
  `src/components/I18nProvider/` and `src/test-utils/mock-translation.ts` no longer exist.
- In a browser whose language is `ar` or `uk`, the editor still renders English with
  `<html lang="en" dir="ltr">`.
- `npm test`, `npm run lint`, `npm run typecheck` and `npm run build` pass.
- Every spec that names an i18n key names it in the new form (`buttons.cancel` /
  `ButtonsI18nKeys.Cancel`).

## Rollback / compatibility

The change is not breaking for hosts or users: the English text, the iframe protocol and the
save payload are unchanged. The one new observable effect is that the detector writes
`i18nextLng` to QuickApps' own localStorage. To roll back, revert the commit(s); the leftover
localStorage key is harmless.

## What Changes

- **BREAKING (internal)**: the `common` / `quickAppEditor` namespaces and the
  English-text keys are replaced by `translation` with semantic keys. The enums
  `CommonI18nKeys`, `QuickAppEditorI18nKeys`, `DialFileManagerI18nKeys` and `Translation`
  are removed.
- New dependency: `i18next-browser-languagedetector` (chat pins `^8.2.1`).
- The active language is detected (localStorage `i18nextLng` → `navigator`). Only `en`
  ships, so the result is always English.
- `<html lang/dir>` follows the resolved language, not the requested one.
- `I18nProvider` is removed. `react-i18next`'s `initReactI18next` provides the instance.
- Components call `useTranslation()` from `react-i18next` and read the language from
  `i18n.resolvedLanguage`.
- Tests assert on keys, through one global mock.
- Specs, `.claude/rules/rtl.md`, `.claude/rules/all-ts.md`, `AGENTS.md`,
  `openspec/config.yaml` and `docs/TECH_DEBT.md` are updated to the new scheme.

## Capabilities

### New Capabilities

_None._

### Modified Capabilities

- `i18n`: one `translation` namespace with semantic keys; typed keys; no wrapper hook;
  language detection (localStorage → navigator); `<html lang/dir>` from the resolved
  language and a fixed RTL set instead of `I18nProvider`'s `i18n.dir()`.

The other specs that name keys (`agents_selection`, `application_*`, `auth`,
`catalog-entity-details`, `orchestrator_model-selection`, `skills_catalog`, `toolsets_*`)
have no behaviour change. Their key references are renamed mechanically (see design.md,
"Spec key references").

## Impact

- **Code:** `src/i18n/*`, `src/main.tsx`, `src/constants/i18n.ts` (which becomes
  `translation-keys.ts`), `src/hooks/use-translation.ts`, `src/types/translation.ts`,
  `src/components/I18nProvider/`, and every component that translates text (about 90 files).
- **Tests:** `src/test-utils/setup.ts`, `src/test-utils/mock-translation.ts`, about 40 test files
  that mock the hook or assert English text, and a new `src/i18n/tests/config.test.ts`.
- **Dependencies:** adds `i18next-browser-languagedetector`.
- **Cross-cutting:** host integration is unchanged (no language comes from the host). Auth,
  the API layer and the save payload are untouched. The auth screens' strings move to the
  `auth` group.
- **i18n:** no new user-visible strings. Every existing string gets a new key and keeps its
  English value.
- **RTL:** no new UI. `<html dir>` logic changes: an RTL language without resources now stays
  `ltr`, which matches what is rendered. The Tailwind/icon rules in `.claude/rules/rtl.md` are
  unchanged.
- **Embedding note:** QuickApps is served from its own origin (`README.md:122`
  `AUTH_CALLBACK_BASE_URL`), not chat's. Its `i18nextLng` is therefore separate from chat's,
  and in a cross-origin iframe the browser may partition that storage. The detected
  language in practice is the browser's language, and only `en` ships.
