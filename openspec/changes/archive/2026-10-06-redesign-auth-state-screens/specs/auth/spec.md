## MODIFIED Requirements

### Requirement: Denied-access presentation

QuickApps SHALL present a dedicated forbidden state, distinct from an unauthenticated state, when the authenticated user is not permitted to use the application, and SHALL let the user sign out from that state.

The forbidden state SHALL show, centred in the viewport:

- a decorative lock badge
- a title: `common` namespace, key `CommonI18nKeys.ForbiddenTitle` = "Access denied"
- a description: `common` namespace, key `CommonI18nKeys.ForbiddenDescription` = "You don't have permission to access this application."
- a single sign-out action: `common` namespace, key `CommonI18nKeys.ForbiddenAction` = "Log out"

All of the forbidden state's user-visible text SHALL come from these `common` i18n keys, not from hardcoded strings. The session state stays in `AuthContext`. The sign-out request in flight is local UI state of the forbidden screen.

#### Scenario: The authenticated user lacks permission

- **WHEN** QuickApps determines the current authenticated session is not authorized to use the application
- **THEN** QuickApps SHALL render the forbidden state instead of the editor, offering a sign-out action that does not force a full page redirect

#### Scenario: Sign-out is in progress

- **WHEN** the user activates "Log out" and the sign-out request has not finished yet
- **THEN** the action SHALL be disabled, and its label SHALL change to `common` key `CommonI18nKeys.ForbiddenActionPending` = "Logging out…", so a second request cannot be started

#### Scenario: Sign-out fails

- **WHEN** the sign-out request fails
- **THEN** QuickApps SHALL stay on the forbidden state with the "Log out" action enabled again, so the user can retry, and SHALL NOT leave the failure as an unhandled promise rejection

## ADDED Requirements

### Requirement: Auth configuration error presentation

QuickApps SHALL show a dedicated configuration-error state, instead of the sign-in prompt or the editor, when the session is unauthenticated and sign-in cannot be offered because of how the host or deployment is configured. It SHALL show, centred in the viewport:

- a decorative warning badge
- a title: `common` namespace, key `CommonI18nKeys.AuthErrorTitle` = "Log-in isn't available"
- a description that depends on the reason, as in the scenarios below

The state SHALL NOT offer any action, because the user can't fix it from this screen. The reason SHALL be passed to the screen as a value of the `AuthErrorReason` string enum (`src/types/auth.ts`), never as pre-built display text. All of the state's user-visible text SHALL come from `common` i18n keys.

#### Scenario: No auth provider is requested

- **WHEN** the session is unauthenticated and the host did not pass an `authProvider` query parameter
- **THEN** QuickApps SHALL show the configuration-error state, with the description from `common` key `CommonI18nKeys.AuthErrorNoProvider` = "No auth provider specified for this app"

#### Scenario: The requested provider is not configured

- **WHEN** the session is unauthenticated and the requested `authProvider` is not in chat-api's providers list (`GET /api/v1/auth/providers`)
- **THEN** QuickApps SHALL show the configuration-error state, with the description from `common` key `CommonI18nKeys.AuthErrorProviderNotConfigured` = "Auth provider {{provider}} is not configured for this app", where `{{provider}}` is the requested provider identifier

### Requirement: Forbidden and configuration-error screen accessibility and direction

The forbidden and configuration-error screens SHALL be usable with assistive technology and a keyboard, and SHALL render correctly in right-to-left locales. They SHALL share their layout with the sign-in prompt, so all three full-page auth states look the same.

#### Scenario: Assistive technology reads the screen

- **WHEN** a screen reader reads the forbidden or configuration-error screen
- **THEN** the title SHALL be exposed as a heading, and the badge icon SHALL be hidden from assistive technology (`aria-hidden`), because it is decorative

#### Scenario: Keyboard user on the forbidden screen

- **WHEN** a keyboard user tabs into the forbidden screen
- **THEN** "Log out" SHALL be the only focusable control, it SHALL be a native button exposed with the role `button` and the accessible name "Log out", and it SHALL activate with Enter or Space

#### Scenario: Keyboard user on the configuration-error screen

- **WHEN** a keyboard user tabs into the configuration-error screen
- **THEN** the screen SHALL contain no focusable controls

#### Scenario: Right-to-left locale

- **WHEN** the document direction is `rtl`
- **THEN** both screens SHALL stay centred, and their badge icons SHALL NOT be mirrored, because they are symmetric
