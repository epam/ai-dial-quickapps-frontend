## ADDED Requirements

### Requirement: Remove a starter from the add-on row

In an editable application, each starter listed in the Conversation starters Add-ons row SHALL have a remove button at the end of its item:

- a ui-kit 2.0 ghost icon button with a trash icon;
- named by the `quickAppEditor` key `RemoveStarter` ("Remove starter {{name}}"), where `{{name}}` is the starter's title, or its prompt when the title is blank;
- visible only while the item is hovered or holds keyboard focus;
- kept in the tab order while invisible.

Activating it SHALL remove that starter from the `starters` form value owned by `useQuickApp2Form`, through the row's existing save callback. It SHALL NOT open the Set up conversation starters modal and SHALL leave `introText`, `autoSubmit` and `chatMessageInputDisabled` unchanged. Focus SHALL then move to the first remaining starter's remove button. Read-only and shared applications SHALL NOT render the remove button. The row SHALL make no chat-api request for this, and its remove handler SHALL be a stable `useCallback` so the memoised row does not re-render on unrelated edits.

#### Scenario: Remove one starter

- **WHEN** an editable application lists the starters "A", "B" and "C", and the user hovers "B" and activates "Remove starter B"
- **THEN** the row SHALL list "A" and "C" in that order
- **AND** the form SHALL become dirty, and saving SHALL persist `conversation_starters` with only "A" and "C" and the same settings
- **AND** the modal SHALL NOT open
- **AND** focus SHALL move to "Remove starter A"

#### Scenario: Remove the last starter

- **WHEN** the only listed starter is removed
- **THEN** the row SHALL show its description and the **Add** action instead of **Manage**

#### Scenario: Starter without a title

- **WHEN** a listed starter has a blank title and the prompt "Summarize this page"
- **THEN** its remove button SHALL be named "Remove starter Summarize this page"

#### Scenario: Read-only or shared application

- **WHEN** the editor is read-only or the application is shared
- **THEN** no remove button SHALL be rendered and the list SHALL stay visible

#### Scenario: Right-to-left locale

- **WHEN** `document.documentElement.dir` is `rtl`
- **THEN** the remove button SHALL sit at the end (left) of each starter item
- **AND** the trash icon SHALL NOT be mirrored
