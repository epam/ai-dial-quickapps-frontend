## Why

`@epam/ai-dial-catalog` `1.3.0-dev.282` (PR #323) ships `AddOnListItem` and `useListRemoveFocus`, ported from this app's `src/components/common/AddOnListItem/AddOnListItem.tsx:44` and `src/hooks/use-list-remove-focus.ts:14`. The app now keeps a second copy of a row that ai-dial-chat maintains, and the two will drift. The library's row does everything `toolsets_selection`, `agents_selection` and `skills_catalog` require except one thing: its details button is named by the item's name and version, where the specs require "<name> details" (`ApplicationEditorI18nKeys.AddOnsDetails`).

## What Changes

**Problem.** There are two implementations of the attached add-on row. The only thing stopping the app from using the library's row is the details button's accessible name.

**Solution.**

- **BREAKING (accessible name):** in the Toolsets, Agents and Skills rows, the details button is named by the item's name followed by its version when one is known (e.g. "Figma 1.0.0", "Web Search"), as the library and ai-dial-chat name it. It is no longer named "Figma details". Activating it still opens the details popup, and the status line still describes it.
- `ToolsetsList`, `AgentsList` and `SkillsList` render `@epam/ai-dial-catalog`'s `AddOnListItem` and use its `useListRemoveFocus`:
  - the logged-out badge goes through the item's `credentials` prop;
  - the status line goes through its `description`, as the kit `ErrorText` for `EntityStatusSeverity.Error` and the kit `CaptionText` for `Info`;
  - the trash button is named through `labels.remove`.
- Removed:
  - `src/components/common/AddOnListItem/` and its tests;
  - `src/hooks/use-list-remove-focus.ts`;
  - `src/components/Toolsets/ToolsetBadge/` (replaced by the item's `credentials` prop);
  - the `AddOnsDetails` key from `src/i18n/locales/en.json` and `src/constants/translation-keys.ts`.
- Unchanged:
  - the status line wording, severity, `aria-describedby` link and live-region rule;
  - the trash button's visibility, tab order and removal;
  - refocus to the first remaining item;
  - the badge label;
  - the row content (avatar, name, version).

**Non-goals.**

- No change to the details popups, the Add pickers or the Knowledge base row (it does not use `AddOnListItem`).
- No upstream change to `@epam/ai-dial-catalog`.
- Restoring lazy loading of the catalog bundle is not part of this change; see Impact.

**Alternatives considered.**

1. **Keep the app's row (baseline).** No behaviour change, but the app keeps a copy of a library component, which is the drift this change removes. Rejected.
2. **Ask ai-dial-chat for a details-label prop.** It keeps "<name> details", but it blocks on an upstream release and adds a prop that only this app would use. Rejected: the name-and-version label is sufficient, as argued below.
3. **Adopt the library's naming (chosen).** WCAG 2.4.6 / 4.1.2 need the name to identify the control. The item's own name does that: the button is the item, and opening it shows that item's details. "details" adds no information that the dialog opening does not already give, and ai-dial-chat already ships this naming.

**Acceptance criteria.**

- The three rows render the catalog's `AddOnListItem`. `components/common/AddOnListItem`, `hooks/use-list-remove-focus.ts` and `ToolsetBadge` are gone.
- In each row the details button's accessible name is the item name plus version ("Figma 1.0.0") or the name alone when there is no version ("Web Search"). For an id missing from the catalog it is the fallback name ("old-tool").
- Every other scenario of the three "Attached … list (editable)" requirements still passes: status text and severity class, `aria-describedby`, trash visibility after a mouse or keyboard close, removal, refocus, badge.
- `AddOnsDetails` no longer exists in `en.json` or `translation-keys.ts`, and no code references it.
- `npm run build`, `npm run lint` and `npm test` pass. The editor entry's static import graph is no larger than before the change (measured as in `design.md`).

## Capabilities

### New Capabilities

_None._

### Modified Capabilities

- `toolsets_selection`: "Attached toolsets list (editable)". The details button's name, and the item component is the catalog's `AddOnListItem` with severity through its description.
- `agents_selection`: "Attached agents list (editable)". The details button's name.
- `skills_catalog`: "Attached skills list (editable)". The details button's name.

## Impact

- **Code:**
  - changed: `src/components/Toolsets/ToolsetsList/ToolsetsList.tsx`, `src/components/Agents/AgentsList/AgentsList.tsx`, `src/components/Skills/SkillsList/SkillsList.tsx` and their tests;
  - removed: `src/components/common/AddOnListItem/`, `src/hooks/use-list-remove-focus.ts`, `src/components/Toolsets/ToolsetBadge/`.
- **Dependencies:** none new. It uses `@epam/ai-dial-catalog` `1.3.0-dev.282`, already bumped in PR #323.
- **Bundle:** the rows now import from the catalog root statically, where `ToolsetsList` lazy-loaded `ToolsetBadge` to keep the catalog bundle out of the editor's initial graph. On the PR #323 branch, ag-grid is already in the entry's static graph: `dist/assets/get-localized-text-*.js` is 1.17 MB and holds ag-grid. So this change is not expected to add to it, but it must be measured, and the existing regression is tracked separately (see `design.md`).
- **Cross-cutting:** no auth, host-integration or API-layer change.
- **i18n:** one key removed (`applicationEditor.addOns.details`) and none added. The details button's name now comes from data (the item's name and version), not from a translated template.
- **RTL:** none. The library's row uses logical properties (`pe-1`, `ms-*`, `text-start`) and no directional icon, as the app's row did.
- **Rollback:** revert the change's commit. The app's row and hook come back with the `AddOnsDetails` key. No stored data or host contract is involved.
