# Design

## Context

See proposal.md. The editor is always editable: `QuickApp2Form` defaults `isReadonly` to `false` and nothing sets it. Components still accept the prop and tests exercise it, so the code stays correct for any future host that sets it; only the specs claimed it as behaviour.

## Goals / Non-Goals

**Goals:**
- Make the specs describe only reachable behaviour.
- Keep each affected requirement's other behaviour byte-for-byte unchanged.

**Non-Goals:**
- Removing the `isReadonly` props, their tests, or the `QuickApp2Form` read-only save guard (separate code change).
- Changing the catalog `ListView` `isReadonly` prop named in the Add agent / Add toolset popups, which is the catalog library's own prop.

## Decisions

- **Generate the deltas from the main specs with a script** and review the diff, instead of hand-copying 20+ requirement blocks. This keeps the unchanged text exact.
- **REMOVED + ADDED with an " (editable)" suffix for requirements that lose a scenario.** OpenSpec rejects a MODIFIED block that omits an existing scenario, and rejects the same title in REMOVED and ADDED. Alternative rejected: skipping delta validation and editing main specs directly, which leaves the change unvalidated. The suffix is a cosmetic cost.
- **`application_user-attachments`**: the requirement is renamed to drop "read-only aware" rather than suffixed, since its title was itself about read-only.

## Risks / Trade-offs

- [Renamed titles break references] → No spec or doc refers to these titles by name; verified with a text search before archiving.
- [Code and specs diverge: props and tests still exist] → Called out in the proposal as a follow-up cleanup.
