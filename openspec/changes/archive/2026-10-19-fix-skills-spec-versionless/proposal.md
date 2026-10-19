# Proposal

## Why

Issue #210 (Skills add-on redesign) and its QA pass assumed skills have a version ("Web Search 1.4.6"). They do not: chat-api's `SkillMetadataItemDto` has no `version` (only an `etag`), DIAL Core treats Skill resources as unversioned, and a real listing response carried no version field. The `skills_catalog` spec still uses a version as its running example and describes it as shown "when known", which led QA to report a missing feature. The same QA pass also found two behaviours the spec never states (Delete confirmation, read-only scope; the read-only state is unreachable in the app and is not wanted).

## What Changes

- Skills are documented as unversioned. The Skills row, the Add skill table's Name cell and the RTL scenario show avatar and name only. Version stays a forward-compatible "if the listing ever supplies one" clause, with no example value.
- Overview no longer says the version "shows next to the name in the header when known".
- Delete in the details popup is stated to remove the skill immediately, with no confirmation dialog (it only detaches the skill from the app and is undone by Add).
- The editor is stated to have no read-only mode: the Skills row is always editable, and shared apps are editable like the user's own (#208). The "unreachable read-only mode" item is dropped from `docs/TECH_DEBT.md`.
- The hover/focus remove button on Skills rows is kept, as decided for #210.
- **No code changes.** The existing behaviour already matches the corrected spec.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `skills_catalog`: unversioned skills (Attached skills list, Skill overview, Add skill popup catalog list, Skills accessibility and direction); Delete without confirmation (Remove a skill from the application); no read-only mode (new requirement "The Skills row is always editable").

## Impact

- `openspec/specs/skills_catalog/spec.md` (via archive of this change).
- Outside the repo: the issue #210 description, the Figma designs and the QA test cases (TC-2, TC-6, TC-7, TC-17 to TC-20) need the same corrections.
- No source, API or dependency changes.
