Slicing strategy: **vertical per surface**. The helper comes first, then each surface with its
tests.

## 1. Helper and keys

- [x] 1.1 Add `getChatApiErrorMessage` in `src/utils/chat-api-error.ts`. It returns the chat-api
      body message for a `ResponseError`, and `null` for anything else, including a body without
      a message. Add tests in `src/utils/tests/chat-api-error.test.ts`.
- [x] 1.2 Add the `AppsEditorI18nKeys` enum (`ErrorSaveFailed`, `SchemaFormLoadFailed`, with the
      same paths as ai-dial-chat) and `ApplicationEditorI18nKeys.OrchestratorModelUnavailable` /
      `OrchestratorModelToolsUnsupported`, with their `en.json` entries.

## 2. Surfaces

- [x] 2.1 `EditorClient`: SaveError uses the helper or `ErrorSaveFailed`; the load error screen
      shows `SchemaFormLoadFailed`. Update the tests.
- [x] 2.2 `QuickApp2Schema` uses the two model keys; `ModelConfigurationSection` passes the
      translated `errors.model` to the card. Update the tests.
- [x] 2.3 `DataContext` stores the helper's message, or `undefined`, as `error`. Update the tests.
  - Verification: full `npm test`, `npm run lint`, `npm run typecheck`.

## 3. Docs

- [x] 3.1 Mark "SaveError text" fixed in `docs/TECH_DEBT.md`.
- [x] 3.2 `openspec validate translate-editor-error-messages --strict`.
