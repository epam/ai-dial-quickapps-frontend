## 1. Save without general

- [x] 1.1 In `saveDialApp`, when `general` is absent, send `locales` rebuilt from the held
      `displayName` / `description` dictionaries (`decomposeLocalizedFields` +
      `composeLocalePayload`, primary `en`) and `primaryLocale: "en"` when there are any.
- [x] 1.2 Add "Auto-save keeps stored translations" and "Auto-save of an untranslated app" to
      `src/utils/tests/save-dial-app.test.ts`.
  - Verification: `npx vitest run src/utils/tests/save-dial-app.test.ts`, then the full checks.

## 2. Docs

- [x] 2.1 Mark the TECH_DEBT item fixed; `openspec validate keep-translations-on-save-without-general --strict`.
