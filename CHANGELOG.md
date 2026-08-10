# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Fixed

- Auth0 sign-in now supports `AUTH_AUTH0_AUDIENCE`, so Auth0 issues a JWT
  access token (instead of an opaque one) when an API audience is configured

## [0.1.2] - 2026-07-30

### Added

- Added env variable for Azure Ad scopes configuration: `AUTH_AZURE_AD_SCOPE`
- Added configurable OAuth scope env variables for providers that previously
  used provider defaults: `AUTH_KEYCLOAK_SCOPE`, `AUTH_AUTH0_SCOPE`,
  `AUTH_OKTA_SCOPE`, `AUTH_COGNITO_SCOPE`

## [0.1.1] - 2026-07-29

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
