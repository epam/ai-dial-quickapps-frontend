Slicing strategy: **contract-first, gated on the upstream release, then vertical per entity.**

- Â§0 is the upstream PR in ai-dial-chat. Â§1 is the gate: the catalog bump plus confirming the export shapes.
- Â§2 adds the data layer: client calls, hooks and labels.
- Â§3â€“Â§5 move one popup at a time onto catalog content: toolset, then agent/model, then skill. The shared shell changes in Â§3.
- Â§6 is cleanup, RTL and docs.
- Every slice leaves `npm run lint`, `npm run typecheck` and `npm test` green. Nothing in Â§2â€“Â§6 starts before Â§1 passes.

Before starting, read `AGENTS.md`, `.claude/rules/all-ts.md`, `.claude/rules/all-tsx.md` and `.claude/rules/rtl.md`. Follow these conventions:

- extensionless imports, the `@/` alias, arrow-function exports;
- string enums in `src/types/`, `is/has` booleans, `on/handle` handlers;
- `mergeClasses`;
- `DIAL_ICON_SIZE` / `DIAL_KIT_ICON_STROKE`;
- i18n keys with unique values (`no-duplicate-enum-values`).

Component tests go in `tests/` and use role, label and text queries.

## 0. Upstream: ai-dial-chat (outside this repo)

- [x] 0.1 Land the ai-dial-chat change `export-catalog-details-tabs` (branch `feat/catalog-details-tabs-export`, design D1). It:
  - exports `AboutTab`, `OverviewTab`, `PricingTab` and `ToolsTab` (+ props, `ToolsLabels`);
  - adds `getCatalogDetailsTabs` to `/mapping`, used by `DetailsPanel`;
  - adds `entityDetailsLabels` / `labels` with `EntityDetailsLabels` and `DEFAULT_ENTITY_DETAILS_LABELS` in `chat-hooks`.

  Verification: the ai-dial-chat PR is merged and dev releases of `@epam/ai-dial-catalog` and `@epam/ai-dial-chat-hooks` that include it are published.

## 1. Gate: bump and confirm the contract

- [x] 1.1 Bump `@epam/ai-dial-catalog` and add `@epam/ai-dial-chat-hooks` (the same release line) in `package.json`, then run `npm install`. Confirm against the installed `.d.ts`:
  - the four tab exports and `getCatalogDetailsTabs` / `CatalogDetailsTab` on `/mapping`;
  - `useCatalogItemDetails` options, including `entityDetailsLabels`;
  - the `CatalogDetailsApi` / `SkillDetailsApi` method shapes;
  - `EntityDetailsLabels`, `DeploymentLimitsLabels`, `SkillOverviewLabels` and `PromptOverviewLabels`.

  If anything differs, update design D1/D3/D5 and the tasks below first.
  - Verification: `npm run typecheck`, `npm test` (nothing should change yet), and `npm run build` (note the bundle size before Â§3).

## 2. Data layer: adapter, labels, hook

Depends on 1.

- [x] 2.1 Add `src/types/entity-details.ts` with `enum DetailsStatus { Idle = 'idle', Loading = 'loading', Ready = 'ready', Error = 'error' }`.
- [x] 2.2 Create `src/utils/catalog-details-api.ts` exporting `createCatalogDetailsApi(): CatalogDetailsApi` over `deploymentsApi` / `skillsApi` from `src/utils/chat-api-client.ts`:
  - `getDeploymentDetails(id)` â†’ `deploymentsApi.getDeploymentDetails({ deployment: encodeDialPath(id) })`;
  - `getDeploymentLimits(id)` likewise;
  - `downloadSkillFile(bucket, path, filePath, signal)` returns the raw `Response` (`skillsApi.downloadSkillFileRaw(...).raw`);
  - `listSkillFiles(params, signal)`;
  - `getSkillMetadata(bucket, path, signal)`;
  - `getPrompt` / `getPublicPrompt` reject with a clear error, since prompts are never opened here.
- [x] 2.3 Add the `quickAppEditor` keys from design D5 to `src/constants/i18n.ts` and `src/i18n/locales/quick-app-editor.json` (values unique, `no-duplicate-enum-values`). Add `src/hooks/use-catalog-details-labels.ts`, which returns memoised `entityDetailsLabels`, `deploymentLimitsLabels`, `skillOverviewLabels`, `promptOverviewLabels`, the tab labels, Yes/No and the `ToolsTab` labels.
- [x] 2.4 Create `src/hooks/use-entity-details.ts`: `useEntityDetails(item?: CatalogItem): { status: DetailsStatus; details?: CatalogItemTabData; retry: () => void }`.
  - It calls `useCatalogItemDetails` with the memoised adapter, the labels from 2.3, `skills` from `DataContext` mapped back to `SkillMetadataItemDto` (or `[]` if the metadata request is authoritative), `isAdmin: false` and `dialCoreExternalUrl: null`.
  - It runs `onFetchDetails(item)` on open, with a request key / cancelled flag / stale drop as in `src/hooks/use-skill-manifest.ts`. `undefined` from `onFetchDetails` maps to `Error`.
  - With no item: `Idle` and no request.
- [x] 2.5 Unit tests:
  - `src/utils/tests/catalog-details-api.test.ts`: request params and id encoding of each adapter method; prompt methods reject.
  - `src/hooks/tests/use-entity-details.test.tsx` (mock the client):
    - toolset Loading â†’ Ready with overview and tools;
    - model with limits;
    - limits failure keeps the details;
    - skill with overview and promptContent;
    - details failure â†’ Error â†’ `retry` â†’ Ready;
    - stale response dropped;
    - no request without an item;
    - translated labels appear in the overview.
  - Verification: `npx vitest run src/utils/tests/catalog-details-api.test.ts src/hooks/tests/use-entity-details.test.tsx`, `npm run lint`, `npm run typecheck`.

## 3. Vertical slice: shared shell + toolset popup on catalog content

Depends on 2.

- [x] 3.1 Rework `src/components/common/AddOnDetailsPopup/AddOnDetailsPopup.tsx` per design D2. New props: `item: CatalogItem`, `detailsStatus`, `onRetry`, `labels` and `unavailableText?`, replacing `tabs`.
  - Tab ids via `getCatalogDetailsTabs(item, { isConnectHidden: true })`, rendered as ui-kit 2.0 `Tabs`.
  - Panels: `AboutTab` / `ContentTab` / `OverviewTab` / `PricingTab` / `LimitsTab` / `ToolsTab` with the translated labels.
  - A loading indicator (`LoadingDetails`) next to the tab row while `Loading`.
  - On `Error`: About stays, plus `FailedToLoadDetails` and Retry.
  - Header, actions, banner and footer are unchanged.
- [x] 3.2 Move `src/components/Toolsets/ToolsetDetailsPopup/ToolsetDetailsPopup.tsx` onto it:
  - build the item with `mapToolsetToCatalogItem` and pass it to `useEntityDetails`;
  - keep `ToolsetCredentialsAction`, the badge and the banner;
  - delete `ToolsetToolsTab.tsx`, `src/hooks/use-toolset-tools.ts` (+ test), `fetchToolsetToolNames` (+ its dialClient test cases), `getToolsetOverviewRows` and `filterToolNames` (+ their tests), and `src/types/toolset-tools.ts`.
- [x] 3.3 Rewrite `src/components/Toolsets/ToolsetDetailsPopup/tests/ToolsetDetailsPopup.test.tsx` (mock the client):
  - About, Overview and Tools appear from a details payload, in catalog order, with translated section titles;
  - an empty tool list â†’ no Tools tab;
  - loading indicator; failure + Retry;
  - Log in flows unchanged (keep those cases);
  - the unavailable toolset makes no request;
  - read-only, and RTL footer order.
  - Verification: `npx vitest run src/components/Toolsets src/components/common`, `npm run lint`, `npm run typecheck`, then the full `npm test`.

## 4. Vertical slice: agent and model popup on catalog content

Depends on 3.

- [x] 4.1 Move `src/components/Agents/AgentDetailsPopup/AgentDetailsPopup.tsx` onto the shell:
  - item via `mapAgentToCatalogItem`, details via `useEntityDetails`;
  - keep Connection (transport dialog) and Credentials;
  - delete `getAgentOverviewRows` and its tests, and the Connection Overview row (spec: the transport stays visible through the Connection action).
- [x] 4.2 Tests in `src/components/Agents/AgentDetailsPopup/tests/AgentDetailsPopup.test.tsx`:
  - application â†’ About and Overview;
  - application without pricing â†’ no Pricing;
  - model â†’ About, Overview, Pricing and Limits from details + limits;
  - limits failure â†’ no Limits;
  - Connection, Credentials, unavailable, read-only and RTL cases kept.
  - Verification: `npx vitest run src/components/Agents`, `npm run lint`, `npm run typecheck`, then `npm test`.

## 5. Vertical slice: skill popup on catalog content

Depends on 3.

- [x] 5.1 Move `src/components/Skills/SkillDetailsPopup/SkillDetailsPopup.tsx` onto `AddOnDetailsPopup`:
  - item via `mapSkillToCatalogItem`, details via `useEntityDetails` (skills dispatch to `useSkillItemDetails` inside `useCatalogItemDetails`);
  - Details = catalog `ContentTab` from `details.promptContent`; Overview = catalog `OverviewTab`;
  - add the folder line in the header, as for toolsets and agents.

  Delete `SkillDetailsTab.tsx`, `SkillOverviewTab.tsx`, `src/hooks/use-skill-manifest.ts` (+ test), `src/utils/parse-skill-manifest.ts` (+ test, replaced by the chat-hooks parser), `fetchSkillManifest` (+ its dialClient test cases), `src/types/skill-manifest.ts`, `src/types/skill-details.ts` and `getSkillOverviewRows` (+ tests), each only if nothing else imports it.
- [x] 5.2 Update `src/components/Skills/SkillDetailsPopup/tests/SkillDetailsPopup.test.tsx`:
  - Details shows the description and body without frontmatter;
  - Overview shows Specification (when to use) and Details (author, updated, files);
  - listing failure â†’ no Overview;
  - metadata failure â†’ listing author;
  - manifest failure â†’ Retry;
  - Delete, read-only and RTL cases kept.

  Update the skills cases in `src/components/tests/QuickApp2Form.behavior.test.tsx` if they relied on the old manifest mock.
  - Verification: `npx vitest run src/components/Skills src/components/tests`, `npm run lint`, `npm run typecheck`, then `npm test`.

## 6. Cleanup, RTL, docs, final checks

Depends on 3â€“5.

- [x] 6.1 Delete `src/components/common/EntityAboutTab/` and `src/components/common/OverviewList/` (+ tests) if unused. Remove the now-unused i18n keys from design D5, each after a repo-wide `grep -r` (not `git grep`, which skips untracked files).
- [x] 6.2 RTL check: add an RTL case to `ToolsetDetailsPopup.test.tsx` asserting the Overview grid and tab row follow `dir`, and grep the touched files for physical direction classes (`.claude/rules/rtl.md`). File any catalog component that uses physical classes as an upstream issue in `docs/TECH_DEBT.md`, not as a local override.
  - Verification: `npx vitest run src/components/Toolsets src/components/Agents src/components/Skills`, `npm run lint`.
- [x] 6.3 Update `docs/TECH_DEBT.md`:
  - remove the "tool descriptions and input schemas" and "move `AddSkillsModal` onto `AddOnCatalogModal`" items only if they are actually resolved;
  - close the skills `files/` manifest-path item if `resolveSkillManifestFileId` was adopted;
  - add an item for the Connect tab decision if review keeps it excluded;
  - mark `catalog-entity-details` in the coverage matrix.
- [x] 6.4 Final verification: `npm run lint`, `npm run typecheck`, `npm test`, `npm run build` (the popups and catalog tabs stay in lazy chunks), and `openspec validate align-entity-details-with-catalog --strict`.
