## Why

When a Quick App 2.0 uses a toolset whose name contains a space (or any other character
that must be percent-encoded), the toolset id is saved encoded twice
([#178](https://github.com/epam/ai-dial-quickapps-frontend/issues/178), P2). The saved
`tool_sets[].deployment_id` is `toolsets/<bucket>/QA%2520enc%2520check__1.0.0`, but the
real id is `toolsets/<bucket>/QA%20enc%20check__1.0.0`. DIAL Core cannot resolve the
dependency, so every chat request to the app fails.

## Problem

- chat-api returns toolset and deployment ids already percent-encoded (a space is a
  literal `%20` in the id string).
- The editor's convention is that internal ids are decoded: the form decodes saved
  `deployment_id`s on load (`getAgentsAndToolsetsFormValue` → `decodeApiUrl`), and
  `getQuickApp2Toolsets` re-encodes them once on save (`encodeApiUrl`).
- Before #149 (Migrate to react and nest), the loaders decoded ids
  (`decodeURIComponent(entity.id)`). The chat-api client migration dropped that step, so
  `mapToolsetToDialToolset` and `mapDeploymentToDialModel` in `src/utils/dialClient.ts`
  now keep the encoded id, and the save encodes it a second time.
- The same encoded id is also passed through `encodeDialPath` in `ToolsetLoginModal`
  for the toolset sign-in/sign-out calls, so those requests double-encode it too.

## Solution

Decode the id in `mapToolsetToDialToolset` and `mapDeploymentToDialModel`
(`decodeDialPath`), restoring the pre-#149 behaviour. All existing writers already
re-encode internal ids once (`encodeApiUrl` on save, `encodeDialPath` for chat-api path
parameters), so no other code changes.

Alternative considered: stop encoding on save. Rejected — ids loaded from a saved app are
decoded by the form, so they would then be saved unencoded, and the toolset sign-in path
would still double-encode.

## What Changes

- Fetched toolset, model and agent ids are kept decoded inside the editor.
- New `application_editing` requirement: entity ids are persisted in chat-api's canonical,
  single-encoded form.

## Non-goals

- No migration of apps already saved with a double-encoded id. Re-adding the toolset and
  saving fixes such an app.
- Not changing the host message format: `toolsetId` in
  `REQUEST_TOOLSET_LOGIN`/`REQUEST_TOOLSET_LOGOUT` goes back to the decoded form it had
  before #149.

## Capabilities

### Modified Capabilities

- `application_editing`: adds the requirement that referenced entity ids are saved
  single-encoded.

## Acceptance criteria

- A toolset with id `toolsets/b/QA%20enc%20check__1.0.0` (as returned by chat-api), once
  selected and saved, is persisted as `deployment_id: "toolsets/b/QA%20enc%20check__1.0.0"`.
- Same for an agent (application) id.
- `npm run lint`, `npm run build` and `npm test` pass.

## Impact

- Code: `src/utils/dialClient.ts`; new test `src/utils/tests/entity-id-encoding.test.ts`.
- No new endpoints, dependencies, UI, i18n or RTL changes.
- Rollback: revert the commit.
