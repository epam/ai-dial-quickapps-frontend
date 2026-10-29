## Why

Issue #286 (related to ai-dial-quickapps-backend#649): the QuickApps backend assumes UTC for the
agent's per-turn timestamps and tool-result annotations, because the user's time zone is never
known. The backend team asked the frontend to supply the browser's IANA time zone.

## What Changes

- A new util reads the browser time zone (`Intl.DateTimeFormat().resolvedOptions().timeZone`) and
  returns it only when `Intl` accepts it as a valid time zone; otherwise it returns `undefined`.
- `chatApiFetch`, the wrapper every chat-api call goes through, sends it as an `X-Timezone`
  request header, on the CSRF retry too. When there is no valid time zone the header is omitted.

## Assumptions and open points

- **Header name `X-Timezone` is provisional.** The contract is still to be agreed with the
  backend (design in `docs/designs/user_timezone.md`, not in this repo). The name is one constant,
  so changing it is a one-line edit.
- **Sender.** The agent's chat completions are sent by the DIAL Chat host, not by this editor,
  which only does CRUD against chat-api. This change covers the requests this app sends. The host
  may need the same change; that is outside this repo.
- **Editor field for an app-level default time zone** (`features.timestamp.default_timezone`) is
  deferred until the backend confirms it exists.

## Capabilities

### Modified Capabilities

- `auth`: adds "Client time zone header" next to "Mutating request authorization".

## Impact

- **Code:** `src/utils/get-client-time-zone.ts` (new), `src/utils/chat-api-fetch.ts`, tests.
- **API / chat-api:** every request gains an `X-Timezone` header. Chat-api is same-origin, so no
  CORS preflight change is expected.
- **Host integration, i18n, RTL:** none.
- **Rollback:** revert the commit.
