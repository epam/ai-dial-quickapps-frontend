# Spec Delta

## MODIFIED Requirements

### Requirement: Popup lists the Advanced Settings controls

The Advanced Settings popup body SHALL render, in this order: the Temperature slider (when available, see "Temperature in the popup"), a max attachments number input, a Time awareness switch, a Built-in file tools switch, the Allow orchestrator to process files switch (when available, see "Allow orchestrator to process files in the popup"), and then the Code Interpreter, Add attachment and Web fetch switches (when enabled, see "Feature toggles in the popup (editable)"). Each control SHALL show its translated label, and each control except the Temperature slider SHALL show its translated helper text.

#### Scenario: Controls and copy

- **WHEN** the Advanced Settings popup opens for a model that supports temperature and accepts attachments
- **THEN** it SHALL first show the Temperature slider labelled `ChatSettingsI18nKeys.TemperatureLabel`
- **AND** a number input labelled with `ApplicationEditorI18nKeys.AdvancedSettingsMaxAttachments` ("Maximum attachments amount user can add") and the hint `ApplicationEditorI18nKeys.AdvancedSettingsMaxAttachmentsHint` ("Valid only for the cases when attachments enabled for the agent") below it, with the placeholder `ApplicationEditorI18nKeys.AdvancedSettingsMaxAttachmentsPlaceholder` ("Enter the maximum number of attachments") while empty
- **AND** a switch labelled `ApplicationEditorI18nKeys.AdvancedSettingsTimeAwareness` ("Time awareness") with the description `ApplicationEditorI18nKeys.AdvancedSettingsTimeAwarenessDescription` ("Gives the agent the current date and time, helping it understand references like \"today,\" deadlines, and schedules.")
- **AND** a switch labelled `ApplicationEditorI18nKeys.AdvancedSettingsBuiltInFileTools` ("Built-in file tools") with the description `ApplicationEditorI18nKeys.AdvancedSettingsBuiltInFileToolsDescription` ("Lets the agent browse, search, read, and edit files within the app's file context. Includes write access, so worth reviewing for agents handling sensitive files.")
- **AND** a switch labelled `ApplicationEditorI18nKeys.AdvancedSettingsProcessFiles` with the description `ApplicationEditorI18nKeys.AdvancedSettingsProcessFilesDescription`
- **AND** any enabled feature toggles after it, in the order Code Interpreter, Add attachment, Web fetch
- **AND** no visible string in the popup body SHALL be hardcoded in the component

#### Scenario: Conditional controls absent

- **WHEN** the popup opens for a loaded model with no temperature support and no `inputAttachmentTypes`, and no host feature setting is enabled
- **THEN** the body SHALL show only the max attachments input, the Time awareness switch and the Built-in file tools switch, in that order

#### Scenario: Max attachments hint is informational

- **WHEN** the application has no attachment types configured
- **THEN** the max attachments input SHALL remain editable
- **AND** its value SHALL be kept and saved as entered

## REMOVED Requirements

### Requirement: Feature toggles in the popup

**Reason**: The editor has no read-only mode, so the read-only scenarios and wording of this requirement no longer apply. OpenSpec cannot drop a scenario from a MODIFIED block, so the requirement is re-added under a renamed title.
**Migration**: See the renamed requirement in the ADDED section below; its behaviour is otherwise unchanged.

## ADDED Requirements

### Requirement: Feature toggles in the popup (editable)

The popup SHALL show, after the existing switches, a Code Interpreter switch when the host setting `isCodeInterpreterEnabled` is on, an Add attachment switch when `isAddAttachmentEnabled` is on, and a Web fetch switch when `isWebFetchEnabled` is on. Each SHALL be a kit `Switch` presented like the Time awareness switch, labelled with the control's title and captioned with its description. A control whose setting is off SHALL NOT render.

#### Scenario: Copy

- **WHEN** all three host settings are on and the popup opens
- **THEN** a switch labelled `ApplicationEditorI18nKeys.CodeInterpreterTitle` ("Code Interpreter") SHALL show the caption `ApplicationEditorI18nKeys.CodeInterpreterDescription`
- **AND** a switch labelled `ApplicationEditorI18nKeys.AdvancedSettingsAddAttachment` ("Add attachment") SHALL show the caption `ApplicationEditorI18nKeys.AdvancedSettingsAddAttachmentDescription`
- **AND** a switch labelled `ApplicationEditorI18nKeys.AdvancedSettingsWebFetch` ("Web fetch") SHALL show the caption `ApplicationEditorI18nKeys.AdvancedSettingsWebFetchDescription`
- **AND** no "Allow the agent to ..." inline label SHALL be rendered

#### Scenario: Host setting off

- **WHEN** a host setting is off
- **THEN** the matching switch SHALL NOT render
- **AND** its saved form value SHALL be `false`, as before
