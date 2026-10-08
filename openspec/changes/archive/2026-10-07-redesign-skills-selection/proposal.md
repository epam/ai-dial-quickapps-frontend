## Why

The design changes how skills are shown, picked and inspected in the Add-ons card. Today the Skills row is a bordered box of removable chips (`src/components/common/SkillsSelector/SkillsSelector.tsx:46-58`, `SkillChip.tsx:36-55`). Picking happens in a card grid with My favorites / Catalog tabs (`SkillsModal.tsx:66-245`). Neither matches the mock, and a user can't read what a skill actually does before attaching it: only the one-line description shows, in a tooltip.

The model picker already moved to the catalog list (`src/components/Orchestrator/ModelCatalogModal/ModelCatalogModal.tsx:212-222`). Skills should look and behave the same way.

## What Changes

- **Skills row (Add-ons card).** The chip box is replaced by a plain list. Each item shows the skill's initials avatar, its name and, when chat-api supplies one, its version.
  - Each item is a button that opens the skill details popup.
  - In an editable app, hovering an item (or focusing into it) reveals a trash icon button at its end. It removes the skill from the app directly, without opening the popup. The details popup's Delete does the same.
  - The row's Add action and empty-state description are unchanged.
- **Add skill popup** replaces the card-grid modal.
  - **Header:** a "Skills catalog" heading with the number of listed skills, and a sort dropdown (Recently updated / Newest / Name A–Z).
  - **Toolbar:** a search field ("Search skills...") and the catalog **From** filter (tags + My).
  - **List:** the catalog list. Columns are a checkbox column with a select-all checkbox in the header, Name (avatar + name + version), Type, Folder and Tags.
  - **Selection:** the skills already attached start checked. **Add** applies the checked set, which can add and remove skills in one go. **Cancel**, ×, Escape and an outside click discard changes.
  - **BREAKING (UI only):** the My favorites tab and the "Selected" chip strip are removed.
- **Skill details popup** (new). It opens from a Skills row item.
  - **Header:** the avatar, a "Skill" type caption and the name.
  - **Details tab:** the skill's description, then the rendered body of its `SKILL.md`.
  - **Overview tab:** author, folder/scope and last-updated date, plus the version when there is one.
  - **Footer:** **Delete** removes the skill from this application, i.e. from the `agentSkills` form value. It does not delete the skill resource in DIAL. **Close** closes the popup. Read-only and shared applications don't show Delete.
- **Version and tags.** `SkillMetadataItemDto` has neither field. The catalog mapping passes them through when chat-api supplies them; until then the version is omitted and the Tags cells stay empty. This is recorded as an upstream chat-api ask.
- **Upstream dependency, `@epam/ai-dial-catalog`.** `ListView` can only mark one row (`selectedItemId`). This change needs a multi-select mode in ai-dial-chat `libs/catalog`: a checkbox column, a tri-state select-all and a controlled selected-id set. The Add skill popup slice is blocked until a catalog release with that mode is installed. The Skills row and details popup slices don't depend on it.

## Non-goals

- Deleting, editing, sharing, publishing or favouriting skill resources from the editor.
- Browsing a skill's other bundled files in the Details tab. Only `SKILL.md` is shown, with no file tree.
- Reordering attached skills. The save order stays "existing first, newly added appended" (`SkillsModal.tsx:136-140`).
- Changing what is saved: `agentSkills` and the `skills` entries in the app config keep their shape.
- Adding version or tags to chat-api. That is the upstream ask; this change only consumes the fields when they appear.

## Alternatives considered

- _Keep chips and the card grid, restyle only_ (conservative baseline). Smallest diff, but it doesn't match the design and still gives no way to read a skill. Rejected.
- _ui-kit 2.0 `Grid` with `selectionMode={GridSelectionMode.MULTIPLE}`._ Available today with a checkbox column and a mixed select-all, so there's no release dependency. Rejected by product decision: the skills list must stay identical to the models catalog list (`ListView`). Its columns, folder rendering and search highlighting would otherwise be re-implemented here and drift.
- _`ListView` plus a CSS-only checkbox overlay._ It depends on private CSS-module class names, the way the selected-row outline already does (`ModelCatalogModal.tsx:198-210`), and a tri-state header can't be built that way. Rejected.
- _Reuse the chat's `SkillDetailsSidePanel` / `useSkillDetailsPanelData`._ Both live in private, unpublished packages (`@epam/ai-dial-skills`, `@epam/ai-dial-chat-hooks`). They are also a side drawer, while the mock is a centred popup. Rejected. The popup reuses the published `ContentTab` from `@epam/ai-dial-catalog` instead.
- _Delete as "delete the skill resource"._ Destructive for every other user of the skill and not an editor concern. Rejected; Delete only detaches.

## Acceptance criteria

- An app with attached skills shows them in the Skills row as avatar + name (+ version when present), with no chip box. Hovering an item reveals a trash button that removes it from `agentSkills`; there is no trash button in a read-only app.
- Activating a row item opens the details popup. The popup shows the skill name, its description and its rendered `SKILL.md` body; Overview shows author, folder and updated date.
- In the details popup of an editable app, **Delete** removes that skill from `agentSkills` and closes the popup. The form becomes dirty, and saving writes the same `skills` config as removing a chip did before. Read-only or shared app: no Delete.
- **Add** opens "Add skill": catalog list, count, sort, search, From filter. The attached skills are pre-checked.
- Checking two skills and unchecking one attached skill, then **Add**, applies exactly that set and keeps the existing-first order. Cancel/×/Escape leave the form unchanged.
- The select-all checkbox shows a mixed state for a partial selection. Selecting all checks every listed (filtered) row.
- Loading, load-error (with Retry), no-results and empty-catalog states render in the Add skill popup. Loading and error states render in the Details tab.
- RTL: the row and the popups run right to left, and no icons are mirrored.

## Capabilities

### New Capabilities

- `skills_catalog`: how attached skills are listed in the editor, how skills are picked from the catalog (Add skill popup), and how a skill's details are shown and detached. This is the spec-id proposed for this source area in `docs/TECH_DEBT.md`.

### Modified Capabilities

- `application_editor-layout`: "Skills content window is conditional" and the "Existing selections remain visible" scenario of "Presentation change preserves form contract". The Skills content window becomes a list of skill items without inline removal; removal happens through the details popup.

## Impact

- **Code:**
  - New `src/components/Skills/SkillsList/`, `src/components/Skills/AddSkillsModal/` and `src/components/Skills/SkillDetailsPopup/` (+ tests).
  - New `src/utils/map-skill-to-catalog-item.ts`, `src/utils/parse-skill-manifest.ts` and `src/hooks/use-skill-manifest.ts` (+ tests).
  - Changed: `src/components/AgentSkills/AgentSkillsFormSection.tsx`, `src/utils/dialClient.ts` (map `path`/`bucket`, plus optional `version`/`tags`; add `fetchSkillManifest`) and `src/types/dial-entities.ts` (`DialSkill`).
  - Deleted: `src/components/common/SkillsSelector/**` and `src/components/AgentSkills/AgentSkillsField.tsx`. This resolves the `docs/TECH_DEBT.md` note that `AgentSkillsField` is just a proxy.
- **API (chat-api):** one new read call, `skillsApi.downloadSkillFile({ bucket, path, filePath: 'SKILL.md' })` (`GET /api/v1/skills/files/download?bucket=…&path=…&filePath=SKILL.md`). It is made only when the details popup opens. Listing still uses `listCatalogSkills`. Upstream ask: `version` and `tags` on `SkillMetadataItemDto`.
- **Dependencies:** a newer `@epam/ai-dial-catalog` with `ListView` multi-select (upstream, ai-dial-chat `libs/catalog`). No new third-party packages.
- **Auth / host integration:** none.
- **i18n (`quickAppEditor`):**
  - New keys: `AddSkill`, `SkillsCatalog`, `SkillTypeLabel`, `SkillDetails`, `SkillDetailsTab`, `SkillOverviewTab`, `RemoveSkillFromApp`, `SkillAuthor`, `SkillFolder`, `SkillUpdated`, `SkillVersion`, `FailedToLoadSkills`, `FailedToLoadSkillContent`, `LoadingSkills`, `LoadingSkillContent`, `SelectSkill`, `SelectAllSkills`, `SkillUnavailable`.
  - Reused: `SearchAgentSkills`, `Sort*`, `Filter*`, `NoResultsFound`, `Retry`, `Close`, plus `common` `Add`, `Cancel`, `CloseDialog`.
  - Removed: `SelectAgentSkills`, plus `SelectedLabel` and `NoResourcesSelected` if nothing else uses them. `MyFavorites`/`CatalogTab` stay because `AgentAndToolsetModal.tsx:146-147` still uses them.
- **RTL:** the row items and popup headers use flex with logical gaps. The catalog list and `Popup` already follow `dir`. The avatar is symmetric, and the trash and close icons aren't mirrored. Footer order flips with direction: Delete at the start edge, Close at the end edge.
- **Rollback:** revert the commit and pin `@epam/ai-dial-catalog` back. The saved data shape is unchanged in both directions.
