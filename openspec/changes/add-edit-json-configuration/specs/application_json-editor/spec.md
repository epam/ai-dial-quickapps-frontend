# Spec Delta

## Purpose

Lets advanced users view and edit the QuickApp configuration as raw JSON in a popup opened from the editor, saving only valid JSON from the popup into the editor form state so the Instruction, Add-ons and Configuration UI reflect it.

## ADDED Requirements

### Requirement: Edit JSON entry point

The editor SHALL render an **Edit JSON** link button with a `</>` icon in the Configuration footer (see `application_editor-layout`). The label SHALL be translated through `ApplicationEditorI18nKeys.EditJson`. Activating it SHALL open the Edit JSON popup.

#### Scenario: Open the popup

- **WHEN** the user clicks Edit JSON, or presses Enter or Space while it is focused
- **THEN** a modal popup titled `ApplicationEditorI18nKeys.EditJsonTitle` SHALL open with focus moved into it
- **AND** closing it SHALL return focus to the link

#### Scenario: Available for every application

- **WHEN** the application is new, existing or shared with the user
- **THEN** the link SHALL be shown and the JSON SHALL be editable (see `application_editor-layout`, "Shared application")

### Requirement: JSON document reflects the current configuration

Each time the popup opens it SHALL show, pretty-printed with two-space indentation in a syntax-highlighting code editor, the JSON the editor would save for the current form values: the application configuration (orchestrator model, temperature and system prompt, contexts, tool sets, skills, conversation starters, features) plus `input_attachment_types` and `max_input_attachments`. It SHALL NOT contain name, description, version, avatar or tags. Unsaved form edits SHALL be included, and so SHALL every key of the stored configuration that the form has no field for (extra keys, at any depth, including top-level ones), so the document represents the real current state.

#### Scenario: Current values shown

- **WHEN** the user has changed the instructions without saving and opens Edit JSON
- **THEN** `orchestrator.system_prompt.content` in the JSON SHALL hold the changed instructions

#### Scenario: Stored extra keys shown

- **WHEN** the loaded configuration has `my_section: { "a": 1 }` and `orchestrator.custom_flag: true`, and the user opens Edit JSON
- **THEN** the JSON SHALL contain `my_section` and `orchestrator.custom_flag` as stored

#### Scenario: Properties without a form field are shown

- **WHEN** the stored configuration has `orchestrator.max_iterations`, `orchestrator.propagate_stages`, `orchestrator.tool_discovery`, `orchestrator.deployment.name`, `tool_defaults` or `features.stage_display`
- **THEN** every one of them SHALL appear in the JSON at its stored position and value
- **AND** a property that has no form field and is not stored SHALL NOT be added with a default value
- **AND** `orchestrator.deployment.parameters` SHALL show the other stored parameters (for example `top_p`, `seed`) next to `temperature`

#### Scenario: Temperature follows the save rules

- **WHEN** the selected model supports temperature
- **THEN** `orchestrator.deployment.parameters.temperature` SHALL show the form value, which is `0.5` when none is stored (the value a save would write)
- **WHEN** the selected model is loaded and does not support temperature
- **THEN** `temperature` SHALL be absent while other stored parameters remain

#### Scenario: Metadata excluded

- **WHEN** the popup opens
- **THEN** the JSON SHALL contain no name, description, version, avatar or tags

#### Scenario: Theme and direction

- **WHEN** the app theme is dark or the document direction is `rtl`
- **THEN** the code editor SHALL use the matching dark theme and the popup layout SHALL follow the direction, while the JSON text remains left-to-right

### Requirement: Only valid JSON can be saved

The popup SHALL have a Save button and a Cancel button (`ButtonsI18nKeys`). Save SHALL be disabled while the text is not valid. Valid means: it parses as JSON, the root is an object, the content maps to the editor form without type errors, and the result passes the editor's own form validation (for example non-blank instructions, an existing model that supports tools, attachment types when attachments are on). While invalid, the popup SHALL show the error messages in an alert region.

#### Scenario: Syntax error

- **WHEN** the text is `{ "orchestrator": ` (incomplete)
- **THEN** Save SHALL be disabled
- **AND** an error message naming the JSON syntax problem SHALL be shown

#### Scenario: Not an object

- **WHEN** the text is `[]` or `"x"`
- **THEN** Save SHALL be disabled and an error SHALL state that the root must be a JSON object

#### Scenario: Form validation failure

- **WHEN** the JSON is syntactically valid but `orchestrator.system_prompt.content` is empty
- **THEN** Save SHALL be disabled and the `ApplicationEditorI18nKeys.InstructionsRequired` message SHALL be shown

#### Scenario: Error clears

- **WHEN** the user fixes the text so it becomes valid
- **THEN** the error messages SHALL disappear and Save SHALL be enabled

### Requirement: Saving the popup updates the editor form

The popup's Save SHALL write the values read from the JSON into the editor form state (instructions, model, temperature, add-ons, skills, contexts, conversation starters, attachment settings, feature switches) and close the popup. The Instruction, Add-ons and Configuration sections SHALL show the new values, the form SHALL be dirty only if the values differ from the last saved ones, and nothing SHALL be sent to chat-api until the user saves the application as usual (the popup's Save is not the application's Save). Keys of the JSON that the form has no field for ("extra keys", at any depth outside the modelled values) SHALL be kept in the form state when the popup is saved and SHALL be written as typed when the application is saved. The extra keys of the last saved popup document SHALL replace any earlier ones, so removing an extra key in the JSON and saving the popup removes it from the saved configuration.

#### Scenario: UI reflects the saved JSON

- **WHEN** the user changes the model id and removes a skill in the JSON and clicks the popup's Save
- **THEN** the Default model block SHALL show the new model and the Skills row SHALL no longer list the removed skill

#### Scenario: Application save after the popup's Save

- **WHEN** the user saves valid JSON in the popup and then saves the application
- **THEN** the saved configuration SHALL equal the values saved in the popup through the normal save path, with no extra chat-api request

#### Scenario: Feature switches follow host settings

- **WHEN** the JSON enables a feature the host setting disallows (for example Code Interpreter while `isCodeInterpreterEnabled` is off)
- **THEN** the form SHALL keep that feature off, as it does on load

#### Scenario: Extra keys survive the popup Save and the application save

- **WHEN** the user adds `"features": { "custom_flag": true }` and `"my_section": { "a": 1 }` to the JSON, clicks the popup's Save, and then saves the application
- **THEN** the saved configuration SHALL contain `features.custom_flag` and `my_section` exactly as typed
- **AND** reopening Edit JSON before saving SHALL show them in the document

#### Scenario: Form edits win over the JSON

- **WHEN** the user saves JSON with extra keys in the popup and then changes the model in the form
- **THEN** the saved configuration SHALL contain the new model and still contain the extra keys

#### Scenario: Extra key removed

- **WHEN** the application has an extra key, the user deletes it in the JSON and clicks the popup's Save, then saves
- **THEN** the saved configuration SHALL NOT contain that key

#### Scenario: Metadata untouched

- **WHEN** the user saves the popup
- **THEN** name, description, version, avatar and tags SHALL be unchanged

### Requirement: Cancel leaves the configuration unchanged

Cancel, the popup's close button and Escape SHALL close the popup and discard the draft without changing the form. Reopening SHALL show the current form values, not the discarded draft.

#### Scenario: Discard edits

- **WHEN** the user types changes and clicks Cancel
- **THEN** the form values SHALL be unchanged
- **AND** reopening the popup SHALL show the unchanged configuration

### Requirement: Accessibility and i18n

All visible strings and `aria-label`s SHALL come from translation keys. The popup SHALL be keyboard operable, trap focus while open, and expose validation errors with `role="alert"`; the code editor SHALL have an accessible label (`ApplicationEditorI18nKeys.EditJsonEditorLabel`).

#### Scenario: Keyboard

- **WHEN** the user opens the popup from the keyboard
- **THEN** Tab SHALL cycle only through the popup's controls and Escape SHALL close it

### Requirement: State ownership, requests and presentation

The editor form state (`useQuickApp2Form`, owned by `QuickApp2Form`) SHALL own the saved JSON values, including the form-only `extraConfig` (the stored configuration without the leaves the form owns); `QuickApp2Form` SHALL own whether the popup is open and the document it was opened with, and the popup SHALL own its draft text. Edit JSON SHALL make no chat-api request and no host message of its own: values reach chat-api only through the editor's normal save (`application_editing`). Its visible strings SHALL be `ApplicationEditorI18nKeys.EditJson` (`applicationEditor.editJson.link`, "Edit JSON"), `EditJsonTitle` (`applicationEditor.editJson.title`), `EditJsonEditorLabel` (`applicationEditor.editJson.editorLabel`), `EditJsonSyntaxError` (`applicationEditor.editJson.syntaxError`, with the parser message), `EditJsonRootMustBeObject` (`applicationEditor.editJson.rootMustBeObject`) and `EditJsonInvalidStructure` (`applicationEditor.editJson.invalidStructure`), plus `ButtonsI18nKeys.Save` and `ButtonsI18nKeys.Cancel`. The link, the popup and the footer SHALL use logical placement only, the `</>` icon SHALL NOT be mirrored, and the JSON text SHALL stay left-to-right. The popup's document, parse result and handlers SHALL be memoised so typing re-parses only the draft, and the code editor SHALL be loaded lazily.

#### Scenario: Unchanged document leaves the form clean

- **WHEN** the user opens Edit JSON and saves the popup without changing the text
- **THEN** the form SHALL stay not dirty and the starters' ids SHALL be unchanged

#### Scenario: No request of its own

- **WHEN** the user saves the popup
- **THEN** no chat-api request SHALL be made until the editor's own Save
