# Authentication Specification

## Purpose

QuickApps authenticates its user against the chat-api BFF's session (`/api/v1/auth/*`), which
in turn brokers a host-configured OAuth/OIDC identity provider on QuickApps' behalf, and uses
that session to authorize every call it makes to chat-api's typed API for DIAL Core data. This
capability defines: how the session is established and read, how QuickApps keeps that session
consistent with the provider a host requests, how a mutating request proves the session to
chat-api, how QuickApps reacts when chat-api rejects a request as unauthorized, and the
popup-based sign-in flow used when a specific provider is requested mid-session (see
`host-integration` for the `authProvider` query parameter that drives this).

QuickApps itself holds no provider credentials, access tokens, or refresh logic — provider
configuration (which OAuth/OIDC providers are available, their client secrets, issuer/tenant
hosts) and the session cookie's contents are entirely chat-api's deployment concern.

## Requirements

### Requirement: Session establishment and shape

QuickApps SHALL read its authenticated session by calling chat-api's `GET /api/v1/auth/me`
with credentials included, and SHALL treat a `401` response from that endpoint as "no session"
rather than an error.

#### Scenario: A session exists

- **WHEN** `GET /api/v1/auth/me` returns successfully
- **THEN** QuickApps SHALL treat the session as authenticated and use the returned profile
  (subject, provider identifier, claims, DIAL Core bucket, admin flag) for the rest of the app

#### Scenario: No session exists

- **WHEN** `GET /api/v1/auth/me` returns `401`
- **THEN** QuickApps SHALL treat the session as unauthenticated without surfacing it as an
  error, and SHALL NOT retry the call automatically

### Requirement: Session revalidation

QuickApps SHALL revalidate its session when the reasons it might have changed outside this
window are most likely — on initial mount and whenever the window regains focus — without
requiring a manual refresh action.

#### Scenario: The window regains focus

- **WHEN** the QuickApps window regains focus after having lost it
- **THEN** QuickApps SHALL re-request the current session from chat-api

### Requirement: Session provider consistency

QuickApps SHALL keep its authenticated session consistent with the `authProvider` query
parameter requested by the host (see `host-integration`'s "Entry URL query parameters").

#### Scenario: Active session provider differs from the requested provider

- **WHEN** QuickApps has an active, authenticated session whose provider identifier differs
  from the `authProvider` query parameter
- **THEN** QuickApps SHALL sign the current session out (without a full page redirect) so a
  session matching the requested provider can be established

### Requirement: Mutating request authorization

QuickApps SHALL prove its session to chat-api on every mutating (non-`GET`) request with a
CSRF token sourced from chat-api's own rotating `X-CSRF-Token` response header (the session
cookie itself is httpOnly and unreadable from script), and SHALL transparently recover from a
stale token instead of surfacing it as a failure to the caller.

#### Scenario: A mutating request is sent with a fresh CSRF token

- **WHEN** QuickApps sends a non-`GET` request to chat-api and its last-known CSRF token is
  still valid
- **THEN** chat-api SHALL accept the request without QuickApps needing to re-fetch anything
  first

#### Scenario: The CSRF token has gone stale

- **WHEN** chat-api rejects a non-`GET` request with `403` and a body indicating an invalid
  CSRF token
- **THEN** QuickApps SHALL re-fetch its session once to obtain a fresh token and retry the
  original request exactly once with it, rather than surfacing the `403` to the caller

### Requirement: Unauthorized-response recovery

QuickApps SHALL recover from a `401` response on any chat-api call without leaving the user
stuck on a broken screen, while avoiding an infinite reload loop when the session is
permanently unusable.

#### Scenario: First 401 seen in the current window

- **WHEN** a chat-api response is `401` and no other `401` was recorded within the last 30
  seconds
- **THEN** QuickApps SHALL record the current time and reload the page once, giving a
  server-side session refresh a chance to resolve the issue

#### Scenario: A second 401 arrives within the recovery window

- **WHEN** a chat-api response is `401` and another `401` was already recorded within the
  last 30 seconds
- **THEN** QuickApps SHALL sign the user out (without a full page redirect) instead of
  reloading again, so the user is not stuck in a reload loop

### Requirement: Popup-based provider sign-in

QuickApps SHALL be able to run a specific provider's sign-in flow in a separate popup window
without navigating the main window away from the editor, and SHALL detect the popup's
completion from the opener's own side rather than depending on the popup notifying it
directly.

#### Scenario: Sign-in is requested for a provider

- **WHEN** QuickApps opens the sign-in popup for a given provider identifier
- **THEN** the popup SHALL navigate directly to chat-api's provider login endpoint for that
  provider, with its callback pointed at QuickApps' own fixed sign-in-complete page

#### Scenario: The popup's own window state can't be relied on

- **WHEN** the sign-in popup is open
- **THEN** QuickApps SHALL detect completion by polling its own session from the opener (on
  an interval and whenever the opener regains focus) rather than depending on `postMessage`
  from the popup or reading the popup's `window.opener`, since COOP headers set by identity
  provider login pages can sever that cross-window link unpredictably

#### Scenario: The requested provider is not configured

- **WHEN** a sign-in is attempted for a provider identifier that isn't in the list returned
  by chat-api's providers endpoint
- **THEN** QuickApps SHALL show an error instead of attempting to start a popup flow for it

#### Scenario: Sign-in completion is detected

- **WHEN** QuickApps' polling detects that its session has become authenticated for the
  requested provider
- **THEN** QuickApps SHALL close the popup itself and re-render into the authenticated state
  without a full page reload, since its session state is already reactive

### Requirement: Denied-access presentation

QuickApps SHALL present a dedicated forbidden state, distinct from an unauthenticated state,
when the authenticated user is not permitted to use the application, and SHALL let the user
sign out from that state.

#### Scenario: The authenticated user lacks permission

- **WHEN** QuickApps determines the current authenticated session is not authorized to use
  the application
- **THEN** QuickApps SHALL render the forbidden state instead of the editor, offering a
  sign-out action that does not force a full page redirect
