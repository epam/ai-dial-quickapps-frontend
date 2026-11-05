## List of known pending improvements:

- [ ] Model picker upstream asks to ai-dial-chat `libs/catalog` / `libs/chat-shared` (from the
      `redesign-model-picker-catalog-list` change):
  - `enableRtl` in `ListView` — its ag-grid columns do not follow `dir="rtl"` today;
  - a label override for `EntityTypeLabel`, so the Type cell can be localised.
- [ ] Toolsets / Agents follow-ups (from the `split-agents-and-toolsets` change):
  - chat-api ask: tool descriptions and input schemas in the deployment details
    (`ToolsetDetailsDto` carries names only), so the catalog Tools tab — here and in chat — could
    show more than names;
  - ai-dial-chat ask: a light `@epam/ai-dial-catalog` subpath for `AddOnListItem` and
    `useListRemoveFocus`. The root entry brings the catalog's markdown chunk (~480 kB) with them,
    so the Toolsets, Agents and Skills lists load lazily; with a light entry they could load with
    the editor again.
- [ ] Catalog details follow-ups (from the `align-entity-details-with-catalog` change):
  - ai-dial-chat ask: `@epam/ai-dial-chat-hooks/catalog` imports `@epam/ai-dial-attachment-input`
    (`mimeTypesToExtensionLabels`) and `@epam/ai-dial-skill-editor` (`SkillFileNodeKind`) at
    runtime, yet declares both as optional peers. This app installs both only for that; move the two
    symbols into `@epam/ai-dial-chat-shared` (or make the peers required), then drop them here;
  - ai-dial-chat ask: English text still comes from `mapEntityDetailsToCatalogDetails`
    (`@epam/ai-dial-chat-hooks/catalog`) with no label option: the pricing row labels ("Input
    tokens"…) and the "N tokens" / "K tokens" formatting. Add label options there, then pass
    translated ones;
  - the Limits tab renders without a reset line: pass `formatResetTime` in the
    `deploymentLimits` labels of `useCatalogDetailsLabels` (chat-hooks `DeploymentLimitsLabels`)
    once the editor has a locale-aware date formatter.
- [ ] Knowledge base file popup (change `restyle-knowledge-base-file-picker`):
  - **Search only covers folders already loaded.** The popup search uses the file manager's built-in
    client-side filter over the tree the user has opened (`FileManagerModal.tsx`, no `onSearchFiles`), so a
    file in an unopened folder is not found. A real fix needs server-side or recursive search wired through
    the library's `onSearchFiles` / `searchResults`. chat-api has no file search endpoint. `listFiles` and
    `listPublicFiles` take `recursive` (`src/utils/dial-files-api.ts`; no caller asks for it yet), but
    `listSharedFiles` does not, so Shared needs an API change or a client-side crawl first.
  - **No "+" icon on the popup's Add button.** The target design shows one, but
    `@epam/ai-dial-react-file-manager` (0.4.0-dev.26) gives `DialFileManagerToolbar` no icon for the
    New button (only its dropdown items take one). Needs an icon prop in the library.
  - **Move/copy between sources is refused under All** (`src/hooks/use-dial-file-sources.ts`): My files,
    Shared and Organization live in different buckets and the files API has no single cross-bucket move.
- [ ] ui-kit ask: an exported, keyboard-accessible sortable list (0.16 removed `DialDraggableItem`
      with no replacement). The starters modal uses `@dnd-kit/sortable` with its keyboard sensor
      meanwhile.
- [ ] Skills follow-ups (from the `redesign-skills-selection` change):
  - chat-api ask: `version` and `tags` on `SkillMetadataItemDto`. The editor already shows them
    when present (`mapCoreToDialSkill` in `src/utils/dial-client.ts`); until then skills have no
    version and the Add skill popup's Tags column and From topics stay empty;
  - resolve the manifest path through `skillsApi.listSkillFiles` for DIAL Core versions that store
    `SKILL.md` under `files/` — the details now load through ai-dial-chat's `useSkillItemDetails`,
    which still downloads `SKILL.md` at the skill root first, so such skills show the error state;
    fix upstream (download `resolveSkillManifestFileId`'s path) and it applies here too.
- [ ] Skill file preview follow-ups (from the `render-skill-file-previews` change):
  - ai-dial-chat ask: export the skill file preview shell (`SkillDetailsFilePreview` /
    `SkillFilePreview` in `apps/chat`) from a published lib, so
    `src/components/SkillFilePreview/SkillFilePreview.tsx` and
    `src/utils/skill-file-canvas-resolvers.ts` can drop their copy;
  - verify in a deployed environment that chat-api serves `/api/v1/files/html-preview-frame` to
    this app (`HTML_PREVIEW_FRAME_URL`); if not, drop `htmlSrcdocHostUrl` so `.html` skill files
    render through plain `srcdoc`.
- [ ] Add-ons: `AgentsFormSection` opens the Add agent picker when the URL has
      `?agentsAndToolsetsModal=1` (`AddOnsModalQueryParams.Modal` in
      `src/constants/quick-apps.ts`; it opened the merged Agents & Toolsets modal before
      `split-agents-and-toolsets`). Nothing in this repo sets that parameter, and no spec other than
      `agents_selection` describes it — confirm with the host owners whether it should open Add agent or
      Add toolset.
      Confirm whether a host still opens the modal this way. If one does, add the parameter to
      `host-integration` and keep it as a single named constant instead of a one-member enum. If none
      does, remove the parameter and the code that reads it.

## Findings from `specify-uncovered-capabilities`

Behaviour found while writing the specs that looks unintended or contradicts another document.
None of it is specified as intended; each needs a decision (and, for a behaviour change, its own
OpenSpec change).

- [ ] **Application credentials stay "required" after sign-in** — any non-empty external-services
      list counts, including `authenticationType: NONE` and already-authenticated services
      (`fetchApplicationRequiresAuthentication` in `dial-client.ts`). Fixable here:
      `ApplicationExternalServiceDto` carries `authenticationType` and the optional
      `userLevelAuthStatus` / `globalAuthStatus` (`SIGNED_IN` …).
- [ ] **Toolset login promises can hang** — no timeout when the host never answers, and a second
      request overwrites the pending one so the first never settles
      (`use-toolset-credentials.ts:94`). An unsolicited `TOOLSET_LOGOUT_RESULT` is not applied.
- [ ] **File manager**:
  - Copy is listed in `application_knowledge-base` but `onCopyFiles` is never passed.
  - A folder or multi-item download opens the save picker before it fails, leaving an open writable.
  - Deleting an ancestor of the open folder moves up only one level.
  - Listings never page past `limit: 1000`.
  - A mixed or fully cancelled upload shows the success message.
  - The conflict confirm label is "Attach".
  - The forbidden-symbols tooltip omits the backslash and control characters the kit also forbids.
  - Sanitizing runs in `onValidateUpload` instead of `prepareUploadFileName`.
- [ ] **Editor UI language from the host** — QuickApps runs on its own origin, so the detected
      language is the browser's, not the host's choice. Following the host (e.g. a language in the
      init `postMessage`) needs a `host-integration` change.
- [ ] **Shared i18n config with ai-dial-chat** — `src/i18n/config.ts` is a copy of chat's; switch to
      a shared package if chat extracts one.
- [ ] **Untranslated library defaults** — ai-dial-chat ask: the add-on details folder path `nav` is
      named by the ui-kit `FolderPath` default "Folder path", because `@epam/ai-dial-catalog` renders `FolderPath` in
      both details headers without an `ariaLabel` and has no prop to pass one through.

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

- [ ] **Authentication error coverage** — reconcile the broad 401/forbidden guarantees in
      `openspec/specs/auth/spec.md` with the different behavior of generated API calls, auth,
      themes, configuration, and file upload/download wrappers.
- [ ] **Runtime port and image policy** — reconcile the Vite development port with the Docker
      image default, and document whether the floating `development` image/client versions are
      local-only or an accepted deployment policy.
- [ ] **API-layer exceptions and configuration keys** — document the deliberate raw wrappers
      for auth, themes, and file transfer, and add all runtime custom flags to the configuration
      documentation and eventual `app-configuration` spec.

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
| `application_editing`               | Yes         | Yes                | Partial     | Planned           |
| `application_editor-layout`         | Yes         | Yes                | Partial     | Planned           |
| `application_user-attachments`      | Yes         | Yes                | Partial     | Planned           |
| `deployment_docker-image`           | Yes         | Yes                | No          | Planned           |
| `context-files`                     | Yes         | Yes                | Partial     | Planned           |
| `toolsets_selection`                | Yes         | Yes                | Partial     | Planned           |
| `agents_selection`                  | Yes         | Yes                | Partial     | Planned           |
| `toolsets_login`                    | Yes         | Yes                | Partial     | Planned           |
| `application_credentials`           | Yes         | Yes                | Partial     | Planned           |
| `skills_catalog`                    | Yes         | Yes                | Partial     | Planned           |
| `catalog-entity-details`            | Yes         | Yes                | Yes         | Planned           |
| `application_knowledge-base`        | Yes         | Yes                | Partial     | Planned           |
| `orchestrator_model-selection`      | Yes         | Yes                | Partial     | Planned           |
| `application_advanced-settings`     | Yes         | Yes                | Partial     | Planned           |
| `application_conversation-starters` | Yes         | Yes                | Partial     | Planned           |
| `application_json-editor`           | Yes         | Yes                | Yes         | Planned           |
| `app-configuration`                 | Yes         | Yes                | Partial     | Planned           |
| `theming`                           | Yes         | Yes                | Partial     | Planned           |
| `i18n`                              | Yes         | Yes                | Partial     | Planned           |

A spec existing does not imply that it has been verified against the current implementation.
Update this matrix as each capability is explored, specified, tested, and checked.

## OpenSpec spec creation candidates

### Application editing/persistence (survives migration — core domain logic)

- src/components/EditorClient/EditorClient.tsx, src/components/QuickApp2Form/QuickApp2Form.tsx, src/form/**, src/utils/application.ts,
  has-quick-app-changes.ts, get-updated-at-timestamp.ts
- Covers: load/save/auto-save lifecycle, dirty-state tracking, application_properties serialization
- Proposed: application_editing (leaves room for a sibling below)
- **Spec written** (`openspec/specs/application_editing`): the General-step fields on save (change
  `fix-quickapp-display-version-save`), and the load, dirty-state, save, auto-save and reset
  lifecycle plus the top-level `application_properties` shape (change
  `specify-uncovered-capabilities`).

### Application credentials (recent feature, git log: "feat: support application credentials #140")

- src/utils/request-application-credentials.ts, src/hooks/use-application-authentication.ts,
  src/components/Agents/AgentDetailsPopup/** (credentials mode), ties to host-integration's
  RequestApplicationCredentials message + applicationCredentials query param
- The agent-side UI (the Credentials action under the details header, which closes the popup
  before the host shows its forms) is specified in `agents_selection` "Agent details popup"
  (change `agent-settings-tab`); the detection and host round trip are in `application_credentials`
  (change `specify-uncovered-capabilities`).
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
  `toolsets_login` host round-trip is specified too (change `specify-uncovered-capabilities`).

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
  components/common/FileManagerModal/** (the file-manager modal; the Add-ons row lives in components/KnowledgeBase/), types/dial-files.ts, dial-file-path.ts, file-download.ts, file-name.ts, decode-file-url.ts, safe-decode-uri.ts
- Standalone top-level concept, no sibling domain → context-files
- **Spec written** (`openspec/specs/context-files`, change `specify-uncovered-capabilities`); the
  Knowledge base popup's own behaviour stays in `application_knowledge-base`.

### Theming

- context/ThemeContext.tsx (fetches chat-api's `/api/themes` via utils/chat-api-fetch.ts), utils/apply-theme-colors.ts, resolve-icon-url.ts, ties to
  host-integration's theme query param
- Standalone → theming
- **Spec written** (`openspec/specs/theming`, change `specify-uncovered-capabilities`).

### i18n

- src/i18n/**, constants/translation-keys.ts, utils/get-localized-text.ts
- Standalone → i18n
- **Spec written** (`openspec/specs/i18n`, change `specify-uncovered-capabilities`): English is the
  only shipped locale, so `dir` is always `ltr` today. Stack aligned with ai-dial-chat in change
  `align-i18n-with-dial-chat`.

### Feature flags / runtime config

- utils/user-config.ts, `fetchAppSettings` in utils/dial-client.ts, utils/auth-api.ts (session / current user)
- Standalone → app-configuration
- **Spec written** (`openspec/specs/app-configuration`, change `specify-uncovered-capabilities`).

### Advanced settings

- src/components/Settings/** (the Advanced Settings popup; the old src/components/AdvancedSettings/** section was removed)
- **Spec written** (`openspec/specs/application_advanced-settings`, from change `populate-advanced-settings-popup`): max attachments and Time awareness in the popup; from change `move-model-controls-to-advanced-settings`, also the orchestrator Temperature slider and Allow orchestrator to process files switch.

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
