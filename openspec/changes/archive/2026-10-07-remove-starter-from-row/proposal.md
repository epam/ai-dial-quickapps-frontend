## Why

The Skills row now lets a user remove a skill straight from the list: a trash button appears when the row is hovered (`src/components/Skills/SkillsList/SkillListItem.tsx`). Conversation starters, in the same Add-ons card, still need **Manage** → modal → delete → **Save** to remove one starter (`src/components/ConversationStarters/ConversationStartersList.tsx`). The two rows should behave the same.

## What Changes

- Each starter in the Conversation starters Add-ons row gets a trash icon button at its end, revealed on hover or keyboard focus. This matches the Skills row items.
- Activating it removes that starter from the `starters` form value immediately, with no modal. The intro message, "Require a starter to start a new chat" and "When starter is selected" values stay as they are, as they do when the modal saves.
- Focus moves to the first remaining starter's trash button. When the last starter goes, the row returns to its empty state with **Add**.
- Read-only and shared applications get no trash button.

## Non-goals

- Changing the Set up conversation starters modal, reordering, the saved data shape, or the settings gating rule.
- An undo affordance. The change only edits the unsaved form, like every other editor field.

## Alternatives considered

- _Keep removal in the modal only_ (baseline). The two rows would then be inconsistent. Rejected.
- _Inline-edit starters in the row._ Out of scope: the modal owns editing.

## Acceptance criteria

- In an editable app, each listed starter has a "Remove starter <title or prompt>" button that is invisible until its row is hovered or focused.
- Activating it on the second of three starters leaves the other two in order and makes the form dirty. Saving persists the same `conversation_starters` as deleting that starter in the modal would. The modal does not open.
- Removing the last starter shows the empty row (description + **Add**).
- Read-only or shared app: no trash buttons.
- RTL: the trash button is at the logical end (left), and the icon is not mirrored.

## Capabilities

### New Capabilities

<!-- none -->

### Modified Capabilities

- `application_conversation-starters`: adds a requirement for removing a starter from the Add-ons row.

## Impact

- **Code:**
  - `src/components/ConversationStarters/ConversationStartersList.tsx` gets the trash button per item;
  - `src/components/ConversationStarters/ConversationStartersRow.tsx` passes the remove handler (`onSave` with the starter filtered out);
  - plus tests.
- **API / host / auth:** none.
- **i18n (`quickAppEditor`):** new key `RemoveStarter` ("Remove starter {{name}}").
- **RTL:** logical spacing only; the trash icon is symmetric and is not mirrored.
- **Rollback:** revert the commit. The data shape is unchanged.
