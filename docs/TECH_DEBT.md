## List of known pending improvements:

- [x] Use typescript-sdk for call to Core instead of hardcoded endpoints
- [x] Add OpenSpec and start using SDD. `openspec/` is initialised (see `openspec/config.yaml`, `AGENTS.md`'s "Spec-driven development" section) and new work now starts from a spec change. Coverage of old functionality is still in progress — only `host-integration` and `auth` are written so far; see the candidates list below for what's left.
- [] Test coverage - `@vitest/coverage-v8` is wired up (`vitest.config.ts`), enforced by `npm test`
  (now runs with `--coverage`, so it fails the build below threshold — use `npm run test:watch` for
  a plain watch-mode run without coverage) across all of `src/**/*.{ts,tsx}`. The thresholds are
  set to the real baseline as of 2026-09-30 (~15% statements, ~7% branches, ~5% functions, ~16%
  lines) with `autoUpdate: true`, so they ratchet up automatically whenever coverage improves and
  the build only fails on a regression, not on the size of the remaining gap. **70% is the actual
  goal, not the current threshold** — most of `components/`, `context/`, and `form/` have no tests
  at all. Once the auto-updated numbers get close to 70%, raise the long-term target itself (this
  item) accordingly. Closing the gap is still open work; see `openspec/specs/` /
  `openspec/changes/` for tracking individual pieces of it as they're picked up.
- [] react-hook-form usage - should get rid of it
- [] need to review components, some seem to be unnecessary. (`AgentSkillsField` → `SkillsSelector` proxy is gone:
  removed in the `redesign-skills-selection` change.)
- [x] Extract the model picker popup out of `components/Orchestrator/ModelField.tsx` into its own
  component — now `components/Orchestrator/ModelCatalogModal` (see the `redesign-model-picker-catalog-list` change).
- [] Model picker upstream asks to ai-dial-chat `libs/catalog` / `libs/chat-shared` (from the
  `redesign-model-picker-catalog-list` change):
  - a `Toolbar` prop to hide the grid/list toggle, so the picker can use `Toolbar` instead of its own heading row;
  - Enter/Space row activation in `ListView` (then drop `hooks/useGridRowKeyboardSelect.ts`);
  - `enableRtl` in `ListView` — its ag-grid columns do not follow `dir="rtl"` today;
  - a label override for `EntityTypeLabel`, so the Type cell can be localised;
  - a thinner (or configurable) selected-row border in `ListView` — its 2px border shifts the row
    content, so `ModelCatalogModal` overrides it via the `_selectedRow_` class prefix; drop that
    override once fixed.
- [x] Auth screens other than the sign-in prompt - `ForbiddenPage` and `AuthError` now share
  `LoginScreen`'s layout (`components/common/AuthStateScreen`), use 2.0 buttons and take all copy from
  `common` i18n keys (see the `redesign-auth-state-screens` change).
- [] Conversation starters: a starter with only a title or only a prompt is saved to
  `conversation_starters`, but it does not enable the starters settings (that needs both). Needs a
  product decision — either require both fields to save a starter, or enable the settings for any
  non-blank starter (see the `application_conversation-starters` spec, "Partially filled starter").
- [] Conversation starters: `useQuickApp2Form` still exposes `updateStarter` / `removeStarter`, which
  only the hook's own tests use since the starters modal edits a local draft
  (`redesign-conversation-starters`). Remove them together with those tests.
- [] Add-ons: the same mock as the starters redesign splits Agents & Toolsets into separate Toolsets
  and Agents rows and adds a Knowledge base row. Needs its own OpenSpec change.
- [] ui-kit: `DialDraggableItem` imports a private bundled copy of react-dnd whose `DndProvider` the
  kit does not export, and it has no keyboard support, so consumers can't use it. Ask the kit for an
  exported, keyboard-accessible sortable list; the starters modal uses `@dnd-kit/sortable` meanwhile.
- [] Skills follow-ups (from the `redesign-skills-selection` change):
  - chat-api ask: `version` and `tags` on `SkillMetadataItemDto`. The editor already shows them
    when present (`mapCoreToDialSkill` in `src/utils/dialClient.ts`); until then skills have no
    version and the Add skill popup's Tags column and From topics stay empty;
  - resolve the manifest path through `skillsApi.listSkillFiles` for DIAL Core versions that store
    `SKILL.md` under `files/` (as ai-dial-chat's `resolveSkillManifestFileId` does) — today the
    Details tab shows its error state there;
  - optionally list a skill's bundled files in the Details tab (`ContentTab`'s file tree).
- [] ...

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
  (`src/utils/dialClient.ts` `fetchDialApp`), which is never refreshed after a save. A dirty
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
- [ ] **Coverage status and target** — use one consistent description of the ratcheting
  baseline, tested scope, and long-term 70% goal; do not describe 70% as the current gate.
- [ ] **Post-migration source map** — refresh the candidate paths below so they point to the
  current `src/` tree rather than deleted `src/app/api/**` routes, and mark historical paths
  as such.
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

| Capability | Spec exists | Source area mapped | Tests exist | Behavior verified |
| --- | --- | --- | --- | --- |
| `host-integration` | Yes | Partial | Partial | Reconcile |
| `auth` | Yes | Partial | Partial | Reconcile |
| `application_editing` | Partial | Yes | Partial | Planned |
| `context-files` | No | Yes | Partial | Planned |
| `toolsets_selection` | No | Yes | Partial | Planned |
| `toolsets_login` | No | Yes | Partial | Planned |
| `application_credentials` | No | Yes | Partial | Planned |
| `skills_catalog` | Yes | Yes | Partial | Planned |
| `orchestrator_model-selection` | Yes | Yes | Partial | Planned |
| `application_advanced-settings` | Yes | Yes | Partial | Planned |
| `application_conversation-starters` | Yes | Yes | Partial | Planned |
| `app-configuration` | No | Yes | Partial | Planned |
| `theming` | No | Yes | Partial | Planned |
| `i18n` | No | Yes | Partial | Planned |

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

- src/utils/request-application-credentials.ts, ContextAndTools/DialAppConfigurationModal.tsx, ties to host-integration's
  RequestApplicationCredentials message + applicationCredentials query param
- Proposed: application_credentials (sibling of application_editing)

### Toolsets — selection + host-mediated login/logout

- src/app/api/dial-toolsets/{signin,signout}, components/common/AgentAndToolsetSelector/**, utils/apply-toolset-login-result.ts, ties to
  host-integration's RequestToolsetLogin/RequestToolsetLogout
- Two real sub-concerns: selecting/configuring a toolset vs. the login/logout round-trip with the host
- Proposed: toolsets_selection, toolsets_login (this is the domain your original naming example already named)

### Skills

- src/utils/dialClient.ts (`fetchDialSkills`, `fetchSkillManifest`), src/components/AgentSkills/**, src/components/Skills/**
- Proposed: skills_catalog (standalone slug skills also defensible if no sibling ever appears)
- **Spec written** (`openspec/specs/skills_catalog`, from archived change `redesign-skills-selection`): the attached
  skills list with its hover remove button, the skill details popup with Delete, and the Add skill popup.

### Orchestrator / model selection

- src/components/Orchestrator/**, src/app/api/dial-deployments, ORCHESTRATOR_ATTACHMENT_STRATEGY_VALUE in constants/quick-apps.ts
- Proposed: orchestrator_model-selection
- **Spec written** (`openspec/specs/orchestrator_model-selection`, from archived change `redesign-default-model-card`); it covers the Default model block
  (selected-model card and the Change action) and, from change `redesign-model-picker-catalog-list`, the
  model picker popup (catalog list, search, From filter, sort, Add/Cancel), and, from change
  `specify-configuration-controls-and-starters`, the Temperature and Process files controls.

### Context files (file manager)

- src/app/api/dial-files/** (list, upload, download, rename, delete, create-folder, list-shared), hooks/useDialFileManager.ts,
  utils/dial-files-api.ts, dial-file-path.ts, file-download.ts, file-name.ts, decode-file-url.ts, safe-decode-uri.ts
- Standalone top-level concept, no sibling domain → context-files

### Theming

- src/app/api/themes, src/app/api/themes/image, context/ThemeContext.tsx, utils/apply-theme-colors.ts, resolve-icon-url.ts, ties to
  host-integration's theme query param
- Standalone → theming

### i18n

- src/i18n/**, I18nProvider.tsx, hooks/useTranslation.ts, utils/get-localized-text.ts
- Standalone → i18n

### Feature flags / runtime config

- utils/user-config.ts, src/app/api/settings, src/app/api/session
- Standalone → app-configuration (name's debatable — open to a better slug)

### Advanced settings

- src/components/Settings/** (the Advanced Settings popup; the old src/components/AdvancedSettings/** section was removed)
- **Spec written** (`openspec/specs/application_advanced-settings`, from change `populate-advanced-settings-popup`): max attachments, Time awareness and Built-in file tools in the popup.

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
