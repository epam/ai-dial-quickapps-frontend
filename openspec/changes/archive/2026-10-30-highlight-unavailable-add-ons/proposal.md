## Why

An attached toolset or agent that no longer resolves against the catalog (deleted, or not shared with the current user even though the parent app is) shows "The toolset is not available and needs to be removed." in the same neutral secondary styling as purely informational statuses such as "Deploying app.". The user has to act on it — remove the entry — but nothing makes it stand out, so it is easily missed ([epam/ai-dial-chat#9635](https://github.com/epam/ai-dial-chat/issues/9635)). An unavailable skill is worse off: its row shows no status at all.

## Problem

- `AddOnListItem` renders every `statusText` as `dial-tiny-text truncate text-secondary` (`src/components/common/AddOnListItem/AddOnListItem.tsx:84-85`). It has no way to tell an actionable error from an informational status.
- `getEntityStatusMessage` (`src/utils/get-entity-status.ts:100`) returns a bare string, so the list components cannot pass on that the text came from the `isNotFoundInCatalog` branch (`src/utils/get-entity-status.ts:109`).
- `SkillsList` passes no `statusText` at all (`src/components/Skills/SkillsList/SkillsList.tsx:51`), so an unavailable skill gives no hint in the row. It only says so once its details popup is opened.
- Related latent defect: `getEntityStatus` treats "not in the map" as "not found in catalog" without checking whether the catalog has loaded. While `DataContext` is `Idle`/`Loading`, or after a failed load (`Error`), every attached toolset and agent with a real id is reported as unavailable. Today that flicker is low-contrast grey. Coloured red, it would show as a false alarm on every editor open and on every failed load, so it has to be fixed as part of this change.

## What Changes

- The "not available and needs to be removed" status line in the Toolsets, Agents and Skills rows renders as a validation error: the ui-kit 2.0 `ErrorText` (`text-error`, `dial-tiny-text`), the same component the Default model block already uses for its error (`src/components/Orchestrator/SelectedModelCard/SelectedModelCard.tsx:88`). The other statuses (logged out, deploying, undeploying, redeploying, undeployed) keep their neutral styling.
- `getEntityStatusMessage` returns the text together with a severity: a new string enum `EntityStatusSeverity` (`Info`, `Error`) in `src/types/entity-status.ts`. `AddOnListItem` accepts a matching `statusSeverity` prop and picks `ErrorText` or `CaptionText`. The `id`/`aria-describedby` wiring stays as it is.
- The Skills row shows the same unavailable status, worded for a skill, for a skill id missing from `skillsMap`.
- The unavailable status (for all three rows) is shown only once `DataContext.status` is `Ready`. While the catalog is loading, or after it failed to load, a missing entry is not reported as unavailable.

## Non-goals

- The details popups' unavailable state (`ToolsetsUnavailable` / `AgentsUnavailable` / `SkillsUnavailable` empty-state content) is unchanged. It is a popup body, not an inline validation message.
- Logged-out toolsets and undeployed or transitioning agents keep neutral styling. The logged-out case already has its avatar badge.
- Save is not blocked and no form-level validation error is added. The entry is still saved as-is, as today.
- No change in ai-dial-chat: the issue is filed there, but the quick-app editor that renders these rows is this repo, embedded in the chat as an iframe.

## Alternatives considered

- **Hard-code `text-error` on the span when the text matches the unavailable key.** Rejected: string matching is brittle, and it skips the kit component the project uses for error captions.
- **Reuse `EntityStatus.isError`.** Rejected: that flag is also true for logged-out and undeployed entries (`src/utils/get-entity-status.ts:66`), which the issue does not ask to turn red.
- **A boolean `isStatusError` prop.** This would work, but a string enum `EntityStatusSeverity` follows the project's enum convention and leaves room for a warning tone without another prop. Picked: the enum.

## Capabilities

### New Capabilities

_None._

### Modified Capabilities

- `toolsets_selection`: the Toolsets row status line shows the not-found-in-catalog status as an error-styled caption, and only once the catalog has loaded.
- `agents_selection`: the same for the Agents row.
- `skills_catalog`: the Skills row gains a status line for a skill missing from `skillsMap`, error-styled and shown only once the catalog has loaded.

## Impact

- **Code:** `src/utils/get-entity-status.ts`, `src/types/entity-status.ts`, `src/components/common/AddOnListItem/AddOnListItem.tsx`, `src/components/Toolsets/ToolsetsList/ToolsetsList.tsx`, `src/components/Agents/AgentsList/AgentsList.tsx`, `src/components/Skills/SkillsList/SkillsList.tsx`, plus their tests. No new context or hook. `DataContext.status` is already exposed.
- **API / host integration / auth:** none.
- **Dependencies:** none. `ErrorText` and `CaptionText` are in the installed `@epam/ai-dial-ui-kit` `0.16.0-dev.45`.
- **i18n:** one new key, `applicationEditor.addOns.entityTypeSkill` ("skill"), fed into the existing `applicationEditor.addOns.unavailableRemovalRequired` message. `en.json` is the only locale.
- **RTL:** none. The change is colour only. No layout, directional class or icon changes.
- **a11y:** the status line stays linked to the item's details button through `aria-describedby`, and the text itself carries the meaning, so the meaning is not conveyed by colour alone (WCAG 1.4.1). `text-error` contrast is set by the host theme token, the same one used by the existing error captions.

## Acceptance criteria

- A toolset or agent row whose id is not in the loaded catalog shows "The toolset/agent is not available and needs to be removed." in `text-error` via `ErrorText`. A skill row in the same state shows "The skill is not available and needs to be removed.".
- Logged-out, deploying, undeploying, redeploying and undeployed statuses render exactly as before (`text-secondary`).
- While `DataContext.status` is `Idle`, `Loading` or `Error`, no row shows the unavailable status.
- The details button's accessible description is still the status text.
- `npm run lint`, `npm run typecheck` and `npm test` pass, with tests covering each of the points above.

## Rollback

Not breaking. `AddOnListItem.statusSeverity` is optional and defaults to the neutral style. Reverting the commit restores the previous rendering.
