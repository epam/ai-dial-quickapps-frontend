Slicing strategy: **vertical per capability** — each spec is drafted from its source area and
checked against the code on its own; the docs slice then records coverage and findings. No
production code or test changes; where the code contradicts a document or looks unintended, the
behaviour is left out of the spec and recorded in `docs/TECH_DEBT.md` instead of being changed.

## 1. Specs

- [x] 1.1 `specs/toolsets_login/spec.md` from `src/hooks/use-toolset-credentials.ts`,
      `src/utils/apply-toolset-auth-result.ts`, `src/context/DataContext.tsx`.
  - Verification: `openspec validate specify-uncovered-capabilities --strict`.
- [x] 1.2 `specs/application_credentials/spec.md` from `src/hooks/use-application-authentication.ts`,
      `src/utils/request-application-credentials.ts`, `src/components/Agents/AgentDetailsPopup/`.
  - Verification: as 1.1.
- [x] 1.3 `specs/context-files/spec.md` from `src/components/common/FileManagerModal/`,
      `src/hooks/use-dial-file-manager.ts`, `src/hooks/use-dial-file-sources.ts`,
      `src/utils/dial-files-api.ts`, `src/utils/dial-file-manager.ts`, `src/utils/file-download.ts`.
  - Verification: as 1.1.
- [x] 1.4 `specs/theming/spec.md` from `src/context/ThemeContext.tsx`,
      `src/utils/apply-theme-colors.ts`, `src/utils/resolve-icon-url.ts`.
  - Verification: as 1.1.
- [x] 1.5 `specs/i18n/spec.md` from `src/i18n/index.ts`, `src/components/I18nProvider/`,
      `src/hooks/use-translation.ts`, `src/utils/get-localized-text.ts`.
  - Verification: as 1.1.
- [x] 1.6 `specs/app-configuration/spec.md` from `fetchAppSettings` in `src/utils/dial-client.ts`
      and `src/utils/user-config.ts`.
  - Verification: as 1.1.
- [x] 1.7 `specs/application_editing/spec.md` (ADDED only) from
      `src/components/EditorClient/EditorClient.tsx`, `src/hooks/use-quick-app2-form.ts`,
      `src/utils/has-quick-app-changes.ts`, `src/form/quickApp2Form.ts`.
  - Verification: as 1.1.

## 2. Docs

- [x] 2.1 Update `docs/TECH_DEBT.md`: coverage matrix rows for the seven capabilities, the
      candidates list, and a findings section with the discrepancies and likely bugs the drafts
      found (left out of the specs on purpose).
  - Verification: the new lines follow the file's existing style; the file is not reformatted.
- [x] 2.2 Validate: `openspec validate specify-uncovered-capabilities --strict`; `npm test`,
      `npm run lint` and `npm run typecheck` still pass.

## 3. Follow-ups (out of scope, recorded in `docs/TECH_DEBT.md`)

- Tests for the scenarios the drafts marked untested, chiefly `EditorClient` (load, save
  outcomes, auto-save interval), `ThemeContext`, and `DataContext`'s unsolicited login results.
- A decision on each finding in TECH_DEBT's new findings section.
