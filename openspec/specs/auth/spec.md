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

The forbidden state SHALL show, centred in the viewport:

- a decorative lock badge
- a title: `common` namespace, key `CommonI18nKeys.ForbiddenTitle` = "Access denied"
- a description: `common` namespace, key `CommonI18nKeys.ForbiddenDescription` = "You don't
  have permission to access this application."
- a single sign-out action: `common` namespace, key `CommonI18nKeys.ForbiddenAction` = "Log out"

All of the forbidden state's user-visible text SHALL come from these `common` i18n keys, not
from hardcoded strings. The session state stays in `AuthContext`. The sign-out request in flight
is local UI state of the forbidden screen.

#### Scenario: The authenticated user lacks permission

- **WHEN** QuickApps determines the current authenticated session is not authorized to use
  the application
- **THEN** QuickApps SHALL render the forbidden state instead of the editor, offering a
  sign-out action that does not force a full page redirect

#### Scenario: Sign-out is in progress

- **WHEN** the user activates "Log out" and the sign-out request has not finished yet
- **THEN** the action SHALL be disabled, and its label SHALL change to `common` key
  `CommonI18nKeys.ForbiddenActionPending` = "Logging out…", so a second request cannot be
  started

#### Scenario: Sign-out fails

- **WHEN** the sign-out request fails
- **THEN** QuickApps SHALL stay on the forbidden state with the "Log out" action enabled again,
  so the user can retry, and SHALL NOT leave the failure as an unhandled promise rejection

### Requirement: Unauthenticated sign-in prompt presentation

QuickApps SHALL show a dedicated sign-in prompt, instead of the editor, when the session is
unauthenticated and the host's requested `authProvider` is one of the providers chat-api reports
as configured (`GET /api/v1/auth/providers`). The prompt is distinct from the loading,
auth-error and forbidden states. It SHALL show, centred in the viewport:

- a decorative lock badge
- a title: `common` namespace, key `CommonI18nKeys.LoginScreenTitle` = "Log in to configure
  your QuickApp"
- a description: `common` namespace, key `CommonI18nKeys.LoginScreenDescription` = "Set up
  instructions, add-ons and settings."
- a single action button: `common` namespace, key `CommonI18nKeys.LoginScreenAction` = "Log in",
  with a trailing external-link icon that shows the sign-in opens in a separate window

All of the prompt's user-visible text SHALL come from these `common` i18n keys, not from
hardcoded strings.

The popup state stays in the `useAuth(provider)` hook (`src/hooks/useAuth.ts`), and the session
state stays in `AuthContext`. The prompt component SHALL NOT own any auth state of its own.

#### Scenario: Unauthenticated user with a configured provider

- **WHEN** the session is unauthenticated and the requested `authProvider` is in chat-api's
  providers list
- **THEN** QuickApps SHALL show the lock badge, the title, the description and the "Log in"
  action, and SHALL NOT show the editor

#### Scenario: The user starts sign-in

- **WHEN** the user activates the "Log in" action
- **THEN** QuickApps SHALL start the popup-based provider sign-in for the requested provider, as
  defined in "Popup-based provider sign-in"

#### Scenario: The sign-in popup is already open

- **WHEN** the sign-in popup opened from the prompt is still open
- **THEN** the action SHALL be disabled, and its label SHALL change to `common` key
  `CommonI18nKeys.LoginScreenWindowOpen` = "Log-in window is open…", so a second popup cannot be
  started

#### Scenario: The popup could not be opened

- **WHEN** the browser blocks the sign-in popup
- **THEN** the action SHALL go back to its enabled "Log in" state, so the user can try again

### Requirement: Sign-in prompt accessibility and direction

The sign-in prompt SHALL be usable with a keyboard and assistive technology, and SHALL render
correctly in right-to-left locales.

#### Scenario: Keyboard user

- **WHEN** a keyboard user tabs into the prompt
- **THEN** the "Log in" action SHALL be the only focusable control, it SHALL be a native button
  exposed with the role `button` and the accessible name "Log in", and it SHALL activate with
  Enter or Space

#### Scenario: Assistive technology reads the prompt

- **WHEN** a screen reader reads the prompt
- **THEN** the title SHALL be exposed as a heading, and the lock and external-link icons SHALL be
  hidden from assistive technology (`aria-hidden`), because they are decorative

#### Scenario: Right-to-left locale

- **WHEN** the document direction is `rtl`
- **THEN** the prompt SHALL stay centred, the lock icon SHALL NOT be mirrored, and the
  external-link icon SHALL be mirrored horizontally, so that its arrow points toward the inline
  end

### Requirement: Auth configuration error presentation

QuickApps SHALL show a dedicated configuration-error state, instead of the sign-in prompt or the
editor, when the session is unauthenticated and sign-in cannot be offered because of how the
host or deployment is configured. It SHALL show, centred in the viewport:

- a decorative warning badge
- a title: `common` namespace, key `CommonI18nKeys.AuthErrorTitle` = "Log-in isn't available"
- a description that depends on the reason, as in the scenarios below

The state SHALL NOT offer any action, because the user can't fix it from this screen. The reason
SHALL be passed to the screen as a value of the `AuthErrorReason` string enum
(`src/types/auth.ts`), never as pre-built display text. All of the state's user-visible text
SHALL come from `common` i18n keys.

#### Scenario: No auth provider is requested

- **WHEN** the session is unauthenticated and the host did not pass an `authProvider` query
  parameter
- **THEN** QuickApps SHALL show the configuration-error state, with the description from
  `common` key `CommonI18nKeys.AuthErrorNoProvider` = "No auth provider specified for this app"

#### Scenario: The requested provider is not configured

- **WHEN** the session is unauthenticated and the requested `authProvider` is not in chat-api's
  providers list (`GET /api/v1/auth/providers`)
- **THEN** QuickApps SHALL show the configuration-error state, with the description from
  `common` key `CommonI18nKeys.AuthErrorProviderNotConfigured` = "Auth provider {{provider}} is
  not configured for this app", where `{{provider}}` is the requested provider identifier

### Requirement: Forbidden and configuration-error screen accessibility and direction

The forbidden and configuration-error screens SHALL be usable with assistive technology and a
keyboard, and SHALL render correctly in right-to-left locales. They SHALL share their layout
with the sign-in prompt, so all three full-page auth states look the same.

#### Scenario: Assistive technology reads the screen

- **WHEN** a screen reader reads the forbidden or configuration-error screen
- **THEN** the title SHALL be exposed as a heading, and the badge icon SHALL be hidden from
  assistive technology (`aria-hidden`), because it is decorative

#### Scenario: Keyboard user on the forbidden screen

- **WHEN** a keyboard user tabs into the forbidden screen
- **THEN** "Log out" SHALL be the only focusable control, it SHALL be a native button exposed
  with the role `button` and the accessible name "Log out", and it SHALL activate with Enter or
  Space

#### Scenario: Keyboard user on the configuration-error screen

- **WHEN** a keyboard user tabs into the configuration-error screen
- **THEN** the screen SHALL contain no focusable controls

#### Scenario: Right-to-left locale

- **WHEN** the document direction is `rtl`
- **THEN** both screens SHALL stay centred, and their badge icons SHALL NOT be mirrored, because
  they are symmetric
