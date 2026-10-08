# Spec Delta

## ADDED Requirements

### Requirement: Add-on details popups mirror the catalog details view

The skill, toolset and agent details popups SHALL keep the ui-kit `Popup` shell (Delete at the start, Close at the end of the footer) and SHALL lay out their content as the catalog `DetailsPanel` details view does, with the components it uses:

- **Identity:** a 52 px icon, the translated type caption, the name in `dial-body-semi-text` with the version, and the folder line drawn with the ui-kit `FolderPath` (`dial-tiny-text` segments, `dial-tiny-semi-text` leaf). The identity block is the ui-kit `EntityIdentity`, the localisable counterpart of the catalog's `EntityHeader`, because `EntityHeader` prints the untranslated entity type. The `FolderPath` accessible name SHALL be `quickAppEditor` `FolderPathAriaLabel`. A toolset's logged-out badge SHALL stay on the icon's bottom-end corner.
- **Actions:** the action buttons (credentials, Connection, Credentials) SHALL sit in a row under the identity, indented by the icon width plus its gap (`ps-[60px]`), as in the catalog header.
- **Sections:** the status banner, the tab row and the tab panel SHALL follow, separated by the catalog's 16 px gap.
- **Loading:** the loading indicator next to the tab row SHALL be the ui-kit `Skeleton` (one 72 px line) in a `role="status"` element labelled `quickAppEditor` `LoadingDetails`.
- **Markdown:** `AboutTab` and `ContentTab` SHALL receive `markdownLabels` translated through `quickAppEditor` (`MarkdownCopyCode`, `MarkdownCopiedCode`, `MarkdownDownloadCode`, `MarkdownTableScrollRegion`, `MarkdownMathScrollRegion`), so no catalog English default is shown.
- **Content files:** `ContentTab` SHALL receive the package files, the selection and the file-selector labels (`ContentFileSelectorAriaLabel`, `ContentFileCount`, `ContentFileLoading`, `ContentFileUnsupported`), as specified by `skills_catalog`.

#### Scenario: Toolset header

- **WHEN** the details popup opens for logged-out toolset `Figma` in `Organization / Design`
- **THEN** the header SHALL show a 52 px icon with the logged-out badge, the caption "Toolset", the name and the folder path "Organization / Design"
- **AND** the Log in button SHALL be under the identity, aligned with the name

#### Scenario: Loading skeleton

- **WHEN** details are loading
- **THEN** a skeleton line with accessible label `LoadingDetails` SHALL be shown next to the tab row

#### Scenario: Translated Markdown controls

- **WHEN** the About tab renders a code block
- **THEN** its copy control SHALL be labelled with `quickAppEditor` `MarkdownCopyCode`
