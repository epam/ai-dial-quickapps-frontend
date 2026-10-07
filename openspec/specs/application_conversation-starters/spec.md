# Application Conversation Starters Specification

## Purpose

Defines the Quick App editor's Conversation starters add-on: the Add-ons row that summarises the saved starters, and the Set up conversation starters modal that edits them — the starters list (with reordering and label length), the starters settings (intro message, require a starter, starter behaviour), how those settings are gated on a complete starter, and how the values load from and save to `application_properties.conversation_starters`. State is the editor form state (`useQuickApp2Form`), with the modal holding a local draft until Save; no chat-api endpoint of its own.

## Requirements

### Requirement: Conversation starters add-on row

The Add-ons section SHALL contain a **Conversation starters** row, titled with the `quickAppEditor` key `ConversationStarters`, rendered after the other Add-ons rows. The row's content SHALL be driven by the editor form state field `starters` owned by `useQuickApp2Form`; the row SHALL hold only the modal's open/closed flag in local component state. It SHALL introduce no context and call no chat-api endpoint. The row component SHALL be wrapped in `memo`, and the callbacks it receives from `QuickApp2Form` SHALL be stable (`useCallback`) so that typing in unrelated fields does not re-render the starters list.

A starter is **saved-visible** when its title or its prompt is non-blank (the same rows that are persisted, see "Saving conversation starters").

#### Scenario: No starters

- **WHEN** the application has no saved-visible starter
- **THEN** the row SHALL show its description `ConversationStartersAddOnDescription` ("Pre-built prompts shown at conversation start to help users get going quickly.")
- **AND** the row header SHALL show an **Add** action labelled with the `common` key `Add` and a plus icon
- **AND** no starters list SHALL be rendered

#### Scenario: Starters present

- **WHEN** the application has the starters `[{ title: "Visual hierarchy", text: "Analyze visual hierarchy on the page:" }, { title: "WCAG 2.0 compatibility", text: "Analyze WCAG 2.0 compatibility" }]`
- **THEN** the row SHALL NOT show its description
- **AND** the row header SHALL show a **Manage** action labelled with `quickAppEditor` key `Manage` and a pencil icon, in place of Add
- **AND** the row SHALL list both starters in saved order, each with a message icon, the title in semibold primary text and the prompt in secondary text on a single line truncated with an ellipsis
- **AND** a starter with a blank title SHALL show only its prompt line, and a starter with a blank prompt SHALL show only its title line

#### Scenario: Add or Manage opens the modal

- **WHEN** the user activates Add or Manage in an editable editor
- **THEN** the Set up conversation starters modal SHALL open

#### Scenario: Read-only or shared application

- **WHEN** the editor is read-only or the application is shared
- **THEN** Add and Manage SHALL be disabled and SHALL expose the shared-application tooltip (`CannotChangeSharedApp` with context `field`) when the application is shared
- **AND** activating them SHALL NOT open the modal
- **AND** the starters list, when present, SHALL remain visible

### Requirement: Set up conversation starters modal

Add and Manage SHALL open a modal dialog (kit `Popup`) titled with `quickAppEditor` key `SetUpConversationStarters` ("Set up conversation starters"). It SHALL have a header close control named by `CloseConversationStarters`, a header divider, a footer divider, a **Close** footer action (`Close`, link appearance) and a **Save** footer action (`Save`, neutral). Its body SHALL contain the starters list followed by the starters settings.

On open, the modal SHALL seed a local draft from the current form values `starters`, `introText`, `autoSubmit` and `chatMessageInputDisabled`. Edits SHALL change only the draft. The modal SHALL change the form state only on Save.

#### Scenario: Open with existing values

- **WHEN** the modal opens for an application with one saved starter, Intro message "Hi!", "Populate prompt in the chat input" and Require a starter on
- **THEN** the list SHALL show that starter followed by one blank row
- **AND** the settings SHALL show the same Intro message, behaviour and switch values

#### Scenario: Close without saving

- **WHEN** the user edits the draft and then activates Close, the header close control, Escape or outside dismissal
- **THEN** the modal SHALL close
- **AND** no form value or dirty state SHALL change
- **AND** reopening the modal SHALL show the form values, not the discarded draft

#### Scenario: Save

- **WHEN** the user activates Save
- **THEN** the draft's `starters`, `introText`, `autoSubmit` and `chatMessageInputDisabled` SHALL be applied to the form in one update
- **AND** the modal SHALL close
- **AND** the form SHALL become dirty only if a value differs from before
- **AND** the modal itself SHALL make no chat-api request; persistence SHALL happen through the editor's existing save and auto-save

#### Scenario: Save without changes

- **WHEN** the user opens the modal and activates Save without editing
- **THEN** the form SHALL remain clean

### Requirement: Starters list

The modal's starters list SHALL show one row per draft starter. Each row SHALL have, in order: a drag handle, a title input (placeholder `ButtonLabel`), a prompt input (placeholder `PromptToSendInChat`, "Prompt to send in chat"), and a delete button with a trash icon. Rows SHALL be shown on a raised card surface. The list SHALL always end with one blank row.

#### Scenario: New application

- **WHEN** the modal opens for an application with no saved starters
- **THEN** the list SHALL show a single blank row

#### Scenario: Typing into the last row

- **WHEN** the user types into the title or prompt of the last row
- **THEN** a new blank row SHALL be appended below it

#### Scenario: Leading whitespace

- **WHEN** the first character typed into an empty title or prompt is whitespace
- **THEN** it SHALL be discarded

#### Scenario: Deleting a starter

- **WHEN** the user activates the delete button of a row that is not the last
- **THEN** that row SHALL be removed from the draft
- **AND** the last (blank) row's delete button SHALL be visible but disabled

### Requirement: Reordering starters

Each non-trailing starter row SHALL have a drag handle at its start. The user SHALL be able to reorder starters with a pointer (dragging the handle) and with the keyboard. The trailing blank row SHALL show a disabled handle and SHALL NOT be draggable or accept a drop; it SHALL always stay last.

#### Scenario: Pointer reorder

- **WHEN** the draft has starters A, B, C (plus the blank row) and the user drags B's handle above A
- **THEN** the draft order SHALL become B, A, C, blank

#### Scenario: Keyboard reorder

- **WHEN** the user focuses B's handle, presses Space, presses ArrowUp, then presses Space
- **THEN** the draft order SHALL become B, A, C, blank
- **AND** pressing Escape instead of the second Space SHALL cancel the move and keep A, B, C

#### Scenario: Reorder announcements

- **WHEN** a keyboard or assistive-technology user picks up, moves, drops or cancels a starter
- **THEN** a live region SHALL announce it using `StarterPickedUp`, `StarterMovedOver`, `StarterDropped` or `StarterDragCancelled` with the starter's position
- **AND** the handle SHALL be described by `StarterDragInstructions`

#### Scenario: Order is saved

- **WHEN** the user reorders to B, A, C and saves the modal and then the application
- **THEN** `conversation_starters.starters` SHALL be written in the order B, A, C

### Requirement: Starter label length

The starter title input SHALL accept at most 30 characters. While the title is non-empty, the input SHALL show a `n/30` counter at its logical end, where `n` is the current length. A title loaded with more than 30 characters SHALL be shown unchanged, its counter SHALL use error styling, it SHALL accept no further characters, and Save SHALL NOT be blocked.

#### Scenario: Counter while typing

- **WHEN** the title is "Visual hierarchy"
- **THEN** the counter SHALL read `16/30`

#### Scenario: Limit reached

- **WHEN** the title has 30 characters and the user types another character
- **THEN** the title SHALL stay at 30 characters

#### Scenario: Empty title

- **WHEN** the title is empty
- **THEN** no counter SHALL be shown and the placeholder `ButtonLabel` ("Button label") SHALL be shown

#### Scenario: Legacy long title

- **WHEN** an application is loaded with a 42-character starter title
- **THEN** the modal SHALL show the full title with the counter `42/30` in error styling
- **AND** saving without editing it SHALL keep all 42 characters

### Requirement: Starters settings gating

The modal's starters settings (Intro message, Require a starter to start a new chat, When starter is selected) SHALL be enabled only when at least one draft starter has both a non-blank title and a non-blank prompt. The gating SHALL follow the draft live, not the saved form value.

#### Scenario: No complete starter

- **WHEN** no draft starter has both a non-blank title and a non-blank prompt
- **THEN** the three settings SHALL be disabled
- **AND** the hint `AtLeastOneStarterIsRequiredToEnableSettings` ("At least one starter is required to enable settings.") SHALL be shown below the Settings heading
- **AND** each setting SHALL also expose that hint itself, as before the redesign: Intro message as the disabled input's tooltip, Require a starter and When starter is selected through an info button next to their labels

#### Scenario: Complete starter added

- **WHEN** the user types title "Travel tips" and prompt "Can you suggest some travel destinations?" into a draft row
- **THEN** the three settings SHALL become enabled without saving the modal
- **AND** they SHALL no longer expose the starter hint

#### Scenario: Complete starter removed

- **WHEN** the user deletes the only complete draft starter
- **THEN** the three settings SHALL become disabled again
- **AND** their current draft values SHALL be kept

### Requirement: Starters settings controls

Below the list, the modal SHALL show a **Settings** heading (`quickAppEditor` key `Settings`) with the gating hint, followed by:

- **Intro message**: an input labelled `IntroMessage` with placeholder `EnterIntroText` ("e.g., What do you want to talk about?"), bound to `introText`;
- **Require a starter to start a new chat**: the kit `Switch` labelled `RequireStarterToStartNewChat` with caption `RequireStarterToStartNewChatDescription` ("Disables the chat input on a new chat until the user picks a starter. Typing works normally after that."), bound to `chatMessageInputDisabled`;
- **When starter is selected**: a kit `RadioGroup` labelled `WhenStarterIsSelected` with two options, `SendPromptToTheChat` ("Send prompt to the chat", sets `autoSubmit` to `true`) and `PopulatePromptInTheChatInput` (sets `autoSubmit` to `false`).

#### Scenario: Defaults

- **WHEN** an application without saved `conversation_starters` is loaded
- **THEN** Intro message SHALL be empty, When starter is selected SHALL be "Send prompt to the chat" and Require a starter SHALL be off

#### Scenario: Populate prompt with chat input disabled

- **WHEN** When starter is selected is "Populate prompt in the chat input" and Require a starter is on
- **THEN** both values SHALL be kept and saved as chosen
- **AND** no warning SHALL be shown next to the switch

### Requirement: Saving conversation starters

On save, the starters form values SHALL be written to `application_properties.conversation_starters`, with `starters` in list order.

#### Scenario: Starters present

- **WHEN** the starters are `[{ title: "Travel tips", text: "Suggest destinations" }, { title: "", text: "" }]`, Intro message is "Hi!", When starter is selected is "Populate prompt in the chat input" and Require a starter is on
- **THEN** the save SHALL write:

```json
{
  "conversation_starters": {
    "intro_text": "Hi!",
    "chat_message_input_disabled": true,
    "auto_submit": false,
    "starters": [{ "title": "Travel tips", "text": "Suggest destinations" }]
  }
}
```

#### Scenario: Partially filled starter

- **WHEN** a starter has a title but a blank prompt (or the reverse)
- **THEN** it SHALL still be saved (only rows blank in both fields are dropped), even though it does not enable the settings

#### Scenario: Empty intro text

- **WHEN** Intro message is empty
- **THEN** `intro_text` SHALL be omitted

#### Scenario: No starters

- **WHEN** every starter row is blank
- **THEN** `conversation_starters` SHALL be saved as `null`

### Requirement: Conversation starters localization and accessibility

Every user-visible string of the row and modal SHALL be translated through the `quickAppEditor` namespace (except `Add`, from `common`). No visible label SHALL be hardcoded.

#### Scenario: Keyboard and screen-reader access

- **WHEN** a keyboard user reaches the Conversation starters row
- **THEN** Add or Manage SHALL be a keyboard-reachable button
- **AND** the open modal SHALL expose a dialog role named by `SetUpConversationStarters`, with focus managed by the kit `Popup`
- **AND** each row's handle SHALL be a focusable button named by `ReorderStarter` (with the starter's title interpolated, falling back to its position), each delete button SHALL be named by `DeleteStarter`, and the title and prompt inputs SHALL have accessible names from `ButtonLabel` and `PromptToSendInChat`
- **AND** the Settings heading SHALL be a heading element, and the radio options SHALL form a radio group named by `WhenStarterIsSelected`

### Requirement: Conversation starters direction support

The row and the modal SHALL follow the document direction.

#### Scenario: Right-to-left locale

- **WHEN** `document.documentElement.dir` is `rtl`
- **THEN** each modal row SHALL run handle, title, prompt, delete button from right to left
- **AND** the `n/30` counter SHALL be at the logical end (left) of the title input
- **AND** in the Add-ons row, the message icon SHALL be at the start (right) of each starter and Add/Manage at the logical end
- **AND** radio buttons and the switch SHALL be at the start (right) of their labels
- **AND** the grip, message, pencil and trash icons SHALL NOT be mirrored
- **AND** keyboard reordering SHALL use ArrowUp/ArrowDown regardless of direction
