Slicing strategy: **contract-first, then vertical**. Slice 1 changes the pure status contract (severity + catalog-ready gate) and the shared row item. Slice 2 wires the Toolsets and Agents rows end to end. Slice 3 adds the Skills row. Each slice leaves the app building and its tests green.

Conventions for every task: const arrow functions, string enums, extensionless relative imports (`@/…` alias), no nested ternaries, `/* … */` for multi-line comments, and `stroke={DIAL_KIT_ICON_STROKE}` if any icon is touched (none expected).

## 1. Status contract and shared row item

- [x] 1.1 In `src/types/entity-status.ts`, add `export enum EntityStatusSeverity { Info = 'info', Error = 'error' }` and `export interface EntityStatusMessage { text: string; severity: EntityStatusSeverity }`.
- [x] 1.2 In `src/utils/get-entity-status.ts`, add a required third parameter to `getEntityStatus(entity, id, isCatalogReady: boolean)`. A missing entity with `isCatalogReady === false` returns the all-false status. Extract that all-false object into one local constant (or builder) so it is not repeated.
- [x] 1.3 In the same file, change `getEntityStatusMessage` to return `EntityStatusMessage | undefined`, with `isNotFoundInCatalog` mapped to `EntityStatusSeverity.Error` and logged-out plus every `EntityStatusKind` mapped to `EntityStatusSeverity.Info`.
- [x] 1.4 In the same file, add `getSkillStatus(skill: DialSkill | undefined, isCatalogReady: boolean): EntityStatus`, with `isNotFoundInCatalog` (and `isError`) set to `isCatalogReady && skill == null` and every other flag false.
- [x] 1.5 Update `src/utils/tests/get-entity-status.test.ts`:
  - existing cases pass `isCatalogReady: true` and assert `{ text, severity }`;
  - add "missing toolset/application id is not reported before the catalog is ready";
  - add "a present entity is unaffected by catalog readiness";
  - add "the not-found message has Error severity; logged-out and deploying/undeploying/redeploying/undeployed have Info";
  - add `getSkillStatus` cases: missing and ready means not found, missing and not ready means nothing, present means nothing.
- [x] 1.6 In `src/components/common/AddOnListItem/AddOnListItem.tsx`:
  - add the optional prop `statusSeverity?: EntityStatusSeverity`, defaulting to `Info`, with a JSDoc line;
  - replace the hand-rolled status `<span>` with ui-kit 2.0 `ErrorText` (Error) or `CaptionText` (Info), passing `id={statusId}`, `text={statusText}` and `className="truncate"`, without `announce`;
  - confirm the `ErrorText`/`CaptionText` props with the ui-kit MCP `getEntityDetails` before writing;
  - keep `aria-describedby` exactly as is;
  - update the component's doc comment if it describes the status line.
- [x] 1.7 In `src/components/common/AddOnListItem/tests/AddOnListItem.test.tsx`, add:
  - "an error status renders in the error style and still describes the details button": query the button by role and name, assert its accessible description, and assert the description element has `text-error`;
  - "a status without severity renders neutral": `text-secondary`, no `text-error`.

Verification: `npx vitest run src/utils/tests/get-entity-status.test.ts src/components/common/AddOnListItem/tests/AddOnListItem.test.tsx`, then `npm run lint` and `npm run typecheck`. Typecheck is expected to fail only in `ToolsetsList.tsx`/`AgentsList.tsx` until slice 2. Do slices 1 and 2 in one sitting if a green typecheck per commit is required.

## 2. Toolsets and Agents rows

- [x] 2.1 In `src/components/Toolsets/ToolsetsList/ToolsetsList.tsx`, read `status` from `useDataContext()` and compute `isCatalogReady = status === LoadStatus.Ready`. Pass it to `getEntityStatus(toolset, id, isCatalogReady)`, then pass the returned message's `text` and `severity` to `AddOnListItem` as `statusText` and `statusSeverity`.
- [x] 2.2 Make the same change in `src/components/Agents/AgentsList/AgentsList.tsx`.
- [x] 2.3 In `src/components/Toolsets/ToolsetsList/tests/ToolsetsList.test.tsx`:
  - add a `vi.mock('@/context/DataContext', …)` that returns a mutable `status`, defaulting to `LoadStatus.Ready`;
  - keep the existing "missing from catalog" test and also assert the `text-error` style;
  - add "a logged-out toolset's status stays neutral";
  - add "no unavailable status while the catalog is loading" (`Loading`) and "no unavailable status after a failed load" (`Error`).
- [x] 2.4 Make the same changes in `src/components/Agents/AgentsList/tests/AgentsList.test.tsx`: add the `status` mock; missing agent means error style; undeployed stays neutral; loading means no status line.

Verification: `npx vitest run src/components/Toolsets/ToolsetsList/tests/ToolsetsList.test.tsx src/components/Agents/AgentsList/tests/AgentsList.test.tsx`, `npm run lint`, `npm run typecheck`, then the full `npm test` once the slice is complete.

## 3. Skills row

- [x] 3.1 Add the i18n key: `AddOnsEntityTypeSkill = 'applicationEditor.addOns.entityTypeSkill'` in `src/constants/translation-keys.ts` (next to `AddOnsEntityTypeToolset`), and `"entityTypeSkill": "skill"` in `src/i18n/locales/en.json` under `applicationEditor.addOns`. `en.json` is the only locale.
- [x] 3.2 In `src/components/Skills/SkillsList/SkillsList.tsx`, read `status` from `useDataContext()`. Pass `getEntityStatusMessage(getSkillStatus(skill, status === LoadStatus.Ready), t, t(ApplicationEditorI18nKeys.AddOnsEntityTypeSkill))` to `AddOnListItem` as `statusText`/`statusSeverity`.
- [x] 3.3 In `src/components/Skills/SkillsList/tests/SkillsList.test.tsx`:
  - extend the `useDataContext` mock with a `status` (default `Ready`);
  - add "a skill missing from the catalog shows the unavailable status as an error and as the details button's description";
  - add "a listed skill has no status line";
  - add "no unavailable status before skills have loaded" (`Loading`, `Error`).

Verification: `npx vitest run src/components/Skills/SkillsList/tests/SkillsList.test.tsx`, `npm run lint`, `npm run typecheck`, then the full `npm test`.

## 4. RTL and final checks

- [x] 4.1 RTL check: confirm the changed status line uses no physical-direction classes (only `truncate` plus the kit's `dial-tiny-text`/colour classes) and that no icon was added. Per `.claude/rules/rtl.md` there is nothing to mirror, so record "RTL: no change" in the PR description.
- [x] 4.2 Run `npm run format:check`, `npm run lint`, `npm run typecheck`, `npm test` and `npm run build`.
- [x] 4.3 `openspec validate highlight-unavailable-add-ons --strict` passes.

## 5. Follow-ups (out of scope — do not implement here)

- [ ] 5.1 Decide whether an agent that is a bare model id missing from the catalog (today `isMissingDeploymentId`, no status) should also be reported as unavailable. Raise it with product, and open a separate change if so.
- [ ] 5.2 After release, link the PR on epam/ai-dial-chat#9635 and close the issue once a chat build includes the new quick-apps image.
