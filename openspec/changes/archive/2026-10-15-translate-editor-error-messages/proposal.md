## Why

`docs/TECH_DEBT.md` ("SaveError text") says save failures reach the host as untranslated English.
Looking for the same gap elsewhere found three more places where error text bypasses i18n.

## Problem

- **SaveError.** `EditorClient.handleSave` sends `err.message`. For a chat-api rejection, that is
  the generated client's generic "Response returned an error code", not chat-api's own message.
  Otherwise it falls back to a hard-coded English 'Save failed'. The host (ai-dial-chat
  `QuickAppSetup`) shows the text as it is and uses its own translated `appsEditor.error.saveFailed`
  only when the text is empty.
- **Load error screen.** When the application fails to load, `EditorClient` shows `err.message`
  or a hard-coded 'Initialization failed'.
- **Model validation messages.** `QuickApp2Schema` (`src/form/quickApp2Form.ts`) uses two English
  literals for the `model` field, while every other rule uses an `ApplicationEditorI18nKeys`
  member. `SelectedModelCard` renders the field error without `t()`. It works today only because
  the literal is already English, and it would show a raw key once the message becomes one.
- **Picker load errors.** `DataContext` stores `err.message` as `error`, and `CatalogPickerModal`
  shows it under its translated title. That text is again "Response returned an error code", or a
  browser message such as "Failed to fetch".

## What Changes

- New `getChatApiErrorMessage(error)` (`src/utils/chat-api-error.ts`). It returns the message from
  a chat-api error body (through `getApiErrorMessage` of `@epam/ai-dial-chat-hooks`), or `null`.
  It never returns the client's generic text or a browser message.
- SaveError carries chat-api's message, or else the translation of
  `AppsEditorI18nKeys.ErrorSaveFailed`.
- The load error screen shows the translation of `AppsEditorI18nKeys.SchemaFormLoadFailed`.
- The two model messages become `ApplicationEditorI18nKeys.OrchestratorModelUnavailable` and
  `OrchestratorModelToolsUnsupported`, with their English text unchanged. The card translates them.
- `DataContext.error` holds chat-api's message, or nothing. The picker shows a description only
  when there is one.

## Capabilities

### Modified Capabilities

- `application_editing`: "Application load outcomes", "Save outcome messages".
- `orchestrator_model-selection`: "Model picker loading and error states", "Default model
  loading and error states".
- `skills_catalog`: "Add skill popup loading and error states".

## Impact

- **Code:** `src/utils/chat-api-error.ts` (new), `src/components/EditorClient/EditorClient.tsx`,
  `src/form/quickApp2Form.ts`, `src/components/Orchestrator/ModelConfigurationSection`,
  `src/context/DataContext.tsx`, `src/constants/translation-keys.ts`, `src/i18n/locales/en.json`,
  and tests.
- **i18n:** new `appsEditor.error.saveFailed` and `appsEditor.schemaForm.loadFailed`, with the
  same key paths and English text as ai-dial-chat. Also new
  `applicationEditor.orchestrator.modelUnavailable` and `…modelToolsUnsupported`.
- **Host integration:** the `SaveError.error` text changes, but its shape does not.
- **API / chat-api:** none. **RTL:** none; text only.
- **Rollback:** revert the commit.
