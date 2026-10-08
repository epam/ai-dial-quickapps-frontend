# Proposal

## Why

The add-on details popups mirror the catalog's details view but still draw their own header (ui-kit `EntityIdentity`) and their own toolset credentials UI (`ToolsetCredentialsAction` + `ToolsetLoginModal`). The catalog now exports its header, `DetailsHeader`, with the toolset Log in / Log out action and the personal API-key popover (epam/ai-dial-chat#9338), and lets the host translate its type caption (`texts.entityTypeLabels`, epam/ai-dial-chat#9343). The ask is that header and buttons come from the catalog library too.

## What Changes

- `AddOnDetailsPopup` renders `DetailsHeader` in the popup header, with only the credentials action enabled (no Use in chat, Share, Publish, Edit, Download, Manage). The type caption is translated per entity type.
- Toolset credentials: a new `useToolsetCredentials` hook backs `DetailsHeader`'s `onLogin` / `onLogout` with the existing flows — OAuth through the host messages, API key through `toolsetsApi` — so the host contract is unchanged. `ToolsetCredentialsAction` and `ToolsetLoginModal` are removed.
- The popup avatar no longer carries the logged-out badge (the catalog header has none); the row item keeps it.
- Agent Connection / Credentials stay this app's own buttons, in a row under the header. Agent credentials are out of scope (user decision: revisit after this).

Not breaking: host messages, requests and credentials levels are unchanged.

## Capabilities

### Modified Capabilities

- `toolsets_selection`: header and credentials action are the catalog's.

## Impact

- Changed: `package.json`, `package-lock.json`, `AddOnDetailsPopup.tsx`, `ToolsetDetailsPopup.tsx`, `AgentDetailsPopup.tsx`, `SkillDetailsPopup.tsx`, new `src/hooks/use-toolset-credentials.ts`, `src/hooks/use-catalog-details-labels.ts`, `src/types/entity-details.ts`, i18n, tests.
- Removed: `ToolsetCredentialsAction.tsx`, `ToolsetLoginModal/ToolsetLoginModal.tsx`, and their now-unused strings.
- Bumps the `@epam/ai-dial-*` chat libraries to 1.2.0-dev.328, which carry `texts.entityTypeLabels` (epam/ai-dial-chat#9343).
