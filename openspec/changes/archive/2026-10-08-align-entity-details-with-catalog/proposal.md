## Why

Our details popups don't show the same content as the DIAL catalog.

- **Toolsets and agents** have home-grown tabs: a Markdown About, a flat Overview built from the listing (`src/utils/map-toolset-to-catalog-item.ts:113`, `src/utils/map-agent-to-catalog-item.ts:68`), and a names-only Tools list (`src/components/Toolsets/ToolsetDetailsPopup/ToolsetToolsTab.tsx`).
- **Skills** have a flat Author/Folder/Updated Overview (`src/utils/map-skill-to-catalog-item.ts:70`).
- **The catalog** shows Overview sections (Capabilities, Specification: provider, vendor, license, auth, hosted by, created), Pricing and Limits for models, and the Tools tab component. For skills it shows a Specification section built from `SKILL.md` (when to use, allowed tools, bundled resources). Its tab set is data-driven: `libs/catalog/src/components/Details/DetailsPanel.tsx:828-890`.

The same entity should read the same in the chat catalog and in the editor. Today it doesn't, and every catalog improvement has to be re-implemented here.

## What Changes

- **Catalog tab content in our popups.** The skill, toolset and agent details popups keep their centred shell, as in the design:
  - identity header with the folder line;
  - Log in / Log out, Connection and Credentials actions;
  - Delete (detach) / Close footer.

  Below the header they render the catalog's own tab components, with the catalog's tab order and visibility rule, fed by the catalog's own data mapping:
  - **Toolset:** About, Overview, Tools.
  - **Agent (application / MCP agent):** About, Overview, plus Pricing when the details carry it.
  - **Model:** About, Overview, Pricing, Limits.
  - **Skill:** Details (`ContentTab`, as today) and an Overview in the catalog format, with Specification and Details sections.
- **Data from chat-api, as chat does it:**
  - toolsets, agents and models: `GET /api/v1/deployments/{id}/details` when the popup opens;
  - models: also `GET /api/v1/deployments/{id}/limits`;
  - skills: the `SKILL.md` download already made, plus `GET /api/v1/skills/metadata` and `GET /api/v1/skills/files?recursive=true`, in parallel, as chat does. Overview needs the authoritative author and the package file count.

  While details load, the popup shows About from the listing and a loading indicator next to the tabs, as `DetailsPanel` does (`isDetailsLoading`).
- **Data from the published `@epam/ai-dial-chat-hooks/catalog`.** On npm it is `latest` 1.1.14 / `development` 1.2.0-dev.x, with all peers optional. It already exports what chat uses:
  - `useCatalogItemDetails`: deployment details, plus limits for models, mapped to `CatalogItemTabData`;
  - `useSkillItemDetails`: manifest, file listing and metadata, then `buildSkillOverview`.

  Both take an injected `CatalogDetailsApi` / `SkillDetailsApi` port, which this app implements over its `@epam/ai-dial-chat-api-client` instances. Nothing has to move between packages. (Moving the mappers into `libs/catalog` would also break ai-dial-chat's §Library isolation, which forbids that lib from depending on chat-api DTOs.)
- **Upstream dependency (ai-dial-chat change `export-catalog-details-tabs`, branch `feat/catalog-details-tabs-export`):**
  - `@epam/ai-dial-catalog` exports `AboutTab`, `OverviewTab`, `PricingTab` and `ToolsTab` (with a `labels` prop for its column headings), next to the existing `ContentTab` and `LimitsTab`;
  - `@epam/ai-dial-catalog/mapping` exports `getCatalogDetailsTabs(item, { isConnectHidden })`, which `DetailsPanel` itself now uses;
  - `@epam/ai-dial-chat-hooks` gains `entityDetailsLabels` on `useCatalogItemDetails` and `labels` on `mapEntityDetailsToCatalogDetails`, with English defaults. Today the 24 Overview section titles and spec labels are hardcoded, unlike the limits and skill mappers.
  - The slices that render catalog tabs are **blocked** until releases with these additions are installed.
- **Removed here:** `EntityAboutTab`, `OverviewList`, `ToolsetToolsTab`, `useToolsetTools`, `fetchToolsetToolNames`, the `getToolsetOverviewRows` / `getAgentOverviewRows` / `getSkillOverviewRows` builders and their tests, plus the i18n keys only they use.
- **BREAKING (UI only):**
  - Tools no longer has its own search and count; the catalog `ToolsTab` lists tool definitions.
  - The skill Overview drops the flat Folder and Version rows. The folder stays in the popup header, as for toolsets and agents.

## Non-goals

- The catalog's **Connect** (API) tab. It targets API consumers, not app editors; this is an assumption to confirm in review.
- Using the catalog's `DetailsPanel` slide-in, favourites, share, publish or resource delete.
- Admin credential management (organization-level keys) from the toolset popup.
- Changing pickers, rows, form values or saved config.
- Showing a skill's bundled files tree in the Details tab. The catalog supports it through `ContentTab` files, but it stays a follow-up, as today.

## Alternatives considered

- **Catalog `DetailsPanel` as-is.** Its content is already identical, with no upstream wait. Rejected by product decision: it is a slide-in, not the centred popup in the design. Detach-Delete, Connection and our Log in would have to be bolted on through `renderCredentials` while a dozen publish/share/favourite props are switched off.
- **Copy chat's mappers into `src/utils/`.** The data matches immediately, but about 650 lines are duplicated and will drift from chat. The tab components would still need the upstream export. Rejected.
- **Keep the home-grown tabs and only enrich the data** (conservative baseline). Smallest diff, but the rendering keeps diverging from the catalog, which is the problem being solved. Rejected.

## Acceptance criteria

- **Toolset popup:** About, then Overview with the catalog's Capabilities / Specification sections from `/deployments/{id}/details`, then the catalog Tools tab, in the same order and with the same labels as the chat catalog for that toolset.
- **Model popup** (Agents row): About, Overview, Pricing and Limits. Limits come from `/deployments/{id}/limits`.
- **Agent popup:** About and Overview, plus Pricing only when the details carry pricing.
- **Skill popup:** Details (`SKILL.md`) and an Overview with Specification (when to use, allowed tools, bundled resources) and Details (author, updated, file count) sections, as in the chat catalog.
- **Missing data:** a tab whose data the details response lacks is not shown, the catalog rule. A failed details request still shows About, with a Retry, and the header actions and footer stay usable.
- **Unchanged:** popup header, actions (Log in / Connection / Credentials), Delete and Close behave as today, and nothing else is fetched until a popup opens.
- **RTL:** the catalog tabs follow `dir` as they do in the catalog, and our shell is unchanged.

## Capabilities

### New Capabilities

- `catalog-entity-details`: the rules shared by the three popups. Catalog tab components and tab rule, the deployment details / limits fetch and mapping, loading and failure, and localised catalog text.

### Modified Capabilities

- `toolsets_selection`: "Toolset About and Overview tabs" and "Toolset Tools tab" are replaced by catalog-rendered content; "Toolset details popup" gets the data-driven tab set and the loading state.
- `agents_selection`: "Agent About and Overview tabs" is replaced by catalog-rendered content including Pricing / Limits; "Agent details popup" gets the data-driven tab set.
- `skills_catalog`: "Skill overview" moves to the catalog's sectioned format (Specification from `SKILL.md`, Details with author, updated and file count) and adds the metadata and file-listing requests. The popup layout and the Details tab are unchanged.

## Impact

- **Code:**
  - `src/components/common/AddOnDetailsPopup/` takes a catalog `CatalogItem` with `details` and renders the catalog tabs;
  - `src/components/Toolsets/ToolsetDetailsPopup/`, `src/components/Agents/AgentDetailsPopup/` and `src/components/Skills/SkillDetailsPopup/` (+ tests);
  - a new hook, `src/hooks/use-entity-details.ts`, fetches details (and limits) and maps them with the catalog mappers;
  - a new `src/utils/catalog-details-api.ts` adapts this app's chat-api client to chat-hooks' `CatalogDetailsApi` port; `fetchToolsetToolNames` and `fetchSkillManifest` go.
  - Deletions are listed under What Changes.
- **API (chat-api):** reads only, all made when a popup opens. No new endpoints.
  - `deploymentsApi.getDeploymentDetails`, already used for tool names;
  - `deploymentsApi.getDeploymentLimits`, new here, models only;
  - `skillsApi.getSkillMetadata` and `skillsApi.listSkillFiles`, new here, skills only.
- **Dependencies:** a newer `@epam/ai-dial-catalog` with the exports above (upstream, ai-dial-chat). No new third-party packages.
- **Auth / host integration:** none. Credential actions are unchanged.
- **i18n (`quickAppEditor`):**
  - New keys for the catalog tab and section labels the catalog takes as text props: Overview section titles and spec labels passed to the mappers, Yes/No, the Pricing/Limits labels, and the loading label.
  - Removed: `SearchTools`, `ToolsCount`, `LoadingTools`, `FailedToLoadTools`, `NoToolsReported`, `NoDescription`, `DetailsAuthentication`, `AuthTypeOAuth`, and `SkillAuthor` if no longer used.
- **RTL:** our shell is unchanged. The catalog tabs inherit the catalog's direction handling; `ListView`'s missing `enableRtl` is already tracked in `docs/TECH_DEBT.md`, and the details tabs have no ag-grid.
- **Rollback:** revert the change and pin the previous catalog version. Saved data is untouched.
