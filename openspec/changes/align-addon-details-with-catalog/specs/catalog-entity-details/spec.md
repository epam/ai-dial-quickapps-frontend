# Spec Delta

## ADDED Requirements

### Requirement: Add-on details popups mirror the catalog details view

The skill, toolset and agent details popups SHALL keep the ui-kit `Popup` shell (Delete at the start, Close at the end of the footer) and SHALL lay out their content as the catalog `DetailsPanel` details view does, with the components it uses:

- **Header:** the catalog `DetailsHeader` from `@epam/ai-dial-catalog`: a 52 px icon, the type caption, the name with the version and the folder path, and the action row. The caption SHALL be translated per entity type through `texts.entityTypeLabels` (`SkillTypeLabel`, `ToolsetTypeLabel`, `AgentTypeLabel`, `Model`). `DetailsHeader` SHALL show only the toolset credentials action (`toolsets_selection`); Use in chat, Share, Publish, Edit, Download and the Manage menu SHALL be hidden.
- **Actions this app owns** (agent Connection and Credentials) SHALL sit in a row under the header, indented by the icon width plus its gap (`ps-[60px]`).
- **Sections:** the status banner, the tab row and the tab panel SHALL follow, separated by the catalog's 16 px gap.
- **Loading:** the loading indicator next to the tab row SHALL be the ui-kit `Skeleton` (one 72 px line) in a `role="status"` element labelled `quickAppEditor` `LoadingDetails`.
- **Markdown:** `AboutTab` and `ContentTab` SHALL receive `markdownLabels` translated through `quickAppEditor` (`MarkdownCopyCode`, `MarkdownCopiedCode`, `MarkdownDownloadCode`, `MarkdownTableScrollRegion`, `MarkdownMathScrollRegion`), so no catalog English default is shown.
- **Content files:** `ContentTab` SHALL receive the package files, the selection and the file-selector labels (`ContentFileSelectorAriaLabel`, `ContentFileCount`, `ContentFileLoading`, `ContentFileUnsupported`), as specified by `skills_catalog`.

#### Scenario: Toolset header

- **WHEN** the details popup opens for logged-out toolset `Figma` in `Organization / Design`
- **THEN** the catalog header SHALL show a 52 px icon, the caption "Toolset", the name and the folder path "Organization / Design"
- **AND** its credentials action SHALL be Log in, with no other header action

#### Scenario: Loading skeleton

- **WHEN** details are loading
- **THEN** a skeleton line with accessible label `LoadingDetails` SHALL be shown next to the tab row

#### Scenario: Translated Markdown controls

- **WHEN** the About tab renders a code block
- **THEN** its copy control SHALL be labelled with `quickAppEditor` `MarkdownCopyCode`
