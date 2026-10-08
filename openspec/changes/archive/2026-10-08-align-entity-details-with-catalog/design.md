## Context

**Today (after `split-agents-and-toolsets`).** All three details popups use our shell, `src/components/common/AddOnDetailsPopup/AddOnDetailsPopup.tsx`: header, actions, banner, ui-kit `Tabs`, footer. Their panels are home-grown:

- `EntityAboutTab`: Markdown + `TopicsLine`.
- `OverviewList`, fed by `getToolsetOverviewRows` / `getAgentOverviewRows`, which are built from the listing only.
- `ToolsetToolsTab` + `useToolsetTools`: tool names from `GET /deployments/{id}/details`.
- The skill popup: `SkillDetailsTab` (catalog `ContentTab` + `useSkillManifest`) and `SkillOverviewTab` (`getSkillOverviewRows`).

**Catalog reference (ai-dial-chat):**

- `libs/catalog/src/components/Details/DetailsPanel.tsx:828-890` builds the tab list from `item.details`:
  - About, unless content-first;
  - Content, for content-first types and prompts;
  - Overview, Pricing, Limits and Tools, each when its data is present;
  - Connect last, when there is a connectable endpoint.
- Lines 1340-1414 render `AboutTab`, `ContentTab`, `Overview`, `Pricing`, `LimitsTab`, `ApiDetails` and `Tools`.
- Data comes from `libs/chat-hooks/src/catalog/useCatalogItemDetails.ts:146-204`:
  - deployments: `getDeploymentDetails`, plus `getDeploymentLimits` for models, then `mapDeploymentDetailsDtoToEntityDetails` → `mapEntityDetailsToCatalogDetails`, plus `mapDeploymentLimitsDtoToCatalogLimits`;
  - skills: `useSkillItemDetails.ts:120-180` downloads `SKILL.md`, lists files recursively and gets metadata, then calls `buildSkillOverview`.

**Constraints:**

- `@epam/ai-dial-catalog` 1.2.0-dev.310 exports only `ContentTab` and `LimitsTab` among the details tabs (`index.d.ts:43-46`).
- The mappers live in the private `@epam/ai-dial-chat-hooks`. The skill frontmatter parser is private as well.
- `mapEntityDetailsToCatalogDetails` hardcodes English labels (`map-entity-details-to-catalog.ts:69-135`), while the limits and skill mappers take label objects.

**User decisions:**

- Upstream export (not `DetailsPanel`, not a local copy).
- Scope: skills, toolsets, agents, and models including Pricing/Limits.

## Goals / Non-Goals

**Goals:**

- The same tabs, order, visibility and content as the chat catalog for every add-on entity, rendered by catalog components from catalog-mapped data.
- Keep our popup shell and all its behaviour (actions, Delete-detach, banners, focus).
- Delete the home-grown tab code.

**Non-Goals:** the Connect tab; `DetailsPanel`; admin credentials; the skill file tree; pickers, rows and saved data (see proposal).

## Decisions

### D1. Upstream contract (ai-dial-chat)

Implemented in the ai-dial-chat OpenSpec change `export-catalog-details-tabs` (branch `feat/catalog-details-tabs-export`, worktree `C:\projects\ai-dial-chat-catalog-tabs`). All additions are additive:

```ts
// @epam/ai-dial-catalog
export { AboutTab, OverviewTab, PricingTab, ToolsTab };  // + existing ContentTab, LimitsTab
export type { AboutTabProps, OverviewTabProps, PricingTabProps, ToolsTabProps, ToolsLabels };

// @epam/ai-dial-catalog/mapping (also re-exported from the root)
export { CatalogDetailsTab };
export const getCatalogDetailsTabs: (
  item: CatalogItem,
  options?: { isConnectHidden?: boolean },
) => CatalogDetailsTab[];                                 // the DetailsPanel rule, extracted; DetailsPanel uses it

// @epam/ai-dial-chat-hooks/catalog (already published; one addition)
export interface EntityDetailsLabels { /* 24 section titles and spec labels */ }
export const DEFAULT_ENTITY_DETAILS_LABELS: EntityDetailsLabels;
export const mapEntityDetailsToCatalogDetails: (
  details: EntitySpecificDetails,
  labels?: Partial<EntityDetailsLabels>,                  // NEW
) => CatalogItemTabData;
// useCatalogItemDetails(options) gains `entityDetailsLabels?: Partial<EntityDetailsLabels>`
```

- **Already public and unchanged:** `useCatalogItemDetails` and `useSkillItemDetails` with their `CatalogDetailsApi` / `SkillDetailsApi` ports, `mapDeploymentLimitsDtoToCatalogLimits` and `buildSkillOverview`.
- **No mapper moves.** ai-dial-chat's §Library isolation forbids `libs/catalog` from depending on chat-api DTOs, and `chat-hooks` is the sanctioned, published home.
- **Dependency.** This app adds `@epam/ai-dial-chat-hooks` and imports only from the `/catalog` subpath. Its peers are all declared optional, but the subpath imports two of them at runtime: `@epam/ai-dial-attachment-input` (`mimeTypesToExtensionLabels`) and `@epam/ai-dial-skill-editor` (`SkillFileNodeKind`). Both are installed here at the same release; tracked upstream in `docs/TECH_DEBT.md`. Bundle check (6.4): the main chunk is unchanged; the popups' lazy chunks grow by about 290 KB raw (`AddOnDetailsPopup` 163 KB, shared `ItemHeader` +125 KB).
- **Release gate.** The slices that render catalog tabs (§3–§5) and the label wiring wait for releases of both packages with these additions.

_Alternative:_ an exported `CatalogDetailsTabs` component (tab row + panels). Not chosen upstream: hosts with their own popup shell need their own tab row. It can be added later.

### D2. Popup shell API

`AddOnDetailsPopup` stops taking `tabs: { id, label, panel }[]` built by each popup. It takes:

- `item: CatalogItem`, with `details` when loaded;
- `detailsStatus: DetailsStatus`;
- `onRetry`;
- `unavailableText`, for an entity no longer listed.

The translated catalog texts come from `useCatalogDetailsLabels()` inside the shell rather than a `labels` prop: all three popups would pass the same object. It computes the tab ids with `getCatalogDetailsTabs(item, { isConnectHidden: true })` and renders the matching catalog component per tab. Each popup supplies only the identity, actions, banner, footer callbacks and its `CatalogItem`. The unavailable state (no entity) stays a shell prop that replaces the tabs with `NoDataContent`. The skill popup moves onto the same shell, so all three render identically.

_Alternative:_ keep `tabs` and have each popup build catalog panels. Rejected: it repeats the tab rule three times, and the rule is exactly what must match the catalog.

### D3. Data hooks

- **`useEntityDetails(entity?: DialModel | DialToolset)`** (`src/hooks/use-entity-details.ts`) is a thin wrapper over `useCatalogItemDetails` from `@epam/ai-dial-chat-hooks/catalog`.
  - It passes a memoised `CatalogDetailsApi` adapter (`src/utils/catalog-details-api.ts`) built on this app's `deploymentsApi` and `skillsApi`. The adapter re-encodes ids with `encodeDialPath`, as the other calls do.
  - It passes the translated `entityDetailsLabels`, `deploymentLimitsLabels`, `skillOverviewLabels` and `promptOverviewLabels`, plus `isAdmin: false` and `dialCoreExternalUrl: null`, since Connect is hidden.
  - It calls `onFetchDetails(catalogItem)` on open and owns `{ status: DetailsStatus, details?, retry }`, with the request-key / cancelled-flag / stale-drop pattern of the former `useSkillManifest`.
  - Details are fetched on open, not on tab selection: the tab list itself depends on them.
- **Skills** go through the same `onFetchDetails`: `useCatalogItemDetails` dispatches skills to `useSkillItemDetails`, which downloads the manifest, lists files recursively, reads metadata and builds `promptContent` (+ file tree) and `overview`. One hook therefore serves all three popups, and `useSkillManifest`, `parseSkillManifest` and their tests are deleted. Its `resolveSkillManifestFileId` handling also closes the `docs/TECH_DEBT.md` follow-up about `SKILL.md` stored under `files/`.
- **Client:** the adapter implements the six port methods (`getDeploymentDetails`, `getDeploymentLimits`, `getPrompt` / `getPublicPrompt` as never-called stubs that reject, `downloadSkillFile`, `listSkillFiles`, `getSkillMetadata`). `fetchToolsetToolNames` and `fetchSkillManifest` are deleted.

### D4. CatalogItem per popup

The popups build their `CatalogItem` with the existing mappers (`mapToolsetToCatalogItem`, `mapAgentToCatalogItem`, `mapSkillToCatalogItem`), merged with `details` from the hooks. Toolset `credentials` stay on the item, so the catalog `CredentialsBadge` and our header badge read the same data. The `get*OverviewRows` builders, `filterToolNames` and the Overview label interfaces are deleted.

### D5. i18n

**New `quickAppEditor` keys:**

- Tab labels not already present: `PricingTab`, `LimitsTab`.
- The `EntityDetailsLabels` set for `mapEntityDetailsToCatalogDetails`, named `Overview*`:
  - sections: `OverviewCapabilities`, `OverviewSpecification`, `OverviewConfiguration`;
  - specs: `OverviewProvider`, `OverviewVendor`, `OverviewLicense`, `OverviewKnowledgeCutoff`, `OverviewParameters`, `OverviewHostedBy`, `OverviewReleaseDate`, `OverviewContextWindow`, `OverviewMaxOutputTokens`, `OverviewInputModalities`, `OverviewInputAttachments`, `OverviewTools`, `OverviewParallelToolCalls`, `OverviewReasoningEfforts`, `OverviewSkills`, `OverviewAuthentication`, `OverviewRoutes`, `OverviewConfigurationSchema`, `OverviewAuthorizationEndpoint`, `OverviewTokenEndpoint`, `OverviewOAuthScopes`.
- `OverviewYes`, `OverviewNo`.
- Skill overview: `SkillSpecificationSection`, `SkillDetailsSection`, `SkillWhenToUse`, `SkillAllowedTools`, `SkillBundledResources`, `SkillFileCount`.
- `LoadingDetails`, `FailedToLoadDetails`.
- The `DeploymentLimitsLabels` keys, named `Limits*`.

The `Overview*` keys map 1:1 onto the 24 released `EntityDetailsLabels` fields (`capabilitiesTitle` … `oauthScopes`).

**Reused:** `AboutTab`, `SkillDetailsTab`, `SkillOverviewTab`, `ToolsTab`, `SkillAuthor`, `SkillUpdated`, `Retry`.

**Removed after a repo-wide search:** `SearchTools`, `ToolsCount` (+ plural entries), `LoadingTools`, `FailedToLoadTools`, `NoToolsReported`, `NoDescription`, `DetailsAuthentication`, `AuthTypeOAuth`, `LoadingSkillContent`/`FailedToLoadSkillContent` (replaced by the shared details states) and `SkillFolder`/`SkillVersion`.

Keys stay unique strings, because `no-duplicate-enum-values` applies.

### D6. RTL

The catalog's details components already render inside chat's RTL-aware layout (logical classes). Our shell is unchanged. An RTL test asserts the Overview grid uses logical alignment and the tab order follows `dir`. If a catalog component is found using physical classes, that becomes an upstream fix, not a local override.

## Risks / Trade-offs

- [The upstream release slips, or the export shape differs] → Nothing ships half-way. The change waits (§1 gate), and today's popups keep working. If upstream picks D1's alternative component, tasks §3–§5 adapt to it.
- [Catalog mappers depend on `DeploymentDetailsDto` types, which `/mapping` doesn't have] → Resolved upstream (peer dependency or structural types). We pass our client's DTOs as-is.
- [Details are fetched on open even if the user only reads About] → The tab set depends on them, and chat-api caches for 60 s. It is one request per open, as in chat.
- [Skills go from 1 to 3 requests per open] → Same as the chat catalog. Listing failure only hides Overview.
- [Catalog English defaults leak] → A test renders every tab with a `t` mock that prefixes keys and asserts no unprefixed catalog default label appears.
- [Losing the editor's tool search] → Accepted: the catalog `ToolsTab` is the target. A search there would be an upstream feature.

## Migration Plan

1. Upstream PR to ai-dial-chat (D1) and its release.
2. Bump `@epam/ai-dial-catalog` here.
3. Land §2–§6 in order.

UI only; no data migration. Rollback: revert and pin the previous catalog version.

## Open Questions

- Connect tab: excluded as an assumption. Confirm in review that editors don't need endpoint snippets.
- Does upstream also export `resolveSkillManifestFileId` / `buildSkillContentTree`? If so, the `files/` manifest path follow-up and the optional file tree become cheap; both stay out of scope here.
