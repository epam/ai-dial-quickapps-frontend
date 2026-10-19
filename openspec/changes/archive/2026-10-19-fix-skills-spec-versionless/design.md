# Design

## Context

See proposal.md. `mapCoreToDialSkill` (`src/utils/dial-client.ts`) copies `version` only when the listing carries a non-empty string, and `AddOnListItem` and the Add skill Name cell render it only when set. So the code is already correct for unversioned skills; only the spec's wording and examples are wrong.

## Goals / Non-Goals

**Goals:**
- Make the spec match what the backend returns and the UI renders.
- Close the Delete-confirmation and read-only-scope gaps QA found.

**Non-Goals:**
- Removing the defensive `version` and `tags` mapping or the `version` field on `DialSkill`.
- Reading a version from `SKILL.md` frontmatter or the `etag`.
- Changing the hover remove button.

## Decisions

- **Keep the optional version clause, drop the example.** Deleting version support from the spec would force a code change and a second spec change if chat-api adds the field. Alternative rejected: describing `etag` as a version, which is an opaque hash and not a label users recognise.
- **No confirmation on Delete.** It only detaches the skill from this app, leaves the skill in DIAL and is reversed by Add. Alternative rejected: a confirm dialog, which adds a translation key and a click for a reversible action.
- **No read-only mode.** `EditorClient` never passes `isReadonly`, shared apps are editable (#208), and a read-only editor is not wanted, so the spec says the Skills row is always editable. The component-level `isReadonly` props stay untouched; removing them across the editor is a separate refactor.

## Risks / Trade-offs

- [The listing gains a version later] → The optional clause already covers it; only an example needs adding then.
- [Issue, Figma and QA cases stay stale] → Listed in the tasks as follow-ups outside the repo.
