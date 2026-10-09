## Why

`docs/TECH_DEBT.md`'s coverage matrix lists capabilities with no spec (`toolsets_login`,
`application_credentials`, `context-files`, `theming`, `i18n`, `app-configuration`) and one
whose spec covers a single requirement (`application_editing`: its Purpose says "Not covered
yet: the load, auto-save and dirty-state lifecycle, and `application_properties`
serialization"). Their behaviour is defined only by code. AGENTS.md makes `openspec/specs/` the
normative source for observable behaviour, so this change writes those specs down.

## Problem

- The host-mediated toolset login round trip (`src/hooks/use-toolset-credentials.ts`,
  `src/context/DataContext.tsx:250-273`) has only its popup entry point specified, in
  `toolsets_selection`.
- Application credentials detection and the host hand-over
  (`src/hooks/use-application-authentication.ts`, `src/utils/request-application-credentials.ts`)
  have one line in `host-integration` and the button UI in `agents_selection`.
- The file manager (`src/hooks/use-dial-file-manager.ts`, `src/utils/dial-files-api.ts`) is
  specified only where the Knowledge base popup uses it (`application_knowledge-base`).
- Theme loading and precedence (`src/context/ThemeContext.tsx`), the shipped locales and
  `LocalizedText` resolution (`src/i18n/index.ts`, `src/utils/get-localized-text.ts`), and the
  runtime configuration keys (`fetchAppSettings`, `src/utils/user-config.ts`) are unspecified.
- The editor's load / dirty / save / auto-save / reset lifecycle (`EditorClient.tsx`,
  `use-quick-app2-form.ts`, `has-quick-app-changes.ts`) is unspecified, which is also what the
  TECH_DEBT reconciliation item "Save, auto-save, and reset semantics" asks to document.

## Solution

Spec-only change describing **current, implemented** behaviour — no product behaviour changes,
no production code changes:

1. New capabilities: `toolsets_login`, `application_credentials`, `context-files`, `theming`,
   `i18n`, `app-configuration`.
2. `application_editing`: ADDED requirements for the load outcomes, form state and dirty
   tracking, save gating, the auto-save interval, the save request and its outcome messages,
   the meaning of `SaveSuccess.hasChanges`, `RESET`, and the top-level `application_properties`
   shape (pointing at the spec that owns each section).
3. `docs/TECH_DEBT.md`: coverage matrix, candidates list, and the behaviour that drafting found
   to be a likely bug or to contradict another document, recorded for a decision instead of
   being specified.

Behaviour that looks unintended (for example the auto-save stale-General-fields revert, the
fields a disabled flag strips on save, the load-time baseline that is never refreshed after a
save) is deliberately left out of the specs and recorded in `docs/TECH_DEBT.md`, so a spec never
endorses a bug.

## Alternatives considered

- One change per capability — rejected: all seven are documentation of existing code with no
  behaviour decision, and the precedent `specify-configuration-controls-and-starters` batched two.
- Put toolset login into `toolsets_selection` and credentials into `agents_selection` — rejected:
  both are host round trips with their own message contracts; the selection specs keep the UI
  entry points and reference the new specs.
- Add tests for every untested scenario in this change — deferred: the drafts list which
  scenarios lack tests (notably `EditorClient`, `ThemeContext`, `DataContext`), recorded as a
  follow-up so this change stays documentation-only.

## Non-goals

- Any UI, behaviour or API change, including fixing the findings recorded in TECH_DEBT.
- Settling any item of TECH_DEBT's "Documentation and behavior reconciliation backlog"
  (origin defaults, host message protocol, stale General fields, RTL status); the specs
  describe the code and reference `host-integration` where those items live.
- Rewording RTL scenarios in existing specs, or the README.

## Acceptance criteria

- `openspec validate specify-uncovered-capabilities --strict` passes.
- Every scenario is true of the current code (each requirement was checked against the source).
- `npm test`, `npm run lint` and `npm run typecheck` still pass (no code changes).
- `docs/TECH_DEBT.md`'s matrix shows a spec for every capability in this change, and its
  findings list holds the discrepancies the drafts found.

## What Changes

- New capabilities: `toolsets_login`, `application_credentials`, `context-files`, `theming`,
  `i18n`, `app-configuration`.
- `application_editing`: ADDED requirements only (existing requirements unchanged).
- `docs/TECH_DEBT.md` updates. No production code or test changes.

## Capabilities

### New Capabilities

- `toolsets_login`: the toolset credentials hook, the OAuth request/result round trip with the
  host, unsolicited host login results, applying a host auth result, API-key sign-in via chat-api.
- `application_credentials`: credentials mode, authentication-required detection through
  chat-api external services, and the hand-over to the host's credential forms.
- `context-files`: the file manager's sources, listing, permissions, upload, create folder,
  rename, delete, download, hidden files and path encoding.
- `theming`: theme config fetch and fallback, theme precedence, system theme, applying colours,
  the theme context contract, icon URL resolution.
- `i18n`: shipped locale, key convention, the translation hook, document `lang`/`dir`,
  `LocalizedText` resolution and recombination.
- `app-configuration`: client config and user config sources, value types, failure fallback,
  and what each runtime key controls.

### Modified Capabilities

- `application_editing`: adds the editor lifecycle requirements.

## Impact

- **Code:** none.
- **API / chat-api:** none; the specs name the endpoints already called.
- **Auth / host integration:** none; the specs reference `auth` and `host-integration`.
- **i18n:** no new strings. **RTL:** none.
- **Rollback:** delete the change (or revert the synced specs); nothing depends on them.
