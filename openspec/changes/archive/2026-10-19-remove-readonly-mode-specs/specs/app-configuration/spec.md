# Spec Delta

## MODIFIED Requirements

### Requirement: Feature flags gate the Advanced Settings switches

`isCodeInterpreterEnabled`, `isWebFetchEnabled` and `isAddAttachmentEnabled` SHALL decide whether the Code Interpreter, Web fetch and Add attachment switches are offered, as specified in `application_advanced-settings` ("Feature toggles in the popup (editable)"). In addition, when a flag is off, the editor form (`useQuickApp2Form` in `src/hooks/use-quick-app2-form.ts`, fed from `AppContext.settings` by `src/components/QuickApp2Form/QuickApp2Form.tsx`) SHALL set the matching form value (`codeInterpreter`, `webFetch`, `addAttachment`) to `false` in both its current and initial values, so the change does not mark the form dirty. This is intended: the next save writes the feature as disabled, so a feature the deployment does not offer (or a failed client-config request) removes it from the stored application. When a flag is on, the form value SHALL be the one read from the stored application. RTL impact: covered by `application_advanced-settings`.

#### Scenario: Flag off clears the stored value without dirtying the form

- **WHEN** the stored application has web fetch enabled (`application_properties.features.web_fetch.enabled: true`)
- **AND** the settings have `isWebFetchEnabled: false`
- **THEN** the form value `webFetch` SHALL be `false`
- **AND** the form SHALL NOT be dirty
- **AND** the Web fetch switch SHALL NOT be rendered in the Advanced Settings popup

#### Scenario: Flag on keeps the stored value

- **WHEN** the stored application has web fetch enabled
- **AND** the settings have `isWebFetchEnabled: true`
- **THEN** the form value `webFetch` SHALL be `true`
