# Design

## Context

See proposal.md. `QuickApp2Form` takes `isReadonly = false` and passes it to `AddOnsSection`, `ModelConfigurationSection`, `AttachmentsSection` and `SettingsSection`; the add-on rows pass it on to their lists, details popups and catalog modals. Nothing sets it to `true` outside tests.

## Goals / Non-Goals

**Goals:**
- Remove the prop and its dead branches without changing rendered output or any non-read-only test.

**Non-Goals:**
- Changing `getEntityStatusMessage` (its flag picks the status wording, and callers pass a literal `true`), the catalog `ListView` `isReadonly`, or TypeScript `readonly` modifiers.
- Adding a read-only mode later; that would be a new spec change.

## Decisions

- **Work leaf-first and let `tsc` find the rest.** Remove the prop from the deepest components (popups, lists), then their parents, then `QuickApp2Form`, running `npm run typecheck` after each layer. Alternative rejected: a regex rewrite, which cannot tell the editor prop from the catalog or wording flags.
- **Delete read-only-only tests; adjust shared ones.** A test that exists only for the read-only state is deleted; a test that passes `isReadonly={false}` just drops the prop.
- **Keep the `ListView` `isReadonly`.** It belongs to `@epam/ai-dial-catalog` and drops the Favorite column, unrelated to the editor.

## Risks / Trade-offs

- [A removed branch was reachable] → Verified: only `QuickApp2Form`'s default and tests supply the prop; `EditorClient` never does. Full typecheck, lint and test run before archiving.
- [Unused imports or i18n keys left behind] → ESLint catches unused imports; a text search checks each removed branch's translation keys are still used elsewhere.
