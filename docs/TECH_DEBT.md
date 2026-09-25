## List of known pending improvements:

- [] Use typescript-sdk for call to Core instead of hardcoded endpoints
- [x] Add OpenSpec and start using SDD. `openspec/` is initialised (see `openspec/config.yaml`, `AGENTS.md`'s "Spec-driven development" section) and new work now starts from a spec change. Coverage of old functionality is still in progress — only `host-integration` and `auth` are written so far; see the candidates list below for what's left.
- [] Test coverage - now it's not checked, targets are not set. And it's probably is low, there are very few tests in the repo, not covering even main logic.
- [] react-hook-form usage - should get rid of it
- [] need to review components, some seem to be unnecessary, e.g. AgentSkillsField just proxy SkillsSelectors
- [] ...

## OpenSpec spec creation candidates

### Application editing/persistence (survives migration — core domain logic)

- src/components/EditorClient/EditorClient.tsx, src/components/QuickApp2Form.tsx, src/form/**, src/utils/application.ts,
  has-quick-app-changes.ts, get-updated-at-timestamp.ts
- Covers: load/save/auto-save lifecycle, dirty-state tracking, application_properties serialization
- Proposed: application_editing (leaves room for a sibling below)

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

- src/app/api/dial-skills/catalog, src/components/AgentSkills/**
- Proposed: skills_catalog (standalone slug skills also defensible if no sibling ever appears)

### Orchestrator / model selection

- src/components/Orchestrator/**, src/app/api/dial-deployments, ORCHESTRATOR_ATTACHMENT_STRATEGY_VALUE in constants/quick-apps.ts
- Proposed: orchestrator_model-selection

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

- utils/is-env-flag-enabled.ts, utils/user-config.ts, src/app/api/settings, src/app/api/session
- Standalone → app-configuration (name's debatable — open to a better slug)

### Advanced settings

- src/components/AdvancedSettings/**
- Proposed: application_advanced-settings

### Conversation starters

- src/components/ConversationStarters/**
- Proposed: application_conversation-starters

### User attachments

- src/components/UserAttachments/**
- Proposed: application_user-attachments
