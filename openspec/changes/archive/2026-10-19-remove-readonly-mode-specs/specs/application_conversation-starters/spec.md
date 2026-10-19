# Spec Delta

## REMOVED Requirements

### Requirement: Conversation starters add-on row

**Reason**: The editor has no read-only mode, so the read-only scenarios and wording of this requirement no longer apply. OpenSpec cannot drop a scenario from a MODIFIED block, so the requirement is re-added under a renamed title.
**Migration**: See the renamed requirement in the ADDED section below; its behaviour is otherwise unchanged.

### Requirement: Remove a starter from the add-on row

**Reason**: The editor has no read-only mode, so the read-only scenarios and wording of this requirement no longer apply. OpenSpec cannot drop a scenario from a MODIFIED block, so the requirement is re-added under a renamed title.
**Migration**: See the renamed requirement in the ADDED section below; its behaviour is otherwise unchanged.

## ADDED Requirements

### Requirement: Conversation starters add-on row (editable)

The Add-ons section SHALL contain a **Conversation starters** row, titled with the `ApplicationEditorI18nKeys.StartersTitle`, rendered after the other Add-ons rows. The row's content SHALL be driven by the editor form state field `starters` owned by `useQuickApp2Form`; the row SHALL hold only the modal's open/closed flag in local component state. It SHALL introduce no context and call no chat-api endpoint. The row component SHALL be wrapped in `memo`, and the callbacks it receives from `QuickApp2Form` SHALL be stable (`useCallback`) so that typing in unrelated fields does not re-render the starters list.

A starter is **saved-visible** when its title or its prompt is non-blank (the same rows that are persisted, see "Saving conversation starters").

#### Scenario: No starters

- **WHEN** the application has no saved-visible starter
- **THEN** the row SHALL show its description `ApplicationEditorI18nKeys.StartersDescription` ("Pre-built prompts shown at conversation start to help users get going quickly.")
- **AND** the row header SHALL show an **Add** action labelled with the `ButtonsI18nKeys.Add` and a plus icon
- **AND** no starters list SHALL be rendered

#### Scenario: Starters present

- **WHEN** the application has the starters `[{ title: "Visual hierarchy", text: "Analyze visual hierarchy on the page:" }, { title: "WCAG 2.0 compatibility", text: "Analyze WCAG 2.0 compatibility" }]`
- **THEN** the row SHALL NOT show its description
- **AND** the row header SHALL show a **Manage** action labelled with `ButtonsI18nKeys.Manage` and a pencil icon, in place of Add
- **AND** the row SHALL list both starters in saved order, each with a message icon, the title in semibold primary text and the prompt in secondary text on a single line truncated with an ellipsis
- **AND** a starter with a blank title SHALL show only its prompt line, and a starter with a blank prompt SHALL show only its title line

#### Scenario: Add or Manage opens the modal

- **WHEN** the user activates Add or Manage in an editable editor
- **THEN** the Set up conversation starters modal SHALL open

### Requirement: Remove a starter from the add-on row (editable)

In an editable application, each starter listed in the Conversation starters Add-ons row SHALL have a remove button at the end of its item:

- a ui-kit 2.0 ghost icon button with a trash icon;
- named by the `ApplicationEditorI18nKeys.StartersRemove` ("Remove starter {{name}}"), where `{{name}}` is the starter's title, or its prompt when the title is blank;
- visible only while the item is hovered or holds keyboard focus;
- kept in the tab order while invisible.

Activating it SHALL remove that starter from the `starters` form value owned by `useQuickApp2Form`, through the row's existing save callback. It SHALL NOT open the Set up conversation starters modal and SHALL leave `introText`, `autoSubmit` and `chatMessageInputDisabled` unchanged. Focus SHALL then move to the first remaining starter's remove button. The row SHALL make no chat-api request for this, and its remove handler SHALL be a stable `useCallback` so the memoised row does not re-render on unrelated edits.

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

#### Scenario: Right-to-left document

- **WHEN** the document direction is `rtl` (as when an RTL locale is active — none ships yet, see `i18n`)
- **THEN** the remove button SHALL sit at the end (left) of each starter item
- **AND** the trash icon SHALL NOT be mirrored
