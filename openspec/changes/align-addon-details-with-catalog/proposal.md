# Proposal

## Why

The skill, toolset and agent details popups already render the catalog's tab components, but the rest of the view is this app's own: a 40 px `EntityIdentity` with a hand-built folder line, actions as a loose row in the body, a spinner while loading, catalog English defaults in Markdown controls, and a skill's Details tab without the package file selector. In the DIAL chat catalog the same entity reads differently. The ask is that the details look and behave as in the catalog, keeping the popup shell (user decision: keep the popup, mirror the catalog, use the catalog's components).

## What Changes

- `AddOnDetailsPopup` (`src/components/common/AddOnDetailsPopup/AddOnDetailsPopup.tsx`) lays out the identity, actions, banner, tabs and panel as `DetailsPanel`'s details view: 52 px icon, ui-kit `FolderPath`, actions indented under the name, 16 px section gap, `Skeleton` loading indicator.
- `AboutTab` and `ContentTab` get translated `markdownLabels`.
- A skill's Details tab gets the catalog file selector: files from `promptContent.files`, other files loaded through `onLoadContentFile` from `useCatalogItemDetails` and shown as Markdown; selection state in a new hook.
- Popup shell, footer (Delete / Close), tabs order, data fetching and actions semantics are unchanged.

Alternatives considered: (a) use the catalog `DetailsPanel` itself — rejected by the user: it is a side drawer, and its Delete deletes the entity (owners only, behind Manage) while ours removes it from the app; (b) the catalog `EntityHeader` for identity — rejected: it prints the untranslated entity type; the ui-kit `EntityIdentity` is the localisable equivalent with the same structure; (c) the chat app's `SkillContentFileTree` renderer — not available as a library; the catalog's built-in tree is used.

Not breaking: no request, id or persisted field changes. Rollback: revert the change.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `catalog-entity-details`: adds the layout requirement mirroring the catalog details view.
- `skills_catalog`: the Details tab shows the package file selector; the loading indicator is no longer described as a spinner.

## Impact

- Changed: `AddOnDetailsPopup.tsx`, `src/hooks/use-entity-details.ts` (exposes `onLoadContentFile`), new `src/hooks/use-content-file-selection.ts`, `src/hooks/use-catalog-details-labels.ts`, `src/types/entity-details.ts`, `src/constants/i18n.ts`, `src/i18n/locales/quick-app-editor.json`, the three popups (`SkillDetailsPopup`, `ToolsetDetailsPopup`, `AgentDetailsPopup`) only if their props change, and tests.
- No new dependency.
- RTL: only logical classes (`ps-*`, `start-*`).
