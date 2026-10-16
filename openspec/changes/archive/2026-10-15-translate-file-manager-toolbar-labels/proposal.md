## Why

`docs/TECH_DEBT.md` ("Untranslated library defaults") lists English text that comes from library
defaults rather than from this app's translations. The toolbar strings in the file manager can be
fixed here. The skill details "Folder path" cannot.

## Problem

- `FileManagerModal` (`src/components/common/FileManagerModal/FileManagerModal.tsx`) leaves two
  label props of `@epam/ai-dial-react-file-manager`'s toolbar (`DialFileManagerToolbar`) unset in
  `toolbarOptions`. So the library's English defaults are shown:
  - `newButtonLabel` defaults to "Add": the new-item menu that holds Upload and New folder;
  - `moreActionsLabel` defaults to "More actions": the accessible name of the compact layout's
    menu trigger, used at narrow widths.
- The "Folder path" name of the folder path `nav` in add-on details comes from the ui-kit
  `FolderPath` default (`ariaLabel = "Folder path"`). `@epam/ai-dial-catalog` renders it in both
  details headers without passing `ariaLabel` and has no prop to pass one through. This needs an
  upstream change.

## Solution

1. Pass `newButtonLabel: t(ButtonsI18nKeys.Add)` and
   `moreActionsLabel: t(ConversationPanelI18nKeys.ActionsLabel)` in `toolbarOptions`.
   - "Add" is the generic button label, so it reuses `ButtonsI18nKeys.Add`.
   - "More actions" exists in ai-dial-chat's `en.json` as `conversationPanel.actions.actionsLabel`.
     The i18n key rule says to reuse chat's group and key path, so it adds
     `ConversationPanelI18nKeys.ActionsLabel` with that path.
2. Record "Folder path" in `docs/TECH_DEBT.md` as an ai-dial-chat ask: a label prop on the catalog
   details headers, forwarded to `FolderPath`'s `ariaLabel`.

## Alternatives considered

- A feature-scoped `dialFileManager.moreActions` key. Rejected because the key rule says to reuse
  chat's key path when the same English text already exists there.
- Wrap `FolderPath` from outside, for example by patching the DOM. Rejected as fragile, since the
  catalog owns the header markup.

## Non-goals

- The "Folder path" label, which is upstream.
- Other library defaults not listed in TECH_DEBT.

## Acceptance criteria

- `openspec validate translate-file-manager-toolbar-labels --strict` passes.
- A test pins the toolbar labels. `npm test`, `npm run lint` and `npm run typecheck` pass.

## What Changes

- `context-files`: MODIFIED "Notifications, busy states, direction and accessibility", which now
  names the toolbar's new-item menu and More actions labels.

## Capabilities

### Modified Capabilities

- `context-files`: the toolbar's new-item menu and compact More actions trigger are translated.

## Impact

- **Code:** `src/components/common/FileManagerModal/FileManagerModal.tsx`,
  `src/constants/translation-keys.ts`, `src/i18n/locales/en.json`, and the modal's tests.
- **i18n:** one new key, `conversationPanel.actions.actionsLabel` ("More actions"), with the same
  path as ai-dial-chat. It reuses `buttons.add`.
- **API / chat-api, host integration:** none. **RTL:** none; labels only.
- **Rollback:** revert the commit.
