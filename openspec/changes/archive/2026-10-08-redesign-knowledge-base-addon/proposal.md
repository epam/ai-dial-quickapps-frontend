# Proposal

## Why

The editor still shows "Context files" as a legacy form item in the Context & Tools card, with its own
look (zebra-striped rows, a raw tabler icon, a two-line name/directory layout, an always-visible trash
button and a bordered "No context files added" box). The Add-ons card has been redesigned around
`AddOnRow` and the target mock names this row **Knowledge base**, with the same title/description/`+ Add`
header as Skills, Agents & Toolsets and Conversation starters and a breadcrumb-style file list.
This is the "Knowledge base row" follow-up listed in `docs/TECH_DEBT.md` (Add-ons).

## What Changes

- Add a **Knowledge base** row to the Add-ons card, after Agents & Toolsets and before Conversation
  starters, built on `AddOnRow` (`src/components/AddOns/AddOnRow.tsx`): semibold row title, description
  "Documentation and resources for your agent." while empty, and the same `+ Add` neutral small button
  as the other rows.
- **Add** opens the same file-manager popup (`FileManagerModal`) the context-files control opens today;
  confirming adds the picked files/folders exactly as today (decoded, de-duplicated, appended).
- Redesign each added item as a single line: kit `FileIcon` (folder or file-type glyph) followed by the
  kit `Breadcrumbs` path (root → folders → name, last segment semibold, non-clickable, long paths
  collapsed behind an ellipsis).
- Each item gets a **trash button that is visible only on hover / keyboard focus**, and a subtle row
  hover background (same pattern as `ConversationStartersList`).
- Remove the "Context files" form item (and its `FilesSelector` control, empty box and strings) from
  Context & Tools. The toggles in that card (Code interpreter, Add attachment, Web fetch) stay.
- Move the `documentRelativeUrl` value out of the legacy react-hook-form bridge
  (`QuickApp2FormLegacyFields`) onto the value-prop path the other Add-ons rows already use, via the
  existing `addDocuments` / `removeDocument` actions of `useQuickApp2Form`.
- No change to what is persisted: still `application_properties.contexts` built from
  `documentRelativeUrl`, still single-encoded on save.

Alternatives considered: (a) restyle `FilesSelector` in place and keep it in Context & Tools — rejected,
the mock puts the row in Add-ons and it would keep a second, divergent row layout; (b) reuse
`AddOnRow` with a new row component (chosen) — matches Skills/Conversation starters and keeps one
header/button style. Folder-only `FolderPath` from the kit was rejected: it is folder-only and fixes
the icon and styling, but items can be files too.

Not breaking. Rollback: revert the change; persisted data is unaffected.

## Capabilities

### New Capabilities
- `application_knowledge-base`: the Knowledge base Add-ons row — header/Add action, empty and populated
  states, item presentation (icon + breadcrumb path), hover-revealed removal, read-only behaviour, and
  how items are added through the file-manager popup and persisted as context files.

### Modified Capabilities
- `application_editor-layout`: "Add-ons section groups add-on controls" gains the Knowledge base row in
  its row order and scenarios; "Advanced Settings controls live only in the popup" no longer lists
  context files among the controls Context and tools keeps.

## Impact

- New: `src/components/KnowledgeBase/` (row, list), `src/utils/` path-parsing helper + tests.
- Changed: `src/components/AddOns/AddOnsSection.tsx`, `src/components/QuickApp2Form.tsx`,
  `src/components/ContextAndTools/ContextAndToolsSection.tsx`,
  `src/components/QuickApp2FormLegacyFields/QuickApp2FormLegacyFields.tsx`, their tests,
  `src/constants/i18n.ts`, `src/i18n/locales/quick-app-editor.json`, `src/i18n/locales/common.json`.
- Removed: `src/components/common/FilesSelector/FilesSelector.tsx` (`FileManagerModal` and
  `UploadProgressModal` stay, reused unchanged).
- Docs: tick the Knowledge base item in `docs/TECH_DEBT.md` (the toolsets/agents split stays open).
- No new dependency (`Breadcrumbs`, `FileIcon` come from the installed `@epam/ai-dial-ui-kit`).
  No chat-api endpoint added or changed.
- i18n: new user-visible strings (row title/description, remove label, root labels) — see design.
- RTL: new UI; logical classes, kit `Breadcrumbs` chevron separator must mirror in RTL.
