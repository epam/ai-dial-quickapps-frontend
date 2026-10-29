## ADDED Requirements

### Requirement: Client time zone header

QuickApps SHALL send the user's browser time zone, as an IANA name such as `Europe/Warsaw`, in
an `X-Timezone` header on every request it makes to chat-api through `chatApiFetch`, including
the retry after a stale CSRF token. The value SHALL come from
`Intl.DateTimeFormat().resolvedOptions().timeZone`. QuickApps SHALL omit the header, rather than
send an empty or invalid value, when `Intl` is unavailable, throws, or returns a name it does
not accept as a time zone. A missing time zone SHALL NOT make any request fail.

#### Scenario: Browser time zone is available

- **WHEN** QuickApps sends any request to chat-api and the browser reports a valid time zone
- **THEN** the request SHALL carry `X-Timezone` set to that IANA name

#### Scenario: Time zone is unavailable or invalid

- **WHEN** the browser reports no time zone, an invalid one, or `Intl` throws
- **THEN** the request SHALL be sent without an `X-Timezone` header and otherwise unchanged

#### Scenario: Request is retried after a stale CSRF token

- **WHEN** a request is retried because chat-api rejected its CSRF token
- **THEN** the retry SHALL carry the same `X-Timezone` header as the original
