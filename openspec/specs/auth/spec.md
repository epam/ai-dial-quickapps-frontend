# Authentication Specification

## Purpose

QuickApps authenticates its user against a host-configured OAuth/OIDC identity provider and
uses the resulting session to authorize every call it makes to DIAL Core. This capability
defines: which providers can be configured, how the session is established and kept fresh,
how QuickApps keeps that session consistent with the provider a host requests, how QuickApps
proves the session to DIAL Core, how it reacts when DIAL Core rejects that proof, and the
popup-based sign-in flow used when a specific provider is requested mid-session (see
`host-integration` for the `authProvider` query parameter that drives this).

## Requirements

### Requirement: Provider configuration

QuickApps SHALL support configuring one or more OAuth/OIDC providers (Keycloak, Azure AD,
Google, Auth0, Okta, Cognito, GitLab) via environment variables, and SHALL only offer a
provider as available when all of that provider's required variables (client ID, client
secret, and issuer/tenant/host as applicable) are present.

#### Scenario: A provider's required variables are only partially set

- **WHEN** some but not all of a provider's required environment variables are configured
- **THEN** QuickApps SHALL NOT register that provider as available, rather than starting it
  with missing configuration

#### Scenario: No providers are configured

- **WHEN** none of the supported providers have their required environment variables set
- **THEN** QuickApps SHALL present no sign-in options rather than failing to start

### Requirement: Session establishment and shape

QuickApps SHALL establish an authenticated session as an encrypted JWT carried in an httpOnly
cookie — not a database-backed session record — that carries the access token, its expiry,
the refresh token, and the identifier of the provider the session was established with.

#### Scenario: A provider completes its OAuth flow

- **WHEN** a user completes sign-in with a configured provider
- **THEN** QuickApps SHALL store that provider's access token, its expiry, and its refresh
  token (when issued) in the session, tagged with the provider's identifier

### Requirement: Access token refresh

QuickApps SHALL keep the session's access token usable across its lifetime without requiring
the user to re-authenticate, by refreshing it once it has expired.

#### Scenario: Session is read before the access token has expired

- **WHEN** the current access token's expiry has not yet passed
- **THEN** QuickApps SHALL reuse the existing access token without requesting a new one

#### Scenario: Session is read after the access token has expired

- **WHEN** the current access token's expiry has passed
- **THEN** QuickApps SHALL request a new access token from the session's provider using the
  stored refresh token, and SHALL replace the session's access token, expiry, and (if reissued)
  refresh token with the result

#### Scenario: Refresh fails

- **WHEN** a refresh attempt does not return a usable access token (the provider rejects the
  refresh token, or the request otherwise fails)
- **THEN** QuickApps SHALL mark the session as errored rather than silently keeping the stale
  access token, so downstream checks can treat the session as unauthenticated

### Requirement: Session provider consistency

QuickApps SHALL keep its authenticated session consistent with the `authProvider` query
parameter requested by the host (see `host-integration`'s "Entry URL query parameters").

#### Scenario: Active session provider differs from the requested provider

- **WHEN** QuickApps has an active session whose provider differs from the `authProvider`
  query parameter, and the session reports no error
- **THEN** QuickApps SHALL sign the current session out (without a full page redirect) so a
  session matching the requested provider can be established

### Requirement: DIAL Core request authorization

QuickApps SHALL authorize every request it proxies to DIAL Core with the session's access
token, and SHALL reject the request before contacting DIAL Core when no usable session exists.

#### Scenario: A DIAL Core proxy request arrives with a valid, non-errored session

- **WHEN** QuickApps receives a request to one of its `/api/dial/**` proxy routes and the
  request's session carries an access token with no session error
- **THEN** QuickApps SHALL forward the request to DIAL Core with that access token as a
  Bearer credential

#### Scenario: A DIAL Core proxy request arrives with no session or an errored session

- **WHEN** QuickApps receives a request to one of its `/api/dial/**` proxy routes and the
  request has no access token or the session is marked errored
- **THEN** QuickApps SHALL respond `401` without contacting DIAL Core

### Requirement: Unauthorized-response recovery

QuickApps SHALL recover from a DIAL Core `401` response without leaving the user stuck on a
broken screen, while avoiding an infinite reload loop when the token is permanently invalid
for DIAL Core (for example, a wrong audience).

#### Scenario: First 401 seen in the current window

- **WHEN** a DIAL Core response is `401` and no other `401` was recorded within the last 30
  seconds
- **THEN** QuickApps SHALL record the current time and reload the page once, giving a
  server-side token refresh a chance to resolve the issue

#### Scenario: A second 401 arrives within the recovery window

- **WHEN** a DIAL Core response is `401` and another `401` was already recorded within the
  last 30 seconds
- **THEN** QuickApps SHALL sign the user out (without a full page redirect) instead of
  reloading again, so the user is not stuck in a reload loop

### Requirement: Popup-based provider sign-in

QuickApps SHALL be able to run a specific provider's sign-in flow in a separate popup window
without navigating the main window away from the editor, and SHALL detect the popup's
completion through multiple independent signals so a completed sign-in is never missed.

#### Scenario: Sign-in is requested for a provider

- **WHEN** QuickApps opens the sign-in popup for a given provider identifier
- **THEN** the popup SHALL drive that provider's OAuth flow via the `/signin` route and, once
  the session becomes authenticated for that provider, SHALL notify the opener and close
  itself

#### Scenario: The popup cannot notify the opener directly

- **WHEN** the popup closes (or completes sign-in) without its notification reaching the
  opener via `postMessage` — for example due to cross-origin isolation or storage
  partitioning
- **THEN** QuickApps SHALL still detect completion, via polling the popup's closed state or
  via the opener regaining focus, and SHALL treat it the same as a received notification

#### Scenario: The requested provider is not configured

- **WHEN** the `/signin` route is opened with an `authProvider` value that does not match a
  configured provider
- **THEN** QuickApps SHALL show an error in the popup instead of attempting to start a flow
  for it

#### Scenario: Sign-in completion is detected

- **WHEN** QuickApps detects the popup has completed sign-in (by any of the signals above)
- **THEN** QuickApps SHALL reload the opener so it picks up the newly-established session

### Requirement: Denied-access presentation

QuickApps SHALL present a dedicated forbidden state, distinct from an unauthenticated state,
when the authenticated user is not permitted to use the application, and SHALL let the user
sign out from that state.

#### Scenario: The authenticated user lacks permission

- **WHEN** QuickApps determines the current authenticated session is not authorized to use
  the application
- **THEN** QuickApps SHALL render the forbidden state instead of the editor, offering a
  sign-out action that does not force a full page redirect
