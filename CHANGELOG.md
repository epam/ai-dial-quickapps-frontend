# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-09-26

Migrated the app to a different tech stack: it's no longer a Next.js app with its own
`next-auth`-based BFF and API routes. It's now a plain Vite-built React SPA (no server code of
its own) served directly by [chat-api](https://github.com/epam/ai-dial-chat)'s own server, which
also now owns auth and every DIAL entity call. See `docs/TRANSITION_PLAN.md` for the full
rationale and rollout detail.

### ⚠ BREAKING CHANGES — must read before deploying this version

The Docker image is different (it's now `chat-api` + this app's static build, not a standalone
Next.js server), and **every runtime environment variable sets for this app has changed**
— old `.env`/deployment config for a pre-1.0.0 deployment will not work unchanged.

#### Environment variables changes

- **Renamed / consolidated** — old variable still has an equivalent, but under a new name or
  nested inside a JSON blob:

  | Old variable                  | New location                                                                  |
  | ----------------------------- | ----------------------------------------------------------------------------- |
  | `NEXTAUTH_SECRET`             | `AUTH_SESSION_SECRET` (64 hex chars; `AUTH_SESSION_PREV_SECRET` for rotation) |
  | `NEXTAUTH_URL`                | `AUTH_CALLBACK_BASE_URL` (also drives `CORS_ORIGIN`, set separately)          |
  | `THEMES_URL`                  | `THEMES_CONFIG_URL`                                                           |
  | `ALLOWED_FRAME_ANCESTORS`     | `ALLOWED_IFRAME_ORIGINS`                                                      |
  | `QUICK_APPS_DEFAULT_MODEL`    | `DEFAULT_DEPLOYMENT`                                                          |
  | `CODE_INTERPRETER_ENABLED`    | `CUSTOM_CLIENT_VARIABLES.codeInterpreterEnabled` (JSON)                       |
  | `WEB_FETCH_ENABLED`           | `CUSTOM_CLIENT_VARIABLES.webFetchEnabled` (JSON)                              |
  | `ADD_ATTACHMENT_ENABLED`      | `CUSTOM_CLIENT_VARIABLES.addAttachmentEnabled` (JSON)                         |
  | `ALLOWED_ORIGIN`              | `CUSTOM_CLIENT_VARIABLES.allowedOrigin` (JSON)                                |
  | `DIAL_ADMIN_URL`              | `CUSTOM_CLIENT_VARIABLES.dialAdminHost` (JSON)                                |
  | `DIAL_CHAT_URL`               | `CUSTOM_CLIENT_VARIABLES.dialChatHost` (JSON)                                 |
  | `QUICK_APPS_APPLICATION_NAME` | `CUSTOM_CLIENT_VARIABLES.applicationName` (JSON)                              |

  The last six are folded into one JSON object env var, `CUSTOM_CLIENT_VARIABLES`, with the same
  meaning as before, just camelCased and nested.

- **Auth identity provider variables (`AUTH_<PROVIDER>_*`)**

  | Old variable                  | New variable           |
  | ----------------------------- | ---------------------- |
  | `AUTH_AUTH0_ISSUER`           | `AUTH_AUTH0_HOST`      |
  | `AUTH_AUTH0_CLIENT_SECRET`    | `AUTH_AUTH0_SECRET`    |
  | `AUTH_KEYCLOAK_ISSUER`        | `AUTH_KEYCLOAK_HOST`   |
  | `AUTH_KEYCLOAK_CLIENT_SECRET` | `AUTH_KEYCLOAK_SECRET` |
  | `AUTH_AZURE_AD_CLIENT_SECRET` | `AUTH_AZURE_AD_SECRET` |

  If there were other providers configured, make similar changes.

- **New** — did not exist pre-1.0.0:

  | Variable                        | Required? | Notes                                                                                                                                         |
  | ------------------------------- | --------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
  | `CORS_ORIGIN`                   | Yes       | Same value as AUTH_CALLBACK_BASE_URL                                                                                                          |
  | `DIAL_CORE_URL`                 | Yes       | Was already required                                                                                                                          |
  | `AUTH_POST_LOGOUT_REDIRECT_URI` | Yes       | Should be set to the same value as `CORS_ORIGIN` and `AUTH_CALLBACK_BASE_URL`                                                                 |
  | `AUTH_SESSION_COOKIE_NAME`      | No        | Rename away from chat-api's own `chat.*` default, e.g. `__Host-quickapps.sess`                                                                |
  | `AUTH_TRANSACTION_COOKIE_NAME`  | No        | Rename away from chat-api's own `chat.*` default, e.g. `__Host-quickapps.tx`                                                                  |
  | `AUTH_LEGACY_COOKIE_NAMES`      | No        | List the old next-auth cookie names here so they get actively expired — see the `HTTP ERROR 431` known issue in `README.md` if this isn't set |
  | `CSP_MODE`                      | No        | Defaults to `report-only`                                                                                                                     |
  | `ALLOWED_CONNECT_ORIGINS`       | No        | External connection origins permitted by CSP                                                                                                  |

### OAuth redirect URI path changed for every provider

The callback path moved from `/api/auth/callback/<provider>` to `/api/v1/auth/callback/<provider>`.
Each identity provider's registered redirect URI must be updated to match, or sign-in will fail.
Example (Keycloak):

- Before: `https://keycloak.example/realms/dial/protocol/openid-connect/auth?client_id=client_id&scope=openid%20profile%20email%20offline_access&response_type=code&redirect_uri=https%3A%2F%2Fquickapps.example%2Fapi%2Fauth%2Fcallback%2Fkeycloak`
- Now: `https://keycloak.example/realms/dial/protocol/openid-connect/auth?client_id=client_id&scope=dial%20openid%20email%20profile&response_type=code&redirect_uri=https%3A%2F%2Fquickapps.example%2Fapi%2Fv1%2Fauth%2Fcallback%2Fkeycloak`

## [0.2.0] - 2026-09-16

### Fixed

- Fixed issue #128: REST API toolset displays in red color in Agents & Toolsets field — appears inactive but functions correctly

## [0.1.4] - 2026-09-16

### Added

- Additional scope info (agent/toolset owner) now shown on the card, Issue #129

### Changed

- Upgraded `@epam/ai-dial-ui-kit` to the latest version
- Bumped `hono`, `@vitest/mocker`, `vitest`, `baseline-browser-mapping`, `browserslist`, `nanoid`, `js-yaml`, `fast-uri` dependencies
- Bumped `epam/ai-dial-ci` from 4.8.0 to 4.11.0
- Updated project reference in bug report and feature request templates

## [0.1.3] - 2026-09-03

## Fixed

- Login/logout into toolset via API Key now works

## [0.1.2] - 2026-09-01

### Added

- Web Fetch and Add Attachment toggles in the QuickApp2 editor are now gated behind new `WEB_FETCH_ENABLED` and `ADD_ATTACHMENT_ENABLED` environment variables, matching the existing `CODE_INTERPRETER_ENABLED` pattern

## [0.1.1] - 2026-08-31

### Fixed

- Temperature is no longer set for models that doesn't support it

## [0.1.0] - 2026-08-26

Finalized RC changes

## [0.1.0-rc.4] - 2026-08-26

### Fixed

- Max. attachments number now correctly saves
- Toolsets show correct auth status for both auth ways

## [0.1.0-rc.3] - 2026-08-18

### Added

- Support for name localizations across the application

### Fixed

- File overwrite behavior on select (Issue #94)
- Name and description localization edge cases (Issue #103)
- Sorting and mobile layout issues (Issue #97)
- File deletion flow
- Search empty state behavior (Issue #79)
- Delete file modal in File Manager (Issue #93)
- Sorting of agents & toolsets in modal (Issue #67)
- Error handling for agent/toolset name resolution (Issue #89)
- File API integration issues (Issue #75, #76)
- Duplicate attached files being displayed

### Changed

- Updated @epam/ai-dial-ui-kit to latest version
- Bumped @hono/node-server and @modelcontextprotocol/sdk dependencies

## [0.1.0-rc.2] - 2026-08-12

### Fixed

- Auth0 sign-in now supports `AUTH_AUTH0_AUDIENCE`, so Auth0 issues a JWT
  access token (instead of an opaque one) when an API audience is configured
- Agnents&Toolset popup now shows items that support MCP. The chip has now Configure button.

## [0.1.0-rc.1] - 2026-07-30

### Added

- Added env variable for Azure Ad scopes configuration: `AUTH_AZURE_AD_SCOPE`
- Added configurable OAuth scope env variables for providers that previously
  used provider defaults: `AUTH_KEYCLOAK_SCOPE`, `AUTH_AUTH0_SCOPE`,
  `AUTH_OKTA_SCOPE`, `AUTH_COGNITO_SCOPE`

## [0.1.0-rc.0] - 2026-07-29

### Added

- GitLab OAuth authentication provider support — configure with
  `AUTH_GITLAB_CLIENT_ID`, `AUTH_GITLAB_SECRET`, `AUTH_GITLAB_HOST`
  (optional: `AUTH_GITLAB_NAME`, `AUTH_GITLAB_SCOPE`)
- Access-denied page shown when the user lacks permission to access the application
- OpenTelemetry tracing and structured server-side logging with pino —
  configure with `OTEL_SERVICE_NAME`, `OTEL_EXPORTER_OTLP_ENDPOINT`,
  `OTEL_EXPORTER_OTLP_PROTOCOL`, `OTEL_METRICS_EXPORTER`, `OTEL_LOG_LEVEL`

### Fixed

- Loader screen style and background aligned with chat design (Issue #54)
- `display_version` field now saved correctly as part of general application properties (Issue #7915)
- `.dial_folder` applications hidden from listings

### Changed

- Default server port changed to 5000
- Google OAuth scope is now configurable via `AUTH_GOOGLE_SCOPE`
  (previously hardcoded to `openid email profile offline_access`)

### Security

- Upgraded `brace-expansion` dependency to address a known vulnerability
