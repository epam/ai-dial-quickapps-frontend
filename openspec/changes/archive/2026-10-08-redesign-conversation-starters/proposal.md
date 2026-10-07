## Why

The design moves Conversation starters out of their own collapsible section in the main column (`src/components/ConversationStarters/ConversationStartersSection.tsx:31-35`) and into the Add-ons card (`src/components/AddOns/AddOnsSection.tsx:47`). In the card, starters become a row with an **Add** action (empty) or a **Manage** action plus a read-only list (populated). Editing moves into a **Set up conversation starters** modal. The modal adds drag-to-reorder, a 30-character label limit, and reworded settings. Today starters can't be reordered at all. The inline editor also keeps the four starter fields on the react-hook-form legacy bridge (`src/components/QuickApp2FormLegacyFields/QuickApp2FormLegacyFields.tsx:11-20`), which `docs/TECH_DEBT.md` lists for removal.

## What Changes

- **Add-ons row.** The Add-ons card gets a **Conversation starters** row after the existing rows, built on `AddOnRow` (`src/components/AddOns/AddOnRow.tsx:23`).
  - **Empty:** the row shows the description "Pre-built prompts shown at conversation start to help users get going quickly." and a **+ Add** action.
  - **Populated:** the row hides the description. It shows a read-only list (message icon, bold label, secondary one-line prompt) and a **Manage** (pencil) action instead of Add.
- **Set up conversation starters modal.** Add and Manage open the same modal. It has a header close control and Close / Save footer actions, the same pattern as `AdvancedSettingsPopup.tsx:76-101`.
  - The modal edits a local draft. **Save** applies the draft to the form; Close, ×, Escape or clicking outside discard it.
  - **Rows:** each row has a drag handle, a **Button label** input with a `n/30` counter (max 30 characters), a **Prompt to send in chat** input and a delete button. The list still always ends with one blank row that is added automatically.
  - **Reordering:** rows can be reordered with the mouse (drag handle) or the keyboard (handle + Space/arrow keys). The saved `starters` order follows the list.
  - **Settings block:** a **Settings** heading with the hint "At least one starter is required to enable settings." It holds:
    - **Intro message** (renamed from Intro text);
    - the switch **Require a starter to start a new chat**, with the caption "Disables the chat input on a new chat until the user picks a starter. Typing works normally after that." It is still bound to `chatMessageInputDisabled` / `chat_message_input_disabled`; only the copy changes;
    - the radio group **When starter is selected**, with the options **Send prompt to the chat** (`autoSubmit: true`) and **Populate prompt in the chat input** (`autoSubmit: false`).
  - The settings stay disabled until the draft has a starter with both a label and a prompt. This is the same rule as today.
- **BREAKING (UI only):** the collapsible Conversation starters section is removed from the main column. The persisted `application_properties.conversation_starters` shape is unchanged, and partially filled starters are still saved as they are today.
- `starters`, `introText`, `autoSubmit` and `chatMessageInputDisabled` move off the react-hook-form legacy bridge onto `useQuickApp2Form` (`src/hooks/use-quick-app2-form.ts`).
- New dependency **`@dnd-kit/core` + `@dnd-kit/sortable` + `@dnd-kit/utilities`** for sortable rows with keyboard support. The kit's `DialDraggableItem` can't be used: it imports a private bundled copy of react-dnd (`node_modules/@epam/ai-dial-ui-kit/dist/components/DraggableItem/DraggableItem.js:7-8`), and the kit doesn't export that copy's `DndProvider`. It also has no keyboard support.

## Non-goals

- Splitting the Agents & Toolsets row into separate Toolsets and Agents rows, or adding a Knowledge base row. Both are in the same mock but will be separate changes.
- Changing how the chat enforces `chat_message_input_disabled`, or adding a new persisted flag.
- Validating or blocking Save for half-filled starters (the `docs/TECH_DEBT.md` item stays open).
- Truncating saved labels longer than 30 characters.

## Alternatives considered

- *Keep the inline section and only add reordering* (conservative baseline). Smallest diff, but it doesn't match the design. Rejected.
- *Reorder with the kit's `DialDraggableItem`.* We can't provide its drag-and-drop context, and it has no keyboard support. Rejected; possible upstream kit ask.
- *Native HTML5 drag events plus move-up/down buttons.* No new dependency, but we'd own more code for drag previews, touch and announcements. Rejected in favour of dnd-kit's tested keyboard sensor.
- *Edit starters in place in the Add-ons card.* No modal, but the settings would be orphaned in the card and the design wouldn't match. Rejected.

## Acceptance criteria

- The main column no longer renders a Conversation starters section. Add-ons ends with a Conversation starters row.
- An app with no starters shows the row description and **+ Add**. An app with starters shows them in saved order with a **Manage** action and no description.
- Add or Manage opens the modal titled "Set up conversation starters" with the current values. Close, × and Escape leave the form clean and unchanged.
- In the modal: typing into the last row appends a blank row. Labels stop at 30 characters, and the counter shows `16/30` for a 16-character label. Dragging row 2 above row 1 (mouse or keyboard) and pressing Save saves the starters in the new order.
- Settings are disabled with the hint until a draft starter has a label and a prompt. Save writes the same `conversation_starters` JSON as today for the same values.
- Read-only or shared application: Add and Manage are disabled and show the shared-application tooltip. The list stays visible.
- RTL: the handle sits at the start (right), the counter at the end of the label input, the delete icon isn't mirrored, and the rows run right to left.

## Capabilities

### New Capabilities
<!-- none -->

### Modified Capabilities
- `application_conversation-starters`: the section becomes an Add-ons row with a read-only list and Add/Manage. Editing moves to a modal with a draft and Save/Close, drag reordering, and the 30-character label limit with counter. Settings are renamed (Intro message, Require a starter to start a new chat, When starter is selected). State moves off the react-hook-form bridge.
- `application_editor-layout`: the Add-ons section also contains the Conversation starters row ("Add-ons section groups add-on controls"). The main column no longer renders a starters section.

## Impact

- **Code:**
  - New `src/components/ConversationStarters/ConversationStartersRow.tsx`, `ConversationStartersModal.tsx` and `SortableStarterRow.tsx` (+ tests).
  - New pure helpers in `src/utils/conversation-starters.ts`.
  - Changed: `AddOnsSection.tsx`, `QuickApp2Form.tsx`, `QuickApp2FormLegacyFields.tsx` (drop the four fields and the section).
  - Deleted: `ConversationStartersSection.tsx`, `ConversationStartersField.tsx` and `StartersBehaviourRadioGroup.tsx`, with their tests.
- **Dependencies:** adds `@dnd-kit/core`, `@dnd-kit/sortable` and `@dnd-kit/utilities` (MIT, no peer dependencies besides React).
- **API / host / auth:** none. The save mapping in `src/form/quickApp2Form.ts:261-303` is unchanged and no new chat-api call is made.
- **i18n (`quickAppEditor`):**
  - New keys: `SetUpConversationStarters`, `CloseConversationStarters`, `ConversationStartersAddOnDescription`, `Manage`, `ButtonLabel`, `IntroMessage`, `RequireStarterToStartNewChat`, `RequireStarterToStartNewChatDescription`, `WhenStarterIsSelected`, `SendPromptToTheChat`, `ReorderStarter`, `DeleteStarter`, plus the drag announcement keys (`StarterDragInstructions`, `StarterPickedUp`, `StarterMovedOver`, `StarterDropped`, `StarterDragCancelled`).
  - Changed: `Settings` is reused as the modal's settings heading. `PromptToSendInChat` changes to "Prompt to send in chat".
  - Removed, if nothing else uses them: `IntroText`, `OptionalTextShownAboveTheStarters`, `StartersBehavior`, `StartersSettings`, `DisableChatInput`, `DisableChatInputSoUsersCanOnlyUseStarters`, `ImmediatelySendPrompt`, `ButtonTitleTravelTips`, `StartersDescription`.
- **RTL:**
  - Rows use flex with logical spacing, so handle → label → prompt → delete flips with `dir`.
  - The counter is the `Input` postfix, which sits at the logical end.
  - The grip, message, pencil and trash icons are symmetric, so none are mirrored.
  - Keyboard reordering uses Up/Down arrows, which don't depend on direction.
- **Rollback:** revert the commit and remove the dnd-kit dependencies. The saved data shape is identical in both directions.
