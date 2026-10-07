## ADDED Requirements

### Requirement: Unauthenticated sign-in prompt presentation

QuickApps SHALL show a dedicated sign-in prompt, instead of the editor, when the session is unauthenticated and the host's requested `authProvider` is one of the providers chat-api reports as configured (`GET /api/v1/auth/providers`, already called today; this change adds no new endpoints). The prompt is distinct from the loading, auth-error and forbidden states. It SHALL show, centred in the viewport:

- a decorative lock badge
- a title: `common` namespace, key `CommonI18nKeys.LoginScreenTitle` = "Log in to configure your QuickApp"
- a description: `common` namespace, key `CommonI18nKeys.LoginScreenDescription` = "Set up instructions, add-ons and settings."
- a single action button: `common` namespace, key `CommonI18nKeys.LoginScreenAction` = "Log in", with a trailing external-link icon that shows the sign-in opens in a separate window

All of the prompt's user-visible text SHALL come from these `common` i18n keys, not from hardcoded strings.

The popup state stays in the `useAuth(provider)` hook (`src/hooks/useAuth.ts`), and the session state stays in `AuthContext`. The prompt component SHALL NOT own any auth state of its own.

#### Scenario: Unauthenticated user with a configured provider

- **WHEN** the session is unauthenticated and the requested `authProvider` is in chat-api's providers list
- **THEN** QuickApps SHALL show the lock badge, the title, the description and the "Log in" action, and SHALL NOT show the editor

#### Scenario: The user starts sign-in

- **WHEN** the user activates the "Log in" action
- **THEN** QuickApps SHALL start the popup-based provider sign-in for the requested provider, as defined in "Popup-based provider sign-in"

#### Scenario: The sign-in popup is already open

- **WHEN** the sign-in popup opened from the prompt is still open
- **THEN** the action SHALL be disabled, and its label SHALL change to `common` key `CommonI18nKeys.LoginScreenWindowOpen` = "Log-in window is open…", so a second popup cannot be started

#### Scenario: The popup could not be opened

- **WHEN** the browser blocks the sign-in popup
- **THEN** the action SHALL go back to its enabled "Log in" state, so the user can try again

### Requirement: Sign-in prompt accessibility and direction

The sign-in prompt SHALL be usable with a keyboard and assistive technology, and SHALL render correctly in right-to-left locales.

#### Scenario: Keyboard user

- **WHEN** a keyboard user tabs into the prompt
- **THEN** the "Log in" action SHALL be the only focusable control, it SHALL be a native button exposed with the role `button` and the accessible name "Log in", and it SHALL activate with Enter or Space

#### Scenario: Assistive technology reads the prompt

- **WHEN** a screen reader reads the prompt
- **THEN** the title SHALL be exposed as a heading, and the lock and external-link icons SHALL be hidden from assistive technology (`aria-hidden`), because they are decorative

#### Scenario: Right-to-left locale

- **WHEN** the document direction is `rtl`
- **THEN** the prompt SHALL stay centred, the lock icon SHALL NOT be mirrored, and the external-link icon SHALL be mirrored horizontally, so that its arrow points toward the inline end
