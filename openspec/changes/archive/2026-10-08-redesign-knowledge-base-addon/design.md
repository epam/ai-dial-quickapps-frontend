# Design

## Context

- Context files today: `ContextAndToolsSection` renders a `DialFormItem` "Context files" wrapping
  `FilesSelector` (`src/components/common/FilesSelector/FilesSelector.tsx`) through a react-hook-form
  `Controller` on `documentRelativeUrl`. `FilesSelector` owns the Add link, the empty box, the zebra
  list and the trash button, and renders `FileManagerModal` (the popup to reuse).
- The field reaches the editor through the legacy RHF bridge `QuickApp2FormLegacyFields`
  (`LEGACY_FIELDS` includes `documentRelativeUrl`). The other Add-ons rows already take value props
  from `useQuickApp2Form`, whose reducer already has `ADD_DOCUMENTS` (decode + de-dupe + append) and
  `REMOVE_DOCUMENT`, exposed as `addDocuments` / `removeDocument` (`src/hooks/use-quick-app2-form.ts:238`).
- Closest pattern: `ConversationStartersRow` + `ConversationStartersList` on `AddOnRow`
  (`src/components/ConversationStarters/ConversationStartersList.tsx:48` — `group` row, hover tint,
  opacity-revealed `GhostIconButton`, focus restore after removal). The Knowledge base row copies it.
- Stored ids are DIAL resource ids kept decoded in form state: `files/<bucket>/<dirs…>/<name>`, folders
  end in `/` (`resolveDialFileApiPath`, `src/utils/dial-file-path.ts`).
- Kit components (via MCP): `Breadcrumbs` (`items: {label, href?, onClick?, icon?}[]`, `maxVisibleItems`,
  `ariaLabel`, `itemClassName`; last item semibold/primary and never a control; items with no
  `href`/`onClick` render as plain text; never wraps, truncates with tooltip, collapses middle behind an
  ellipsis menu) and `FileIcon` (`type: DialItemType`, `name`, `decorative`, `size`).
  See `proposal.md` for motivation.

## Goals / Non-Goals

**Goals:**
- One Add-ons row, visually identical in header/button to its siblings, with the mock's item look.
- Keep persistence, de-duplication and the popup behaviour byte-for-byte the same.
- Take `documentRelativeUrl` off the RHF bridge.

**Non-Goals:**
- Changing `FileManagerModal`, upload, selection or the saved `contexts` shape.
- Splitting Agents & Toolsets into Toolsets/Agents rows (separate TECH_DEBT item).
- Navigating to a file from its breadcrumb (path is read-only).
- Renaming the `documentRelativeUrl` form field or the persisted property.

## Decisions

1. **New `KnowledgeBaseRow` on `AddOnRow`, placed between Agents & Toolsets and Conversation starters.**
   Files: `src/components/KnowledgeBase/KnowledgeBaseRow.tsx` (owns popup-open flag, renders
   `AddOnRow` + `FileManagerModal`) and `KnowledgeBaseList.tsx` (list + item). `AddOnRow` already gives the
   shared title/description/`+ Add` button, so "same as other add buttons" holds by construction.
   *Alternative:* restyle `FilesSelector` in place — rejected (see proposal).

2. **Reuse `FileManagerModal` unchanged**, passing `initialFileIds={documentRelativeUrl}`; on close with
   ids call `addDocuments(ids)` (the reducer already decodes and de-dupes, so the inline
   decode/filter in `ContextAndToolsSection` is dropped, not duplicated). The modal is mounted only
   while open and not read-only, as `ConversationStartersRow` does.
   *Alternative:* a new modal — rejected, the requirement is "same popup as now".

3. **State moves to props.** `AddOnsSection` gains `documentRelativeUrl`, `onAddDocuments`,
   `onRemoveDocument`; `QuickApp2Form` passes `values.documentRelativeUrl`, `addDocuments`,
   `removeDocument` (already stable `useCallback`s). `documentRelativeUrl` is removed from
   `LEGACY_FIELDS`, and `ContextAndToolsSection` drops the Controller/`FilesSelector`/`decodeFileUrl`
   imports. `FilesSelector.tsx` is deleted (no other consumer — verified by grep). Row is `memo`.
   *Alternative:* keep the Controller and mount the row inside the RHF bridge — rejected, it would keep
   the dual source of truth the react-hook-form removal change is eliminating.

4. **Path model in a pure util** `src/utils/knowledge-base-path.ts`, exporting
   `parseKnowledgeBaseItem(id, { ownBucket, rootLabels }): { type: DialItemType; name: string; segments: string[] }`.
   It decodes (`decodeApiUrl`/`safeDecodeURI`, tolerating malformed encoding), strips `files/`, maps
   the bucket segment to a root label, treats a trailing `/` as a folder, and uses the last segment as
   the name. Segments are `[rootLabel, ...folders, name]`; a bucket-root item yields `[rootLabel]`.
   Kept out of the component per module-boundary rules; unit-tested.

5. **Root labels.** The mock shows `Personal` for a user's own root and org/team names (`DIAL`, `EPAM`)
   for others, but the id carries only a bucket hash or `public`. Chosen mapping (assumption, see Open
   Questions): own bucket (`useAuthContext().user.bucket`, as `FileManagerModal` does) → `Personal`;
   `public` (`PUBLIC_BUCKET_SEGMENT`) → `Organization`; other → `Shared with me`. These reuse the file
   manager's existing tab names (`dialFileManager.tab.*`) conceptually; new keys are added in
   `quickAppEditor` so the row does not depend on the modal's namespace.

6. **Item rendering.** `<li class="group …">` with `FileIcon` (`decorative`, `type`, `name`), a
   `Breadcrumbs` (`items = segments.map(label)` — no `onClick`/`href`, so segments are plain text and
   the last is semibold; `ariaLabel` from `KnowledgeBasePathLabel`; default `maxVisibleItems` gives the
   `EPAM › … › Design › name` collapse) in a `min-w-0 flex-1` wrapper so it truncates instead of
   pushing the trash button, and a `GhostIconButton` + `IconTrash` using `DIAL_ICON_SIZE` /
   `DIAL_KIT_ICON_STROKE`, `opacity-0 group-hover/focus-within:opacity-100 focus-visible:opacity-100`
   (stays in tab order). Hover tint `hover:bg-control-accent-alpha`, `rounded-[10px]`, matching the
   starters list. Removing refocuses the list, same as the starters list.
   *Alternative:* kit `FolderPath` — rejected, folder-only, fixed icon/colors.

7. **Empty/loading/error.** Empty = description only (no box). No fetching happens in the row, so no
   loading/error state of its own; `FileManagerModal` keeps its own. A malformed id degrades to showing
   the raw id as a single segment rather than throwing.

8. **i18n** (`quickAppEditor`, both `constants/i18n.ts` enum and `locales/quick-app-editor.json`):
   `KnowledgeBase`, `KnowledgeBaseDescription`, `RemoveKnowledgeBaseItem`, `KnowledgeBasePathLabel`,
   `KnowledgeBasePersonal`, `KnowledgeBaseOrganization`, `KnowledgeBaseShared`. Only `en` locale files
   exist today. Remove now-unused `ContextFiles`, `ContextFilesInfo` (quickAppEditor) and
   `NoContextFilesAdded`, `RemoveFile` (common) after confirming no other usage. The Add tooltip reuses
   the sibling rows' behaviour (`tooltip` prop only, as the starters row).
   `ContextAndToolsDescription` mentions "context files"; reword it to match the card's remaining
   controls only if the spec/mock for that card calls for it — otherwise leave (out of scope).

9. **RTL.** Logical classes only (`gap-*`, `min-w-0`, `ms-*`/`me-*` if needed); trash button sits at
   inline-end by flex order. The kit's chevron separator is its own concern: verify it mirrors under
   `dir="rtl"`; if it does not, pass `separator={<IconChevronRight className="rtl:scale-x-[-1]" …/>}`.

10. **Memoisation.** `KnowledgeBaseRow` wrapped in `memo`; list items derived with `useMemo` from the ids
    and the bucket so typing in other fields does not re-parse paths; callbacks stable via `useCallback`.

## Risks / Trade-offs

- [Root label guess is wrong for shared/team buckets] → the row degrades to a generic label; resolve
  with product before apply (Open Questions). Behaviour is isolated in one util.
- [Kit `Breadcrumbs` ellipsis menu / tooltip inside a hover row could steal hover or focus] → verify in
  the apply step with a component test and a visual check; fall back to `maxVisibleItems` tuning.
- [Unknown ids (not `files/…`)] → fallback to raw segments, covered by util tests.
- [Removing the Controller changes dirty-state timing] → `ADD_DOCUMENTS`/`REMOVE_DOCUMENT` already
  call `applyValues`, existing hook tests plus new row tests cover dirty and save round-trip.
- [Deleting `FilesSelector` breaks tests that mock it] → update `ContextAndToolsSection.test.tsx` and
  legacy-fields/form tests in the same task.

## Migration Plan

Pure UI refactor; persisted data unchanged, no flags. Rollback = revert the commit. Docs: mark the
Knowledge base item done in `docs/TECH_DEBT.md`; archive the change into `application_knowledge-base`
and `application_editor-layout` after merge.

## Open Questions

- Root labels for non-own, non-public buckets (the mock's `DIAL` / `EPAM`) — confirm whether product
  wants `Personal` / `Organization` / `Shared with me` or real names. Does not change the structure
  of the util or row, only the label mapping and one spec scenario.
