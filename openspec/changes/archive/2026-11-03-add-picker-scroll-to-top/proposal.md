## Why

ai-dial-chat issue [#9595](https://github.com/epam/ai-dial-chat/issues/9595) added a "Scroll to
top" button to the DIAL chat catalog. QA asked for the same control in the Quick App editor's
catalog pickers ([comment](https://github.com/epam/ai-dial-chat/issues/9595#issuecomment-6573105542)).
With a long list of models, agents, toolsets or skills, the only way back to the search field is
to scroll all the way up by hand.

Since #323 the pickers render `@epam/ai-dial-catalog`'s `CatalogPickerModal` and
`AddOnCatalogModal`. ai-dial-chat#9693 added the button to both, and it shipped in
`1.3.0-dev.296`.

## What Changes

- Bump the chat libs to `1.3.0-dev.296`. These are `@epam/ai-dial-attachment-canvas`,
  `-attachment-input`, `-catalog`, `-chat-hooks`, `-chat-shared`, `-quotations`, `-skill-editor`
  and `-visualizer-connector`.
- Bump `@epam/ai-dial-ui-kit` to `0.16.0-dev.67`, which `@epam/ai-dial-chat-shared@1.3.0-dev.296`
  requires as a peer.
- `useCatalogPickerSharedProps` passes `scrollToTop: t(CatalogI18nKeys.ScrollToTop)`, so the
  button in all four pickers (Change model, Add agent, Add toolset, Add skill) carries the
  translated name.
- New i18n key `catalog.scrollToTop` ("Scroll to top"), with the same wording as ai-dial-chat.

## Capabilities

### Modified Capabilities

- `orchestrator_model-selection`: "Model picker scroll to top".
- `agents_selection`: "Add agent popup scroll to top".
- `toolsets_selection`: "Add toolset popup scroll to top".
- `skills_catalog`: "Add skill popup scroll to top".

## Impact

- **Code:** `package.json`, `package-lock.json`, `src/hooks/use-catalog-picker-shared-props.ts`
  and its test, `src/constants/translation-keys.ts`, `src/i18n/locales/en.json`.
- **Behaviour:** the button, its placement, its threshold and the search focus come from the
  library.
- **RTL:** the library places the button at the inline end.
- **Rollback:** revert the commit.
