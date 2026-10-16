## Why

`docs/TECH_DEBT.md` ("A save without `general` drops translations"): a save without a `general`
payload, which is what every auto-save is, sends `name` and `description` as the primary-locale
text and no `locales`. chat-api's `updateApplication` requires `name` and replaces the stored
`displayName` with what `composeLocalizedFields` builds. Without `locales`, that is a plain
string. So the first auto-save after the host saved translations replaces them all with the
English text, and nothing tells the user.

Omitting `name` is not an option, because the DTO marks it `@IsNotEmpty`.

## What Changes

- For a save without `general`, `saveDialApp` rebuilds `locales` from the held `displayName`
  and `description` dictionaries. It uses ai-dial-chat's own `decomposeLocalizedFields` and
  `composeLocalePayload` (`@epam/ai-dial-chat-hooks/utils`) with `en` as the primary locale, and
  sends `primaryLocale: "en"` along with them. Untranslated apps send the same request as before.
- A save with `general` is unchanged, since the host already sends `locales` and `primaryLocale`.

## Capabilities

### Modified Capabilities

- `application_editing`: "Save request".

## Impact

- **Code:** `src/utils/dial-client.ts` (`saveDialApp`) and `src/utils/tests/save-dial-app.test.ts`.
- **API / chat-api:** the same endpoint; a save without `general` may now carry `locales` and
  `primaryLocale`.
- **Host integration, i18n, RTL:** none.
- **Rollback:** revert the commit.
