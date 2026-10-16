Slicing strategy: **one vertical slice**: the labels, the key and the test land together.

## 1. Toolbar labels

- [x] 1.1 Add `ConversationPanelI18nKeys.ActionsLabel = 'conversationPanel.actions.actionsLabel'`
      to `src/constants/translation-keys.ts` and `"conversationPanel": { "actions": { "actionsLabel":
    "More actions" } }` to `src/i18n/locales/en.json`.
- [x] 1.2 In `src/components/common/FileManagerModal/FileManagerModal.tsx`, pass `newButtonLabel`
      (`ButtonsI18nKeys.Add`) and `moreActionsLabel` (`ConversationPanelI18nKeys.ActionsLabel`) in
      `toolbarOptions`. Add the "Toolbar labels are translated" test.
  - Verification: `npx vitest run src/components/common/FileManagerModal`, `npm run lint`,
    `npm run typecheck`.

## 2. Docs

- [x] 2.1 In `docs/TECH_DEBT.md`, mark the toolbar strings fixed and move "Folder path" to an
      ai-dial-chat ask (catalog details headers forward an `ariaLabel` to `FolderPath`).
- [x] 2.2 `openspec validate translate-file-manager-toolbar-labels --strict`.
