Slicing: **risk-first, then vertical.** First take a bundle baseline (design Risk 1), so the measurement after the change has something to compare to. Then move one row at a time, Skills → Agents → Toolsets, each working end to end with its tests, from the simplest row to the one with the badge. Delete the app's row, hook and key only when no row uses them.

## 1. Baseline

- [x] 1.1 Record the editor entry's static import size before any code change. Run `npx vite build`, then sum the bytes of the transitive static imports of `dist/index.html`'s module script, following `import … from "./x.js"` and bare `import "./x.js"` in `dist/assets/`. Use a script in the session scratchpad, not in the repo. Note the total and whether ag-grid is in it, in the PR description.
  - Verification: the number and the ag-grid yes/no are written down; no repo file changed.

## 2. Status-line helper

- [x] 2.1 Add `src/utils/render-entity-status.tsx`, exporting an arrow function `renderEntityStatus(message?: EntityStatusMessage): ReactNode`. It returns the ui-kit 2.0 `ErrorText` for `EntityStatusSeverity.Error`, `CaptionText` for `Info`, and `undefined` without a message, with an `if`/`else` and no nested ternary. Reuse the message type `getEntityStatusMessage` returns (`src/utils/get-entity-status.ts`); do not declare a new one.
- [x] 2.2 Add `src/utils/tests/render-entity-status.test.tsx`:
  - an error message renders with class `text-error`;
  - an info message renders with `text-secondary` and not `text-error`;
  - no message renders nothing.
  - Verification: `npx vitest run src/utils/tests/render-entity-status.test.tsx`, `npm run lint`, `npm run typecheck`.

## 3. Skills row (first slice)

- [x] 3.1 In `src/components/Skills/SkillsList/SkillsList.tsx`:
  - render `AddOnListItem` from `@epam/ai-dial-catalog` with `name`, `version={skill?.version}`, `description={renderEntityStatus(statusMessage)}`, `labels={{ remove: t(ApplicationEditorI18nKeys.AddOnsRemove, { name }) }}`, `onOpen={() => setOpenSkillId(id)}` and `onRemove={() => handleRemove(id)}`;
  - replace the app hook with `useListRemoveFocus<HTMLUListElement>(value.length)` before the empty-list return, with the ref on the `<ul>`;
  - drop `markRemoval`, and keep the comment on why focus is restored.
- [x] 3.2 Update `src/components/Skills/SkillsList/tests/SkillsList.test.tsx`:
  - find each item's details button inside its `<li>` by the visible name (`within(row)`), not by `ApplicationEditorI18nKeys.AddOnsDetails` (lines 84 and 166);
  - add the spec scenario "Details button is named by the skill": the accessible name resolved through `aria-labelledby` is "Web Search", and the fallback name for a missing id;
  - keep the removal, refocus, status-line and mouse-close scenarios passing unchanged;
  - add "Delete in the details popup moves focus to the first remaining item" (design Risk 2).
  - Verification: `npx vitest run src/components/Skills`, `npm run lint`, `npm run typecheck`.

## 4. Agents row

- [x] 4.1 Apply 3.1 to `src/components/Agents/AgentsList/AgentsList.tsx`, using `version` and `iconUrl` from `getAddOnDisplay` and the count `ids.length`.
- [x] 4.2 Update `src/components/Agents/AgentsList/tests/AgentsList.test.tsx`:
  - replace the `AddOnsDetails` lookup at line 79;
  - add "Details button is named by the agent" ("Research Agent 2.1", "GPT-4o", fallback "old-agent");
  - keep the undeployed, missing and loading status scenarios passing.
  - Verification: `npx vitest run src/components/Agents`, `npm run lint`, `npm run typecheck`.

## 5. Toolsets row

- [x] 5.1 Apply 3.1 to `src/components/Toolsets/ToolsetsList/ToolsetsList.tsx`:
  - pass `credentials={toolset ? mapToolsetCredentials(toolset) : undefined}` (from `src/utils/map-toolset-to-catalog-item.ts`, with an `if` or a plain conditional, not nested) and `labels.credentialsBadge = t(CatalogI18nKeys.CredentialsBadgeLoggedOut)`;
  - remove the lazy `ToolsetBadge` import and its comment.
- [x] 5.2 Update `src/components/Toolsets/ToolsetsList/tests/ToolsetsList.test.tsx`:
  - replace the `AddOnsDetails` lookup at line 112;
  - add "Details button is named by the toolset" ("Figma 1.0.0", "Jira", fallback "old-tool");
  - keep the badge (signed-out OAuth has it, no-auth has none), status-line, mouse-close and "Remove from the row" scenarios passing.
  - Verification: `npx vitest run src/components/Toolsets`, `npm run lint`, `npm run typecheck`, then the full `npm test` once for slices 3–5.

## 6. Remove what no row uses

- [x] 6.1 Delete:
  - `src/components/common/AddOnListItem/` (component and tests);
  - `src/hooks/use-list-remove-focus.ts`;
  - `src/components/Toolsets/ToolsetBadge/` (component and any tests).

  Before deleting, confirm with a search that nothing imports them.
- [x] 6.2 Remove `AddOnsDetails` from `ApplicationEditorI18nKeys` in `src/constants/translation-keys.ts` and `applicationEditor.addOns.details` from `src/i18n/locales/en.json` (the only locale). No new key is added.
  - Verification: a search for `AddOnsDetails` and `addOns.details` in `src/` returns nothing; `npm run build`, `npm run lint`, `npm test`.

## 7. Bundle check

- [x] 7.1 Repeat 1.1 after the change and compare. The entry's static import size SHALL NOT grow beyond noise (a few kB). If it grows, make the rows' catalog import lazy before going on.
  - Measured: 5912 → 6391 kB (+479 kB, the catalog's markdown chunk). Fix (design decision 6): `src/components/Toolsets/ToolsetsFormSection/ToolsetsFormSection.tsx`, `src/components/Agents/AgentsFormSection/AgentsFormSection.tsx` and `src/components/AgentSkills/AgentSkillsFormSection/AgentSkillsFormSection.tsx` render their list through `React.lazy` + `<Suspense fallback={null}>`. Re-measure afterwards.
  - Verification: `npx vitest run src/components/AddOns src/components/Toolsets src/components/Agents src/components/Skills src/components/AgentSkills`, `npm run lint`, `npm run typecheck`, and the re-measured size.
- [x] 7.2 Follow-up, not in this change: find which static import puts the catalog / ag-grid into the editor entry, and check `development` for the same. Record the finding and the suspected import in `docs/TECH_DEBT.md` as an open item, and report it in PR #323.
  - Verification: the before/after numbers and the TECH_DEBT entry are in place.

## 8. Docs

- [x] 8.1 In `docs/TECH_DEBT.md`, mark the `AddOnListItem` / `useListRemoveFocus` item (added with the chat-libs bump) done, pointing to this change. Update any other line that names `components/common/AddOnListItem`.
  - Verification: a search for `common/AddOnListItem` and `use-list-remove-focus` under `docs/` returns only historical archive references.
