# Application Conversation Starters Specification

## Purpose

Defines the Quick App editor's Conversation starters section: the starters list, the starters settings (intro text, starters behaviour, disable chat input), how those settings are gated on a complete starter and on the read-only state, and how the values load from and save to `application_properties.conversation_starters`. State is the editor form state (`useQuickApp2Form`); no chat-api endpoint of its own.

## Requirements

### Requirement: Conversation starters section

The editor SHALL present a collapsible **Conversation starters** section titled with `quickAppEditor` key `ConversationStarters` and described by `StartersDescription`. It SHALL contain the starters list followed by **Starters settings**. Values SHALL be the editor form state fields `starters`, `introText`, `autoSubmit` and `chatMessageInputDisabled` (`useQuickApp2Form`, bridged into the section's react-hook-form controls by `QuickApp2FormLegacyFields` until the react-hook-form removal completes). No new context is introduced and no memoisation is required beyond the section's `memo`.

This capability calls no chat-api endpoint of its own; values load from and save to `application_properties.conversation_starters` through the existing application load and save.

#### Scenario: Collapsed by default

- **WHEN** the editor first renders
- **THEN** the section header SHALL be a control with `aria-expanded="false"` and the section content SHALL NOT be rendered
- **AND** activating the header SHALL expand the section and set `aria-expanded="true"`

#### Scenario: Section content

- **WHEN** the section is expanded
- **THEN** it SHALL show the starters list, then a `StartersSettings` ("Starters settings") heading with the hint `AtLeastOneStarterIsRequiredToEnableSettings` below it, then the Intro text field, the Starters behavior choice and the Disable chat input switch

### Requirement: Starters list

Each starter SHALL be a row with a title input (placeholder `ButtonTitleTravelTips`) and a prompt input (placeholder `PromptToSendInChat`) followed by a delete button. The list SHALL always end with one blank row.

#### Scenario: New application

- **WHEN** the application has no saved starters
- **THEN** the list SHALL show a single blank row

#### Scenario: Typing into the last row

- **WHEN** the user types into the title or prompt of the last row
- **THEN** a new blank row SHALL be appended below it

#### Scenario: Leading whitespace

- **WHEN** the first character typed into an empty title or prompt is whitespace
- **THEN** it SHALL be discarded

#### Scenario: Deleting a starter

- **WHEN** the user activates the delete button of a row that is not the last
- **THEN** that row SHALL be removed
- **AND** the last (blank) row's delete button SHALL be invisible and disabled

#### Scenario: Read-only application

- **WHEN** the editor is read-only or the application is shared
- **THEN** every input and delete button in the list SHALL be disabled

### Requirement: Starters settings gating

The starters settings (Intro text, Starters behavior, Disable chat input) SHALL be enabled only when at least one starter has both a non-blank title and a non-blank prompt, and the editor is not read-only.

#### Scenario: No complete starter

- **WHEN** no starter has both a non-blank title and a non-blank prompt
- **THEN** the three settings SHALL be disabled
- **AND** each SHALL expose the hint `AtLeastOneStarterIsRequiredToEnableSettings` ("At least one starter is required to enable settings")

#### Scenario: Complete starter added

- **WHEN** a starter has title "Travel tips" and prompt "Can you suggest some travel destinations?"
- **THEN** the three settings SHALL be enabled and show no hint

#### Scenario: Shared application

- **WHEN** the application is shared
- **THEN** the three settings SHALL be disabled
- **AND** each SHALL expose the shared-application hint (`CannotChangeSharedApp` with context `field`) instead of the starter hint

### Requirement: Starters settings controls

The settings SHALL be:

- **Intro text** — an input labelled `IntroText` with an info caption `OptionalTextShownAboveTheStarters` and placeholder `EnterIntroText`;
- **Starters behavior** — a `StartersBehavior` group of two radio buttons, `ImmediatelySendPrompt` (sets `autoSubmit` to `true`) and `PopulatePromptInTheChatInput` (sets `autoSubmit` to `false`);
- **Disable chat input** — a `DisableChatInput` heading and the kit's `Switch` labelled `DisableChatInputSoUsersCanOnlyUseStarters`, bound to `chatMessageInputDisabled`; its hint (starter or shared-application hint) SHALL be exposed through an info button next to the switch label.

#### Scenario: Defaults

- **WHEN** an application without saved `conversation_starters` is loaded
- **THEN** Intro text SHALL be empty, Starters behavior SHALL be "Immediately send prompt" and Disable chat input SHALL be off

#### Scenario: Populate prompt with chat input disabled

- **WHEN** Starters behavior is "Populate prompt in the chat input" and Disable chat input is on
- **THEN** both values SHALL be kept and saved as chosen
- **AND** no warning SHALL be shown next to the switch (the former "Pay attention: the user won't be able to edit the populated input prompt" warning was removed deliberately)

### Requirement: Saving conversation starters

On save, the section's values SHALL be written to `application_properties.conversation_starters`.

#### Scenario: Starters present

- **WHEN** the starters are `[{ title: "Travel tips", text: "Suggest destinations" }, { title: "", text: "" }]`, Intro text is "Hi!", behaviour is "Populate prompt in the chat input" and Disable chat input is on
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

- **WHEN** Intro text is empty
- **THEN** `intro_text` SHALL be omitted

#### Scenario: No starters

- **WHEN** every starter row is blank
- **THEN** `conversation_starters` SHALL be saved as `null`

### Requirement: Conversation starters direction support

The section SHALL follow the document direction.

#### Scenario: Right-to-left locale

- **WHEN** `document.documentElement.dir` is `rtl`
- **THEN** each starter row SHALL run title, prompt, delete button from right to left
- **AND** radio buttons and the switch SHALL be at the start (right) of their labels
- **AND** the delete (trash) icon SHALL NOT be mirrored
