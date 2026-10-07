Slicing strategy: vertical. One slice takes `display_version` from TriggerSave through to
the `PATCH` body, with tests. After that come the doc and follow-up tasks.

## 1. Persist display_version on save

- [x] 1.1 In `src/utils/dialClient.ts` (`saveDialApp`), add
      `version: general?.display_version?.trim() || undefined` to `updateApplicationBodyDto`.
      Do not fall back to `_rawForSave.displayVersion`.
- [x] 1.2 In `src/components/EditorClient/EditorClient.tsx` (`handleSave`), keep the load-time
      `display_version` out of `effectiveGeneral` (only `normalizedGeneral` may carry it), but
      still pass it to `hasQuickAppChanges` as the stored baseline.
- [x] 1.3 Add `src/utils/tests/save-dial-app.test.ts`, mocking `@/utils/chat-api-client`'s
      `applicationsApi.updateApplication` the same way `src/utils/tests/application-authentication.test.ts` does. Cover:
      host-supplied `display_version` is sent as `version`; no `general` → no `version`; blank or
      missing `display_version` → no `version`, other fields still sent.

  Verification: `npx vitest run src/utils/tests/save-dial-app.test.ts src/utils/tests/has-quick-app-changes.test.ts`,
  `npm run lint`, `npm run typecheck`, then `npm test` once.

## 2. Contract docs

- [x] 2.1 Replace the "Never includes `version`" sentence in the `TriggerSaveGeneralPayload`
      JSDoc in `src/types/editor-messages.ts` with a note that `display_version` is persisted as
      chat-api's `version` and is omitted when blank.
- [x] 2.2 In `docs/TECH_DEBT.md` → "OpenSpec spec creation candidates" → Application
      editing/persistence, note that `application_editing` has been started (save of
      host-supplied General fields) and that the rest of the lifecycle is still uncovered.

  Verification: `npm run lint`, `npm run typecheck`.

## 3. Follow-ups (out of scope, record only)

- [x] 3.1 Add a `docs/TECH_DEBT.md` item: a save without `general` (auto-save) rebuilds
      `name`/`description`/`iconUrl`/`topics` from the load-time `_rawForSave` snapshot, which is
      never refreshed after a save, so it can revert Metadata edits made through the host.
