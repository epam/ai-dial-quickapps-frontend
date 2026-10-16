## Why

`docs/TECH_DEBT.md` ("General summary lookup misses encoded ids"): `fetchApplicationSummary`
(`src/utils/dial-client.ts`) looks for the editor's application in the
`GET /api/v1/deployments?interface_type=chat` listing with `d.id === appId`. chat-api returns
listing ids percent-encoded per path segment (`My%20agent`), but the editor holds the id decoded
(`My agent`). So for any id with a space or another special character, no entry matches. The
description, icon, topics and display version then load empty, and a save without `general`
writes them back empty.

## What Changes

- `fetchApplicationSummary` compares `decodeDialPath(d.id)` with the decoded `appId`, the same
  normalisation `mapDeploymentToDialModel` applies to listing ids.

## Capabilities

### Modified Capabilities

- `application_editing`: "Application load on open" names the listing entry match.

## Impact

- **Code:** `src/utils/dial-client.ts` and a test in `src/utils/tests/`.
- **API / chat-api:** none; the same request is read correctly.
- **Host integration, i18n, RTL:** none.
- **Rollback:** revert the commit.
