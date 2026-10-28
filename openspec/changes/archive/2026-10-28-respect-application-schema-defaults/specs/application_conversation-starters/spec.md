## MODIFIED Requirements

### Requirement: Starters settings controls

Below the list, the modal SHALL show a **Settings** heading (`BasicI18nKeys.Settings`) with the gating hint, followed by:

- **Intro message**: an input labelled `ApplicationEditorI18nKeys.StartersIntroMessage` with placeholder `ApplicationEditorI18nKeys.StartersIntroMessagePlaceholder` ("e.g., What do you want to talk about?"), bound to `introText`;
- **Require a starter to start a new chat**: the kit `Switch` labelled `ApplicationEditorI18nKeys.StartersRequireStarter` with caption `ApplicationEditorI18nKeys.StartersRequireStarterDescription` ("Disables the chat input on a new chat until the user picks a starter. Typing works normally after that."), bound to `chatMessageInputDisabled`;
- **When starter is selected**: a kit `RadioGroup` labelled `ApplicationEditorI18nKeys.StartersWhenSelected` with two options, `ApplicationEditorI18nKeys.StartersSendPrompt` ("Send prompt to the chat", sets `autoSubmit` to `true`) and `ApplicationEditorI18nKeys.StartersPopulatePrompt` (sets `autoSubmit` to `false`).

For an application without stored `conversation_starters`, the initial values of `introText`, `chatMessageInputDisabled` and `autoSubmit` SHALL be the application type schema defaults (`application_editing`, "Application type schema defaults") when the schema provides them. Without a schema default, Intro message SHALL be empty, Require a starter SHALL be off and When starter is selected SHALL be "Send prompt to the chat". The initial values SHALL NOT mark the form dirty.

#### Scenario: Defaults

- **WHEN** an application without saved `conversation_starters` is loaded
- **AND** the schema provides no conversation starters defaults, or could not be read
- **THEN** Intro message SHALL be empty, When starter is selected SHALL be "Send prompt to the chat" and Require a starter SHALL be off

#### Scenario: Schema defaults

- **WHEN** an application without saved `conversation_starters` is loaded
- **AND** the schema defaults are `intro_text: "Select an action"`, `auto_submit: false` and `chat_message_input_disabled: true`
- **THEN** Intro message SHALL be "Select an action", When starter is selected SHALL be "Populate prompt in the chat input" and Require a starter SHALL be on

#### Scenario: Saved settings win

- **WHEN** an application with saved `conversation_starters` is loaded
- **THEN** the controls SHALL show the saved values, and the schema defaults SHALL NOT be applied to any of them

#### Scenario: Populate prompt with chat input disabled

- **WHEN** When starter is selected is "Populate prompt in the chat input" and Require a starter is on
- **THEN** both values SHALL be kept and saved as chosen
- **AND** no warning SHALL be shown next to the switch
