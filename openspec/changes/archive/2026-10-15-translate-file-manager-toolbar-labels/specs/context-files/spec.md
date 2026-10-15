## MODIFIED Requirements

### Requirement: Notifications, busy states, direction and accessibility

Notifications from file operations SHALL appear as a banner at the top of the popup body, with an error or success background for those variants and a neutral one otherwise, showing the optional title in semibold above the message; a banner SHALL disappear after four seconds and a new one SHALL replace it. The banner SHALL be rendered inside a live region that exists while the popup is open, whether or not a banner is shown (`aria-live="polite"`, `aria-atomic="true"`), so screen readers announce each new banner; an error banner SHALL additionally carry `role="alert"`. Deleting and renaming SHALL each cover the browser with a busy overlay whose spinner is named `DeletingLabel` or `RenamingLabel` and which is announced politely (`aria-live="polite"`). All text SHALL come from the `dialFileManager` translation group (`DialFileManagerI18nKeys`); the folder chips SHALL be named `TabsAriaLabel` ("File sources") and the popup's close control `CloseDialog`. The toolbar SHALL show no English default from `@epam/ai-dial-react-file-manager`. Its new-item menu, which holds Upload and New folder, SHALL be labelled `ButtonsI18nKeys.Add` ("Add"), passed as `toolbarOptions.newButtonLabel`. The trigger of its compact-layout menu SHALL be named `ConversationPanelI18nKeys.ActionsLabel` (`conversationPanel.actions.actionsLabel`, "More actions", the same key path as ai-dial-chat), passed as `toolbarOptions.moreActionsLabel`. Direction SHALL follow the document `dir` through the file manager and kit components; the app's own layout SHALL use only logical or direction-agnostic classes (the upload queue anchored with `end-4`, overlays with `inset-0`), and no icon SHALL be mirrored by the app.

#### Scenario: Notification auto-dismiss

- **WHEN** a folder creation fails
- **THEN** the error banner SHALL show "Failed to create folder" and SHALL disappear after four seconds

#### Scenario: Notifications are announced

- **WHEN** the popup is open and a notification appears
- **THEN** the banner SHALL be inside the popup's polite live region, which was already rendered before the banner appeared
- **AND** an error banner SHALL have `role="alert"`, and a success banner SHALL NOT

#### Scenario: Busy overlay

- **WHEN** a delete is in progress
- **THEN** a spinner named "Deleting…" SHALL cover the browser and SHALL be removed when the delete ends

#### Scenario: Right-to-left document

- **WHEN** the document direction is `rtl` (as when an RTL locale is active — none ships yet, see `i18n`)
- **THEN** the popup SHALL render without errors
- **AND** the upload queue SHALL sit at the inline-end corner

#### Scenario: Toolbar labels are translated

- **WHEN** the popup is open
- **THEN** `DialFileManager` SHALL receive `toolbarOptions.newButtonLabel` equal to the translation of `ButtonsI18nKeys.Add`
- **AND** `toolbarOptions.moreActionsLabel` equal to the translation of `ConversationPanelI18nKeys.ActionsLabel`
