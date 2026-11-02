## Context

The Toolsets, Agents and Skills rows of the Add-ons card each map their attached ids to an app-owned row, `src/components/common/AddOnListItem/AddOnListItem.tsx:44`. Each also restores focus after a removal through `src/hooks/use-list-remove-focus.ts:14`:

- `src/components/Toolsets/ToolsetsList/ToolsetsList.tsx:36`
- `src/components/Agents/AgentsList/AgentsList.tsx`
- `src/components/Skills/SkillsList/SkillsList.tsx`

`@epam/ai-dial-catalog` `1.3.0-dev.282` exports `AddOnListItem` and `useListRemoveFocus`, both ported from these files and used by ai-dial-chat. The props differ:

| App row (today) | Catalog row |
|---|---|
| `id` + `onClick(id)` / `onRemove(id)` | `onOpen()` / `onRemove()` closures |
| `statusText` + `statusSeverity` (renders `ErrorText` / `CaptionText`) | `description: ReactNode` (row wraps it in a truncating span, `aria-describedby`) |
| `badge: ReactNode` (lazy `ToolsetBadge` → `CredentialsBadge`) | `credentials` + `labels.credentialsBadge` (renders `CredentialsBadge` itself) |
| `detailsLabel` → `aria-label` | no label prop; button `aria-labelledby` the visible name + version |
| `removeLabel` | `labels.remove` |
| `useListRemoveFocus(value)` → `{ listRef, markRemoval }`, focuses the first list button after a marked removal | `useListRemoveFocus(count)` → `ref`, focuses the first `ul button` when the count drops **and** focus is on the body or a detached node |

The proposal settles the naming difference: the specs adopt the catalog's naming.

## Goals / Non-Goals

**Goals:**

- The three rows render the catalog's `AddOnListItem` and use its `useListRemoveFocus`. The app's row, its hook and `ToolsetBadge` are deleted.
- Everything the "Attached … list (editable)" requirements specify, other than the button name, stays observable as it is today.
- The editor's initial (static) import graph does not grow.

**Non-Goals:**

- Fixing the existing presence of ag-grid in the editor's static graph. That is pre-existing on the PR #323 branch; see Risks.
- Any change to the details popups, the Add pickers or the Knowledge base row.

## Decisions

1. **Status severity is carried by the `description` node, not a prop.** The row passes `<ErrorText text=… />` for `EntityStatusSeverity.Error` and `<CaptionText text=… />` for `Info`, chosen with an `if`/`else` in a small helper in `src/utils/` (no nested ternary, no helper in a component file). It passes nothing when `getEntityStatusMessage` returns none. The catalog's wrapper span holds the `id` that `aria-describedby` points at, and it truncates. The kit text component inside keeps its own `text-error` / `text-secondary` class, so the specs' class assertions still hold.
   - *Alternative:* pass plain text and colour the wrapper through the row's `descriptionClassName`. Rejected: it duplicates the kit's error styling, and tests of "rendered as `ErrorText`" would assert a class we invent.
   - The helper builds React nodes, so it lives in a `.tsx` file under `src/utils/` (e.g. `src/utils/render-entity-status.tsx`), exported as an arrow function.
2. **The badge goes through `credentials`.** `ToolsetsList` passes `mapToolsetCredentials(toolset)` (`src/utils/map-toolset-to-catalog-item.ts`) for a known toolset and `undefined` for an unknown one. `CredentialsBadge` already draws nothing for a toolset that needs no authentication or is signed in, which is the behaviour `ToolsetBadge` had. `ToolsetBadge` and its lazy import are deleted.
   - *Alternative:* keep `ToolsetBadge` for lazy loading. Not possible: the row itself now comes from the catalog bundle, so the badge cannot be lazier than the row that holds it (see Risk 1).
3. **Refocus uses the catalog hook with its ref on the `<ul>`.** Each list calls `useListRemoveFocus<HTMLUListElement>(ids.length)` before its empty-list early return and puts the ref on its `<ul>`. When the list empties, the list renders nothing, and nothing is focused, as today. `markRemoval` disappears; `handleRemove` only updates the value.
4. **Button name is data, not a translation.** `ApplicationEditorI18nKeys.AddOnsDetails` and `applicationEditor.addOns.details` are removed. The trash label keeps `ApplicationEditorI18nKeys.AddOnsRemove` with `{{name}}`, passed as `labels.remove`.
5. **Memoisation stays as today.** The lists are already `memo`, `handleRemove` stays a `useCallback`, and the per-item `onOpen` / `onRemove` closures are created in the `map`, as the catalog's README example does. The rows are not memoised, so stable callbacks would buy nothing.
6. **The three lists load lazily from their sections.** Measured during apply, the static import of `AddOnListItem` / `useListRemoveFocus` grew the editor entry's static graph from 5912 kB to 6391 kB (+479 kB). The catalog's single `index.js` statically imports its shared `mapping-*.js` chunk, which holds the markdown pipeline (micromark, remark, rehype, katex, DOMPurify). Tree-shaking cannot split that from the row. So `ToolsetsFormSection`, `AgentsFormSection` and `AgentSkillsFormSection` render their list through `React.lazy` with `<Suspense fallback={null}>`, as they already do for their Add pickers. The row, the hook and the markdown chunk then load with the list, not with the editor.
   - *Alternatives:*
     - accept the +479 kB. Rejected (by the user): startup cost for a list that is often empty.
     - Keep the app's row until the catalog ships a lightweight subpath. Rejected: it keeps the duplicate this change removes. A light entry point stays a reasonable upstream ask.
   - *Effect:* the section header, Add button and empty description render at once. The attached items appear when the list chunk resolves, with no spinner, since the chunk is small and the row has no loading state of its own.

## Risks / Trade-offs

- **[Risk 1] Bundle: the rows now import the catalog root statically.** `ToolsetsList` lazy-loaded `ToolsetBadge` precisely so that the catalog bundle (ag-grid) stays out of the editor's initial graph. Measured on the PR #323 branch (`vite build`), ag-grid is already in the entry's static graph: `dist/assets/get-localized-text-*.js` is 1.17 MB and holds ag-grid code (`AgGridReact`, `GridApi`, `ModuleRegistry`). So the guarantee the lazy import protected no longer holds before this change.
  → Mitigation:
  - before and after the change, build and sum the bytes of the entry's transitive static imports (from `dist/index.html`'s module script, following `import … from "./x.js"` and `import "./x.js"`). The change must not increase that sum beyond noise;
  - separately, find which static import pulls the catalog/ag-grid into the entry (candidates: the `src/utils/map-*-to-catalog-item.ts` files and `src/hooks/use-catalog-*` import values from the catalog root), compare with `development`, and fix it in its own change. That is a performance regression to report, not something to fold into this one.
- **[Risk 2] Refocus timing after Delete in a details popup.** The catalog hook focuses only when focus has fallen to the body. If the kit `Popup` returns focus to its (removed) trigger after the list's effect has run, the first remaining button might not get focus.
  → Mitigation: keep the existing list tests for removal from the row and add one for Delete in the popup, asserting focus on the first remaining details button. If it fails, focus the first `ul button` from `handleRemove` in a `requestAnimationFrame`, and flag it upstream.
- **[Trade-off] Screen-reader wording.** A screen reader hears "Figma 1.0.0, button, The toolset is not available…" instead of "Figma details, button, …". Opening the button still shows a dialog named after the item. ai-dial-chat users already hear this wording.
- **[Risk 3] Tests that find buttons by `AddOnsDetails`.** `ToolsetsList.test.tsx:112`, `SkillsList.test.tsx:84` and `:166`, and `AgentsList.test.tsx:79` look the button up by that key.
  → They move to finding the row's first button by its visible name (`within(row)`, per `.claude/rules/all-ts.md`), and assert the accessible name through `aria-labelledby`.

**RTL / direction:** no new surface. The catalog row uses logical properties (`pe-1`, `ms-*`, `text-start`, `end-*` for the badge) and mirrors no icon, as the app's row did. The existing RTL scenarios keep passing.

**States:** loading, empty and error states are unchanged:
- no status line while `DataContext.status` is not `Ready`;
- the row renders nothing for an empty list;
- the unavailable item has its `Error` line.

## Migration Plan

Ship in PR #323 as its own commit, after the chat-libs bump that brings the components in. There is nothing to migrate in data or in the host contract. Rollback: revert the commit, which restores the app's row, hook, `ToolsetBadge` and the `AddOnsDetails` key.

## Open Questions

- Is ag-grid in the editor's static graph on `development` (before the chat-libs bump), or did #323 introduce it? The answer decides whether #323 needs a fix before merge. It is tracked by the bundle task, not resolved here.
