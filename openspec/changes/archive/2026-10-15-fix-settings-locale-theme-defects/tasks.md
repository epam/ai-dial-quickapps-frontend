Slicing strategy: **vertical per defect**. Each fix lands with the tests that pin its scenarios.

## 1. Locale recombination

- [x] 1.1 In `src/utils/get-localized-text.ts`, make `buildLocalizedText` mirror chat-api's
      `composeLocalizedFields`: plain value when `locales` is absent or empty, `en` as the default
      primary locale, empty locale strings skipped, `undefined` for an empty dictionary. Add the
      new i18n scenarios to `src/utils/tests/get-localized-text.test.ts`.
  - Verification: `npx vitest run src/utils/tests/get-localized-text.test.ts`.

## 2. Markdown editor theme

- [x] 2.1 In `src/components/InstructionsSection/InstructionsSection.tsx`, use `EditorThemes.dark`
      only for a loaded theme whose id is not `light`. Add tests for "Markdown editor matches the
      fallback page" and "Markdown editor follows a loaded dark theme".
  - Verification: `npx vitest run src/components/InstructionsSection`.

## 3. Single client-config load

- [x] 3.1 In `src/App.tsx`, load the settings once the auth status is known, keyed on `user.sub`.
      Render `EditorClient` only for settings loaded for the current user, and pass them as a
      `settings` prop. Key the handshake effect on the resolved host keys. Update
      `src/tests/App.test.tsx` for "One client-config request per session user", "Signing in loads
      the user's config" and "Sign-in with the same host keys".
- [x] 3.2 In `src/components/EditorClient/EditorClient.tsx`, take `settings` as a prop, stop
      calling `fetchAppSettings`, and seed the allowed origins from the prop. Update
      `src/components/EditorClient/tests/EditorClient.test.tsx` ("Editor does not request the
      client config").
  - Verification: `npx vitest run src/tests src/components/EditorClient`, then the full `npm test`,
    `npm run lint` and `npm run typecheck`.

## 4. Docs

- [x] 4.1 Mark the three findings fixed in `docs/TECH_DEBT.md`.
- [x] 4.2 `openspec validate fix-settings-locale-theme-defects --strict`.
