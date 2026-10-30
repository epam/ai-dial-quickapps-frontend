## Context

The Add-ons card's three rows (Toolsets, Agents, Skills) render each attached entry through the shared `AddOnListItem` (`src/components/common/AddOnListItem/AddOnListItem.tsx`). Its optional status line is a hand-rolled `<span className="dial-tiny-text truncate text-secondary">`. That span is the details button's `aria-describedby` target.

The text comes from `getEntityStatusMessage(getEntityStatus(entity, id), t, entityTypeLabel)` in `src/utils/get-entity-status.ts`:

- `getEntityStatus` treats a missing entity with an `applications/…` or `toolsets/…` id as `isNotFoundInCatalog`. A missing entity with any other id is `isMissingDeploymentId`, which is expected and shows no status.
- `getEntityStatusMessage` returns a plain string, so the severity is lost at that boundary.
- `EntityStatus.isError` exists, but no component reads it, and it is also true for logged-out and undeployed entries.

`ToolsetsList` and `AgentsList` call these helpers. `SkillsList` does not, so a skill missing from `skillsMap` has no status line.

None of the helpers know whether `DataContext` has finished loading. Before `READY`, during `LOADING`, and after `ERROR`, the maps are empty, so every real toolset or application id is reported as "not available". Today that shows as a brief grey flash. In red it would be a false error on every editor open.

## Goals / Non-Goals

**Goals:**

- Render the not-found-in-catalog status as a validation error with the kit's `ErrorText`. Keep every other status neutral.
- Give the Skills row the same status.
- Never claim "not available" before the catalog has loaded, or after it failed to load.

**Non-Goals:**

- Popup unavailable states, logged-out styling, save blocking (see proposal).
- Agents whose id is a bare model id such as `gpt-4o` and that the catalog does not list. They stay `isMissingDeploymentId` and show no status, as today. Changing that classification is a separate decision.
- Any change in ai-dial-chat.

## Decisions

### D1. Severity travels with the message: `EntityStatusMessage { text, severity }`

`getEntityStatusMessage` returns `EntityStatusMessage | undefined`, where:

```ts
// src/types/entity-status.ts
export enum EntityStatusSeverity {
  Info = 'info',
  Error = 'error',
}

export interface EntityStatusMessage {
  text: string;
  severity: EntityStatusSeverity;
}
```

`isNotFoundInCatalog` maps to `Error`. Logged out and every `EntityStatusKind` map to `Info`.

- *Alternative: a separate `getEntityStatusSeverity(status)`.* Rejected. The text and the severity would come from two branchings of the same `if` chain, and the two could drift.
- *Alternative: reuse `EntityStatus.isError`.* Rejected. It covers logged-out and undeployed too, which must stay neutral.
- *Alternative: a boolean.* Rejected in favour of the string enum, per the repo's enum rule. It also leaves room for a future `Warning`.

### D2. `AddOnListItem` takes `statusSeverity` and renders a kit caption

The new prop is `statusSeverity?: EntityStatusSeverity`, defaulting to `Info`. The hand-rolled span is replaced as follows:

- `Error` → `<ErrorText id={statusId} text={statusText} className="truncate" />`
- `Info` → `<CaptionText id={statusId} text={statusText} className="truncate" />`

Both come from `@epam/ai-dial-ui-kit` (2.0). Confirmed against the kit source (`components/New/CaptionText/CaptionText.tsx`): both render a `<span>` with `dial-tiny-text`, plus `text-error` or `text-secondary`. They forward `id` and `className`, render nothing for empty text, and carry no live-region role unless `announce` is passed. The `Info` output therefore matches today's span plus the kit's public class names, and the `aria-describedby` wiring is unchanged. Both components are exported by the installed `0.16.0-dev.45`, and `ErrorText` is already used in `SelectedModelCard.tsx`.

`announce` is **not** passed. The status describes the item and is present on first render, so announcing it on every editor open would be noise. This follows the kit's own guidance ("a field caption or error is described, not announced").

The choice between the two components is a single `if`/early-return or a one-level conditional, never a nested ternary.

### D3. "Not found" requires a ready catalog: an explicit `isCatalogReady` argument

`getEntityStatus(entity, id, isCatalogReady: boolean)` gets a third, **required** parameter. When `entity` is missing and `isCatalogReady` is false, the function returns the all-false status (no not-found, no missing-deployment-id), so no status line is shown. When `entity` is present, the flag has no effect.

Each list reads `status` from `useDataContext()` and passes `status === LoadStatus.Ready`.

- *Alternative: an optional parameter defaulting to `true`.* Rejected. A future caller that forgets it brings the false-red bug back silently.
- *Alternative: gate in `AddOnListItem`.* Rejected. The item is presentational and shared, and it should not read `DataContext`.
- *Alternative: hide the whole row until ready.* Rejected. It changes loading behaviour beyond the issue and hides the user's saved entries.

### D4. Skills use the same message path through `getSkillStatus`

A new pure helper `getSkillStatus(skill: DialSkill | undefined, isCatalogReady: boolean): EntityStatus` goes in `src/utils/get-entity-status.ts`. It returns the all-false status, with `isNotFoundInCatalog = isCatalogReady && skill == null`. Every `agentSkills` entry is a real reference (there is no inline-config case as there is for toolsets), so the id prefix is not consulted. `SkillsList` passes `getEntityStatusMessage(getSkillStatus(skill, isReady), t, t(ApplicationEditorI18nKeys.AddOnsEntityTypeSkill))` to the item.

- *Alternative: teach `getEntityStatus` about a `skills/` prefix.* Rejected. The spec's own fixtures use bare ids such as `"a"`, and skills have none of the deployment or auth fields `getEntityStatus` inspects.

### D5. i18n

There is one new key: `ApplicationEditorI18nKeys.AddOnsEntityTypeSkill = 'applicationEditor.addOns.entityTypeSkill'`, with `"entityTypeSkill": "skill"` in `src/i18n/locales/en.json` next to `entityTypeAgent` and `entityTypeToolset`. The sentence key `AddOnsUnavailableRemovalRequired` is reused as it is.

### D6. Memoisation

Nothing new is needed. All three lists are already `React.memo`. `status` is a primitive from the context value, and the per-item helpers are cheap pure calls inside the existing `map`. No new hook and no new context are added.

## States

| `DataContext.status` | Entity in map | Status line |
| --- | --- | --- |
| `Idle` / `Loading` / `Error` | no | none |
| `Ready` | no, real id (toolset/application/any skill) | "… not available and needs to be removed.", `ErrorText` |
| `Ready` | no, toolset/agent without a resolvable id | none (`isMissingDeploymentId`, unchanged) |
| any | yes, logged out / deploying / undeployed … | existing text, `CaptionText` (neutral) |
| any | yes, healthy | none |

RTL: no change. The caption uses no directional utilities, and `truncate` is direction-agnostic.

## Risks / Trade-offs

- [Tests that mock `useDataContext` without `status`, or that mock only `use-add-on-entity-map`, will read `undefined` status, so the not-found line disappears and the existing "missing from catalog" assertions fail.] → Update those mocks to supply `status: LoadStatus.Ready`, and add explicit `Loading`/`Error` cases. Both are listed in tasks.
- [`refreshSkills` replaces `skillsMap` without changing `status`, so a skill deleted elsewhere turns red right after a refresh while status stays `Ready`.] → That is correct behaviour: the skill really is gone.
- [`text-error` contrast depends on the host theme token.] → It is the same token as the existing error captions (`SelectedModelCard`, `InstructionsSection`), so this change adds no new contrast surface. Verify it visually in light and dark themes during apply.
- [The kit caption adds `dial-kit-caption-text` / `dial-kit-error-text` classes.] → These are harmless public hooks, and no stylesheet in this repo targets the old span.

## Migration Plan

Ship it as one PR in ai-dial-quickapps-frontend. No data, config or host-protocol change is involved. Rollback is a revert. Close epam/ai-dial-chat#9635 once a chat image picks up the new quick-apps build (the issue was reported against chat `1.3.0-dev.234`).

## Open Questions

- None blocking. Product may later want logged-out or undeployed entries to be `Warning` rather than `Info`. D1's enum leaves room for that.
