## List of known pending improvements:

- [x] Use typescript-sdk for call to Core instead of hardcoded endpoints
- [x] Add OpenSpec and start using SDD. `openspec/` is initialised (see `openspec/config.yaml`, `AGENTS.md`'s "Spec-driven development" section) and new work now starts from a spec change. Coverage of old functionality is still in progress — see the coverage matrix below for which capabilities have a spec and the candidates list for what's left.
- [ ] Test coverage - `@vitest/coverage-v8` is wired up (`vitest.config.ts`), enforced by `npm test`
      (now runs with `--coverage`, so it fails the build below threshold — use `npm run test:watch` for
      a plain watch-mode run without coverage) across all of `src/**/*.{ts,tsx}`. The thresholds are
      a fixed 70% for statements, functions and lines, maintained by hand (no `autoUpdate`). Branches
      are at 67.73% as of 2026-10-08, so that threshold is held at 67 until branch coverage reaches
      70%. Closing the gap is still open work; see `openspec/specs/` / `openspec/changes/` for
      tracking individual pieces of it as they're picked up.
- [ ] react-hook-form usage - should get rid of it. In progress in change `remove-react-hook-form`:
      the root form and every section now run on `useQuickApp2Form` (the Context & Tools card moved into the Advanced Settings popup in `move-feature-toggles-to-advanced-settings`);
      only the dependency removal (tasks 5.x) is open.
- [ ] need to review components, some seem to be unnecessary. No concrete candidate is known right
      now (the last one, the `AgentSkillsField` → `SkillsSelector` proxy, was removed in
      `redesign-skills-selection`); name one here before picking this up.
- [x] Extract the model picker popup out of `components/Orchestrator/ModelField.tsx` into its own
      component — now `components/Orchestrator/ModelCatalogModal` (see the `redesign-model-picker-catalog-list` change).
- [ ] Model picker upstream asks to ai-dial-chat `libs/catalog` / `libs/chat-shared` (from the
      `redesign-model-picker-catalog-list` change):
  - a `Toolbar` prop to hide the grid/list toggle, so the picker can use `Toolbar` instead of its own heading row;
  - Enter/Space row activation in `ListView` (then drop `hooks/use-grid-row-keyboard-select.ts`);
  - `enableRtl` in `ListView` — its ag-grid columns do not follow `dir="rtl"` today;
  - a label override for `EntityTypeLabel`, so the Type cell can be localised;
  - a thinner (or configurable) selected-row border in `ListView` — its 2px border shifts the row
    content, so `ModelCatalogModal` overrides it via the `_selectedRow_` class prefix; drop that
    override once fixed.
- [x] Auth screens other than the sign-in prompt - `ForbiddenPage` and `AuthError` now share
      `LoginScreen`'s layout (`components/common/AuthStateScreen`), use 2.0 buttons and take all copy from
      `common` i18n keys (see the `redesign-auth-state-screens` change).
- [ ] Conversation starters: a starter with only a title or only a prompt is saved to
      `conversation_starters`, but it does not enable the starters settings (that needs both). Needs a
      product decision — either require both fields to save a starter, or enable the settings for any
      non-blank starter (see the `application_conversation-starters` spec, "Partially filled starter").
- [x] Conversation starters: `useQuickApp2Form` no longer exposes `updateStarter` / `removeStarter`
      (only the hook's own tests used them since the starters modal edits a local draft). The starter
      row behaviour stays covered by `src/utils/tests/conversation-starters.test.ts`.
- [x] Add-ons: the same mock as the starters redesign is done: the Toolsets / Agents split in
      `split-agents-and-toolsets` and the Knowledge base row in `redesign-knowledge-base-addon`.
- [ ] Toolsets / Agents follow-ups (from the `split-agents-and-toolsets` change):
  - chat-api ask: tool descriptions and input schemas in the deployment details
    (`ToolsetDetailsDto` carries names only), so the catalog Tools tab — here and in chat — could
    show more than names;
  - done: `AddSkillsModal` now renders the shared `components/common/AddOnCatalogModal` that the
    Add toolset / Add agent pickers use, so its own list/filter/sort code is gone;
  - write a `toolsets_login` spec for the host round-trip (`REQUEST_TOOLSET_LOGIN` /
    `TOOLSET_LOGIN_RESULT`); `toolsets_selection` only specifies the popup's Log in entry point.
  - rename the i18n keys Skills, Toolsets and Agents share (`SkillDetails`, `RemoveSkill`, `SelectSkill`,
    `SkillOverviewTab`, `SkillDetailsTab`, `SkillAuthor`, `SkillTypeLabel`, `RemoveSkillFromApp`) to
    generic names, and update `skills_catalog`, `toolsets_selection` and `agents_selection` with them.
- [ ] Catalog details follow-ups (from the `align-entity-details-with-catalog` change):
  - ai-dial-chat ask: `@epam/ai-dial-chat-hooks/catalog` imports `@epam/ai-dial-attachment-input`
    (`mimeTypesToExtensionLabels`) and `@epam/ai-dial-skill-editor` (`SkillFileNodeKind`) at
    runtime, yet declares both as optional peers. This app installs both only for that; move the two
    symbols into `@epam/ai-dial-chat-shared` (or make the peers required), then drop them here;
  - English text still comes from the catalog where no label prop exists: pricing row labels
    ("Input tokens"…) and the "N tokens" / "K tokens" formatting in `mapEntityDetailsToCatalogDetails`,
    and the markdown code-block / table labels of `AboutTab` and `ContentTab` (`markdownLabels`, not
    passed yet). Ask upstream for label options, then pass translated ones;
  - the Limits tab renders without a reset line: pass `formatResetTime` in
    `useCatalogDetailsLabels` once the editor has a locale-aware date formatter;
  - done: the Connect tab shows when a DIAL Core URL is configured (`dialCoreExternalUrl`;
    `isConnectHidden` otherwise), with translated labels — change `show-connect-tab-in-addon-details`;
  - the skill Details tab shows only `SKILL.md`; its bundled files (`promptContent.files`) are
    dropped. Wiring the catalog file selector needs `onLoadContentFile` from `useCatalogItemDetails`.
- [ ] Knowledge base file popup (change `restyle-knowledge-base-file-picker`):
  - **Search only covers folders already loaded.** The popup search uses the file manager's built-in
    client-side filter over the tree the user has opened (`FileManagerModal.tsx`, no `onSearchFiles`), so a
    file in an unopened folder is not found. A real fix needs server-side or recursive search wired through
    the library's `onSearchFiles` / `searchResults`; `listFiles` supports `recursive`, but `listPublicFiles`
    and `listSharedFiles` (`src/utils/dial-files-api.ts`) do not, so Shared and Organization need an API
    change or a client-side crawl first.
  - **No "+" icon on the popup's Add button.** The target design shows one, but
    `@epam/ai-dial-react-file-manager` (0.3.0-dev.25) renders a plain `ButtonDropdown` in
    `DialFileManagerToolbar` with only `label` and `variant`. Needs an icon prop in the library.
  - **Move/copy between sources is refused under All** (`src/hooks/use-dial-file-sources.ts`): My files,
    Shared and Organization live in different buckets and the files API has no single cross-bucket move.
- [ ] ui-kit: `DialDraggableItem` imports a private bundled copy of react-dnd whose `DndProvider` the
      kit does not export, and it has no keyboard support, so consumers can't use it. Ask the kit for an
      exported, keyboard-accessible sortable list; the starters modal uses `@dnd-kit/sortable` meanwhile.
- [ ] Skills follow-ups (from the `redesign-skills-selection` change):
  - chat-api ask: `version` and `tags` on `SkillMetadataItemDto`. The editor already shows them
    when present (`mapCoreToDialSkill` in `src/utils/dial-client.ts`); until then skills have no
    version and the Add skill popup's Tags column and From topics stay empty;
  - resolve the manifest path through `skillsApi.listSkillFiles` for DIAL Core versions that store
    `SKILL.md` under `files/` — the details now load through ai-dial-chat's `useSkillItemDetails`,
    which still downloads `SKILL.md` at the skill root first, so such skills show the error state;
    fix upstream (download `resolveSkillManifestFileId`'s path) and it applies here too.
- [ ] Add-ons: `AgentsFormSection` opens the Add agent picker when the URL has
      `?agentsAndToolsetsModal=1` (`AddOnsModalQueryParams.Modal` in
      `src/constants/quick-apps.ts`; it opened the merged Agents & Toolsets modal before
      `split-agents-and-toolsets`). Nothing in this repo sets that parameter, and no spec other than
      `agents_selection` describes it — confirm with the host owners whether it should open Add agent or
      Add toolset.
      Confirm whether a host still opens the modal this way. If one does, add the parameter to
      `host-integration` and keep it as a single named constant instead of a one-member enum. If none
      does, remove the parameter and the code that reads it.
- [ ] Themes: `src/context/ThemeContext.tsx` loads themes with `chatApiFetch('/api/themes')`, but
      `@epam/ai-dial-chat-api-client` has a typed `ThemesApi`. Decide whether to switch to it or keep
      the raw call as a documented exception (see "API-layer exceptions and configuration keys" below).
      Switching changes the endpoint, so it needs its own OpenSpec change.
- [ ] Agent transport default: an MCP-capable application with no saved `transport` is saved as
      MCP (`?? DialAppTransportType.MCP` in `src/form/quickApp2Form.ts`), and the agent Settings tab
      shows the same default separately (`src/components/Agents/AgentSettingsTab/AgentSettingsTab.tsx`).
      The two must stay equal; consider one exported constant, e.g. `DEFAULT_AGENT_TRANSPORT` in
      `src/constants/`. Left over from change `agent-settings-tab`.
- [ ] `src/types` follow-ups (left over from the constants/types clean-up):
  - done: one `LoadStatus` enum (`src/types/load-status.ts`) replaces the `DataContext` string union
    and `QuickApp2ModelStatus`, and the string → enum `switch` in `QuickApp2Form.tsx` is gone; the
    `DialEntityType` enum is the `type` discriminant of `DialModel`, `DialToolset` and `DialSkill`;
    the host-protocol locale entry is now `HostLocaleTextEntry` (its redundant cast in
    `dial-client.ts` is dropped). chat-api DTO `type` checks in `dial-client.ts` stay string
    comparisons, since they compare the API's own type;
  - `src/types/quick-app-form.ts` imports `QuickApp2Form` from `@/form/quickApp2Form`, so types depend
    on the form layer. This resolves itself when zod is removed (`remove-react-hook-form`): define
    the form values interface in `src/types/` directly.
- [ ] ...

## Rollout and live verification

Open items carried over from the Next.js → chat-api migration (`docs/TRANSITION_PLAN.md`, now
frozen as history). None of them can be checked from this repo's tooling alone: each needs a running
chat-api, a real admin/chat host, or access outside this repo.

- [ ] **Live spec pass** — walk every `openspec/specs/` capability against a built image embedded in
      both admin and chat (TRANSITION_PLAN §2.8 exit criteria). Typecheck, lint, tests and build are
      green, but that is static verification only.
- [ ] **Session cookie inside the iframe** — chat-api issues the session cookie with `SameSite=Lax`
      (`OVERLAY_ENABLED` unset). Browsers may treat fetches from a cross-site iframe as cross-site and
      drop it. Confirm `GET /api/v1/auth/me` and one mutating call succeed embedded in admin and in chat.
      If they fail, ask ai-dial-chat for a flag that enables `SameSite=None` without `OVERLAY_ENABLED`
      (TRANSITION_PLAN Phase 0 item 2, Risks).
- [ ] **CSP enforce** — confirm chat-api's static server replaces the `__DIAL_CSP_NONCE__`
      placeholder (`vite.config.ts`) with a per-request nonce, run with `CSP_MODE=report-only` and read
      the violation reports, then switch to `enforce` (TRANSITION_PLAN §2.6).
- [ ] **CI registry access** — confirm the runners of the reusable `epam/ai-dial-ci` workflows can
      pull the `ghcr.io/epam/ai-dial-chat-bff` base image and build `--platform=linux/amd64` (the image
      is amd64-only) (TRANSITION_PLAN Phase 0 item 7). The image tag policy itself is tracked in
      "Runtime port and image policy" below.
- [ ] **Provider env var names** — only Keycloak's `AUTH_KEYCLOAK_*` names are verified against a
      live chat-api. Check Azure AD, Google, Auth0, Okta, Cognito and GitLab, and confirm that the `503`
      on `GET /api/themes` seen with `THEMES_URL` came from not setting `THEMES_CONFIG_URL`
      (TRANSITION_PLAN Appendix B).
- [ ] **`liveChatInteraction` flag** — confirm it is enabled on this integration's chat-api
      deployment (TRANSITION_PLAN Appendix C.2).
- [ ] chat-api ask (not blocking): `fetchDialApp` (`src/utils/dial-client.ts`) makes two calls,
      `getDeploymentDetails` for `applicationProperties` and a `listDeployments` scan for the General
      fields, because `ApplicationDetailsDto` has no name/description/icon/topics/version. One response
      carrying both would remove the scan (TRANSITION_PLAN §2.4).

## Documentation and behavior reconciliation backlog

The documentation source-of-truth policy is defined in `AGENTS.md`. Before treating the
existing specs as a complete description of the current product contract, reconcile the
following known discrepancies. These are deliberately tracked separately from capability
coverage: each item may require a product decision, a spec change, a code change, or only a
documentation correction.

- [ ] **Host entry and authentication contract** — decide whether `authProvider` is optional
      or required. `openspec/specs/host-integration/spec.md` describes optional provider pinning,
      while `src/App.tsx` currently shows an error when no provider is present.
- [ ] **Host message protocol** — reconcile the exact handshake and message contract:
      application-name prefixes, connector-generated versus manually posted messages, the README's
      `INIT` claim, and the timing/duplication semantics of `READY`, `readyToSave`, and `loggedOut`.
- [ ] **Save, auto-save, and reset semantics** — document the conditions under which saves are
      ignored, the actual meaning of `SaveSuccess.hasChanges`, and that `RESET` remounts the current
      state rather than refetching from the API.
- [ ] **Stale General fields on auto-save** — a save without a `general` payload (auto-save)
      rebuilds `name`/`description`/`iconUrl`/`topics` from the load-time `_rawForSave` snapshot
      (`src/utils/dial-client.ts` `fetchDialApp`), which is never refreshed after a save. A dirty
      auto-save after a host Metadata edit can therefore revert those fields. `display_version` is
      already excluded (see change `fix-quickapp-display-version-save`).
- [ ] **Origin validation defaults** — decide and document behavior while runtime settings are
      unresolved and when `allowedOrigin` is empty, including the current `*` fallback and its
      security implications.
- [ ] **Authentication error coverage** — reconcile the broad 401/forbidden guarantees in
      `openspec/specs/auth/spec.md` with the different behavior of generated API calls, auth,
      themes, configuration, and file upload/download wrappers.
- [ ] **Runtime port and image policy** — reconcile the Vite development port with the Docker
      image default, and document whether the floating `development` image/client versions are
      local-only or an accepted deployment policy.
- [x] **Coverage status and target** — the "Test coverage" item above and `vitest.config.ts`
      now agree: a fixed, hand-maintained 70% gate (branches held at 67 until they reach 70%).
- [x] **Post-migration source map** — the candidate paths below point to the current `src/`
      tree; the deleted `src/app/api/**` routes are replaced by the chat-api client wrappers that
      took their place.
- [ ] **API-layer exceptions and configuration keys** — document the deliberate raw wrappers
      for auth, themes, and file transfer, and add all runtime custom flags to the configuration
      documentation and eventual `app-configuration` spec.
- [ ] **RTL and i18n status** — distinguish the current English/legacy behavior from the future
      dynamic locale and RTL requirement; do not present deferred behavior as implemented.
- [ ] **Repository conventions and stale comments** — reconcile the documented component path
      convention with the current flat `src/components/QuickApp2Form.tsx`, and correct comments
      that still refer to removed endpoints or pre-migration behavior.

Resolve each observable behavior decision through the normal OpenSpec change workflow. Keep
pure documentation corrections in the same reconciliation change only when they do not alter
the product contract.

## OpenSpec coverage matrix

Track these dimensions separately for every capability:

- **Spec exists** — a current capability spec is present under `openspec/specs/`.
- **Source area mapped** — the spec identifies the current implementation entry points,
  state owners, API wrappers, and relevant domain utilities.
- **Tests exist** — focused tests cover the capability's important observable behavior.
- **Behavior verified** — the implementation has been checked against the spec, including
  relevant integration or manual host/API verification where unit tests are insufficient.

| Capability                          | Spec exists | Source area mapped | Tests exist | Behavior verified |
| ----------------------------------- | ----------- | ------------------ | ----------- | ----------------- |
| `host-integration`                  | Yes         | Partial            | Partial     | Reconcile         |
| `auth`                              | Yes         | Partial            | Partial     | Reconcile         |
| `application_editing`               | Partial     | Yes                | Partial     | Planned           |
| `application_editor-layout`         | Yes         | Yes                | Partial     | Planned           |
| `application_user-attachments`      | Yes         | Yes                | Partial     | Planned           |
| `deployment_docker-image`           | Yes         | Yes                | No          | Planned           |
| `context-files`                     | No          | Yes                | Partial     | Planned           |
| `toolsets_selection`                | Yes         | Yes                | Partial     | Planned           |
| `agents_selection`                  | Yes         | Yes                | Partial     | Planned           |
| `toolsets_login`                    | No          | Yes                | Partial     | Planned           |
| `application_credentials`           | No          | Yes                | Partial     | Planned           |
| `skills_catalog`                    | Yes         | Yes                | Partial     | Planned           |
| `catalog-entity-details`            | Yes         | Yes                | Yes         | Planned           |
| `application_knowledge-base`        | Yes         | Yes                | Partial     | Planned           |
| `orchestrator_model-selection`      | Yes         | Yes                | Partial     | Planned           |
| `application_advanced-settings`     | Yes         | Yes                | Partial     | Planned           |
| `application_conversation-starters` | Yes         | Yes                | Partial     | Planned           |
| `app-configuration`                 | No          | Yes                | Partial     | Planned           |
| `theming`                           | No          | Yes                | Partial     | Planned           |
| `i18n`                              | No          | Yes                | Partial     | Planned           |

A spec existing does not imply that it has been verified against the current implementation.
Update this matrix as each capability is explored, specified, tested, and checked.

## OpenSpec spec creation candidates

### Application editing/persistence (survives migration — core domain logic)

- src/components/EditorClient/EditorClient.tsx, src/components/QuickApp2Form.tsx, src/form/**, src/utils/application.ts,
  has-quick-app-changes.ts, get-updated-at-timestamp.ts
- Covers: load/save/auto-save lifecycle, dirty-state tracking, application_properties serialization
- Proposed: application_editing (leaves room for a sibling below)
- Started in `openspec/specs/application_editing/spec.md` (change `fix-quickapp-display-version-save`), which only covers how host-supplied General-step
  fields (including `display_version` → `version`) are persisted on save. The rest of the lifecycle is
  still uncovered.

### Application credentials (recent feature, git log: "feat: support application credentials #140")

- src/utils/request-application-credentials.ts, src/hooks/use-application-authentication.ts,
  src/components/Agents/AgentDetailsPopup/** (credentials mode), ties to host-integration's
  RequestApplicationCredentials message + applicationCredentials query param
- The agent-side UI (the Credentials action under the details header, which closes the popup
  before the host shows its forms) is specified in `agents_selection` "Agent details popup"
  (change `agent-settings-tab`); the host round trip itself is still unspecified.
- Possible follow-up: show the credential forms inline (catalog `ApplicationCredentials`), with
  OAuth through a new host message as toolset login does. Needs a paired ai-dial-chat change.
- Proposed: application_credentials (sibling of application_editing)

### Toolsets — selection + host-mediated login/logout

- src/components/Toolsets/** (row, Add toolset picker, details popup with Tools and Log in),
  src/utils/get-add-on-kind.ts, src/utils/map-toolset-to-catalog-item.ts,
  src/hooks/use-entity-details.ts + src/utils/catalog-details-api.ts (details and tool names via the
  catalog hooks), src/hooks/use-toolset-credentials.ts, src/utils/apply-toolset-auth-result.ts, ties to
  host-integration's RequestToolsetLogin/RequestToolsetLogout. (Historical: the
  `src/app/api/dial-toolsets/{signin,signout}` routes and `components/common/AgentAndToolsetSelector/**`
  are gone.)
- Two real sub-concerns: selecting/configuring a toolset vs. the login/logout round-trip with the host
- Proposed: toolsets_selection, toolsets_login (this is the domain your original naming example already named)
- **Spec written** (`openspec/specs/toolsets_selection`, from archived change `split-agents-and-toolsets`) and its sibling
  `agents_selection` (src/components/Agents/**, src/utils/map-agent-to-catalog-item.ts). The
  `toolsets_login` host round-trip is still unspecified.

### Skills

- `fetchDialSkills` in src/utils/dial-client.ts, src/components/AgentSkills/**, src/components/Skills/**;
  the skill details (`SKILL.md`) load through src/hooks/use-entity-details.ts and ai-dial-chat's catalog hooks
- Proposed: skills_catalog (standalone slug skills also defensible if no sibling ever appears)
- **Spec written** (`openspec/specs/skills_catalog`, from archived change `redesign-skills-selection`): the attached
  skills list with its hover remove button, the skill details popup with Delete, and the Add skill popup.

### Orchestrator / model selection

- src/components/Orchestrator/**, `fetchDialModels` in src/utils/dial-client.ts, ORCHESTRATOR_ATTACHMENT_STRATEGY_VALUE in constants/quick-apps.ts
- Proposed: orchestrator_model-selection
- **Spec written** (`openspec/specs/orchestrator_model-selection`, from archived change `redesign-default-model-card`); it covers the Default model block
  (selected-model card and the Change action) and, from change `redesign-model-picker-catalog-list`, the
  model picker popup (catalog list, search, From filter, sort, Add/Cancel), and, from change
  `specify-configuration-controls-and-starters`, the Temperature and Process files controls (moved to
  `application_advanced-settings` by change `move-model-controls-to-advanced-settings`).

### Context files (file manager)

- utils/dial-files-api.ts (list, upload, download, rename, delete, create-folder, list-shared), hooks/use-dial-file-manager.ts, utils/dial-file-manager.ts,
  components/common/FilesSelector/** (the file-manager modal; the Add-ons row lives in components/KnowledgeBase/), types/dial-files.ts, dial-file-path.ts, file-download.ts, file-name.ts, decode-file-url.ts, safe-decode-uri.ts
- Standalone top-level concept, no sibling domain → context-files

### Theming

- context/ThemeContext.tsx (fetches chat-api's `/api/themes` via utils/chat-api-fetch.ts), utils/apply-theme-colors.ts, resolve-icon-url.ts, ties to
  host-integration's theme query param
- Standalone → theming

### i18n

- src/i18n/**, I18nProvider.tsx, hooks/use-translation.ts, utils/get-localized-text.ts
- Standalone → i18n

### Feature flags / runtime config

- utils/user-config.ts, `fetchAppSettings` in utils/dial-client.ts, utils/auth-api.ts (session / current user)
- Standalone → app-configuration (name's debatable — open to a better slug)

### Advanced settings

- src/components/Settings/** (the Advanced Settings popup; the old src/components/AdvancedSettings/** section was removed)
- **Spec written** (`openspec/specs/application_advanced-settings`, from change `populate-advanced-settings-popup`): max attachments, Time awareness and Built-in file tools in the popup; from change `move-model-controls-to-advanced-settings`, also the orchestrator Temperature slider and Allow orchestrator to process files switch.

### Conversation starters

- src/components/ConversationStarters/** (the Conversation starters row in Add-ons and the Set up
  conversation starters modal; the old collapsible main-column section was removed)
- **Spec written** (`openspec/specs/application_conversation-starters`, from change
  `specify-configuration-controls-and-starters`; reshaped by `redesign-conversation-starters`:
  Add-ons row, draft modal, drag-to-reorder, 30-character labels). The half-filled-starter item in
  the backlog above is still open.

### User attachments

- src/components/Attachments/** (the Attachments row in Configuration; the old src/components/UserAttachments/** section was removed)
- **Spec written** (`openspec/specs/application_user-attachments`, from change `move-attachments-to-settings`): Attachments switch and the admin-style Attachment types MIME tag input with suggestions (ui-kit `AutocompleteTagInput`; suggestions in src/constants/attachment-types.ts). Max attachments stays in the Advanced Settings popup (`application_advanced-settings`).
