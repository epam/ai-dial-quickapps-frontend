# Quick Apps Frontend

Standalone Next.js app for QuickApp2 settings editer. Designed to be embedded as an `<iframe>` inside `ai-dial-chat` and communicate with the host via `postMessage`.

## Development

```bash
npm install
cp .env.template .env.local   # fill in values — see Environment variables below
npm run dev
```

## Commands

| Command         | Description              |
| --------------- | ------------------------ |
| `npm run dev`   | Start development server |
| `npm run build` | Type-check and build     |
| `npm run lint`  | Run ESLint               |

## Docker build

From the project root, run:

`docker build -t ai-dial-quickapps-frontend .`

Then to run it, mapping the container's port 5000 to a local port:

`docker run -p 5000:5000 ai-dial-quickapps-frontend`

App will be available at http://localhost:5000.

## Authentication

The editor supports two authentication modes that coexist:

The editor uses [NextAuth.js](https://next-auth.js.org) and supports multiple OAuth/OIDC providers: Keycloak, Azure AD, Google, Auth0, Okta, Cognito, and GitLab. Enable a provider by setting all of its required environment variables (see [Environment variables](#environment-variables) below); providers with missing configuration are skipped. Multiple providers can be enabled at the same time. After sign-in the access token is kept server-side and injected into the DIAL API proxy automatically. Token refresh is handled transparently per provider.

The proxy at `/api/dial/[...path]` tries the `dial_session` cookie first; if absent it falls back to the NextAuth session token.

### Provider client setup

For each provider you enable, register a confidential OAuth client with:

- **Valid redirect URI**: `{NEXTAUTH_URL}/api/auth/callback/{provider}` — where `{provider}` is `keycloak`, `azure-ad`, `google`, `auth0`, `okta`, `cognito`, or `gitlab`.
- **Web origin**: `{NEXTAUTH_URL}`

## Environment variables

Copy `.env.template` to `.env.local` and fill in values. All variables without a `NEXT_PUBLIC_` prefix are server-side only.

### Server

| Variable | Required | Default | Description                                                                               |
| -------- | :------: | ------- | ----------------------------------------------------------------------------------------- |
| `PORT`   |    No    | `4600`  | Port the dev/production server listens on. Also update `NEXTAUTH_URL` when changing this. |

### Authentication

| Variable          | Required | Description                                                                                             |
| ----------------- | :------: | ------------------------------------------------------------------------------------------------------- |
| `NEXTAUTH_SECRET` |   Yes    | Secret for signing session cookies. Generate with `openssl rand -base64 32`.                            |
| `NEXTAUTH_URL`    |   Yes    | Public URL of this app, e.g. `https://quickapps.example.com`. Required for OAuth callback registration. |

At least one OAuth provider below must be fully configured (all of its non-`_NAME` variables set). `*_NAME` variables are optional and override the display name shown on the sign-in button (defaults to `SSO`).

#### Keycloak

| Variable                      | Required | Default                                | Description                                                         |
| ----------------------------- | :------: | --------------------------------------- | --------------------------------------------------------------------- |
| `AUTH_KEYCLOAK_ISSUER`        |   Yes    |                                         | Keycloak realm URL, e.g. `https://keycloak.example.com/realms/dial` |
| `AUTH_KEYCLOAK_CLIENT_ID`     |   Yes    |                                         | Keycloak client ID                                                  |
| `AUTH_KEYCLOAK_CLIENT_SECRET` |   Yes    |                                         | Keycloak client secret                                              |
| `AUTH_KEYCLOAK_NAME`          |    No    |                                         | Sign-in button label                                                |
| `AUTH_KEYCLOAK_SCOPE`         |    No    | `openid profile email offline_access`  | Space-separated OAuth scopes                                        |

#### Azure AD

| Variable                      | Required | Description                      |
| ----------------------------- | :------: | -------------------------------- |
| `AUTH_AZURE_AD_CLIENT_ID`     |   Yes    | Azure AD application (client) ID |
| `AUTH_AZURE_AD_CLIENT_SECRET` |   Yes    | Azure AD client secret           |
| `AUTH_AZURE_AD_TENANT_ID`     |   Yes    | Azure AD tenant ID               |
| `AUTH_AZURE_AD_NAME`          |    No    | Sign-in button label             |
| `AUTH_AZURE_AD_SCOPE`         |    No    | Space-separated OAuth scopes     |

#### Google

| Variable                    | Required | Default                               | Description                  |
| --------------------------- | :------: | ------------------------------------- | ---------------------------- |
| `AUTH_GOOGLE_CLIENT_ID`     |   Yes    |                                       | Google OAuth client ID       |
| `AUTH_GOOGLE_CLIENT_SECRET` |   Yes    |                                       | Google OAuth client secret   |
| `AUTH_GOOGLE_NAME`          |    No    | `SSO`                                 | Sign-in button label         |
| `AUTH_GOOGLE_SCOPE`         |    No    | `openid email profile offline_access` | Space-separated OAuth scopes |

#### Auth0

| Variable                   | Required | Default                                | Description                                               |
| -------------------------- | :------: | --------------------------------------- | --------------------------------------------------------- |
| `AUTH_AUTH0_CLIENT_ID`     |   Yes    |                                         | Auth0 application client ID                               |
| `AUTH_AUTH0_CLIENT_SECRET` |   Yes    |                                         | Auth0 application client secret                           |
| `AUTH_AUTH0_ISSUER`        |   Yes    |                                         | Auth0 tenant domain URL, e.g. `https://dial.us.auth0.com` |
| `AUTH_AUTH0_NAME`          |    No    |                                         | Sign-in button label                                      |
| `AUTH_AUTH0_SCOPE`         |    No    | `openid profile email offline_access`  | Space-separated OAuth scopes                               |

#### Okta

| Variable                  | Required | Default                                | Description                                                                |
| ------------------------- | :------: | --------------------------------------- | -------------------------------------------------------------------------- |
| `AUTH_OKTA_CLIENT_ID`     |   Yes    |                                         | Okta application client ID                                                 |
| `AUTH_OKTA_CLIENT_SECRET` |   Yes    |                                         | Okta application client secret                                             |
| `AUTH_OKTA_ISSUER`        |   Yes    |                                         | Okta authorization server URL, e.g. `https://dial.okta.com/oauth2/default` |
| `AUTH_OKTA_NAME`          |    No    |                                         | Sign-in button label                                                       |
| `AUTH_OKTA_SCOPE`         |    No    | `openid profile email offline_access`  | Space-separated OAuth scopes                                               |

#### Cognito

| Variable                     | Required | Default                     | Description                                                                                      |
| ---------------------------- | :------: | ----------------------------- | ------------------------------------------------------------------------------------------------ |
| `AUTH_COGNITO_CLIENT_ID`     |   Yes    |                               | Cognito app client ID                                                                            |
| `AUTH_COGNITO_CLIENT_SECRET` |   Yes    |                               | Cognito app client secret                                                                        |
| `AUTH_COGNITO_ISSUER`        |   Yes    |                               | Cognito user pool issuer URL, e.g. `https://cognito-idp.us-east-1.amazonaws.com/us-east-1_xxxxx` |
| `AUTH_COGNITO_NAME`          |    No    |                               | Sign-in button label                                                                             |
| `AUTH_COGNITO_SCOPE`         |    No    | `openid profile email`       | Space-separated OAuth scopes                                                                      |

#### GitLab

| Variable                | Required | Default     | Description                                                     |
| ----------------------- | :------: | ----------- | --------------------------------------------------------------- |
| `AUTH_GITLAB_CLIENT_ID` |   Yes    |             | GitLab OAuth application ID                                     |
| `AUTH_GITLAB_SECRET`    |   Yes    |             | GitLab OAuth application secret                                 |
| `AUTH_GITLAB_HOST`      |   Yes    |             | GitLab hostname, e.g. `gitlab.example.com` (without `https://`) |
| `AUTH_GITLAB_NAME`      |    No    | `SSO`       | Sign-in button label                                            |
| `AUTH_GITLAB_SCOPE`     |    No    | `read_user` | Space-separated OAuth scopes                                    |

### DIAL core

| Variable        | Required | Description                                                                                                                                             |
| --------------- | :------: | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `DIAL_CORE_URL` |   Yes    | Base URL of the DIAL core API, e.g. `https://core.example.com`. Used as the proxy target in standalone mode and as the default host in the dev harness. |

### Chat visualizer connector

| Variable                      | Required | Description                                                                                                                                                                                                 |
| ----------------------------- | :------: | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `DIAL_ADMIN_URL`              |    No    | Origin of the admin host this app is embedded in. Used as the default target for `@epam/ai-dial-chat-visualizer-connector`.                                                                                 |
| `DIAL_CHAT_URL`               |    No    | Origin of the `ai-dial-chat` host. Used instead of `DIAL_ADMIN_URL` when the app detects it's embedded directly inside chat (`document.location.ancestorOrigins[0]` matches this value).                    |
| `QUICK_APPS_APPLICATION_NAME` |    No    | Visualizer name, must match the `title` configured for this app in `ai-dial-chat`'s visualizer settings. Required (together with at least one of the hosts above) for the visualizer connector to activate. |

### Themes

| Variable     | Required | Default | Description                                                                         |
| ------------ | :------: | ------- | ----------------------------------------------------------------------------------- |
| `THEMES_URL` |    No    | —       | URL to the DIAL themes `config.json`. Falls back to CSS variable defaults if unset. |

### Feature flags

| Variable                   | Required | Default | Description                                                                                                                                                         |
| -------------------------- | :------: | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `CODE_INTERPRETER_ENABLED` |    No    | `false` | Enables the Code Interpreter toggle in the QuickApp2 editor. Served to the client via `GET /api/settings`, mirroring the `ENABLED_FEATURES` flag in `ai-dial-chat`. |

### Security

| Variable                   | Required | Default  | Description                                                                                                                                                                                                                                                                                |
| -------------------------- | :------: | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `ALLOWED_FRAME_ANCESTORS`  |    No    | `'self'` | Space-separated list of origins allowed to embed this app in an `<iframe>`, sent as the CSP `frame-ancestors` directive. Set to the exact `ai-dial-chat` URL(s) in production.                                                                                                             |
| `ALLOWED_ORIGIN`           |    No    | `*`      | Origin allowed to send `postMessage` events to the editor iframe. Set to the exact ai-dial-chat URL in production (e.g. `https://chat.example.com`). Using `*` accepts messages from any origin — fine for local dev, **unsafe for production**. Served to the client via `/api/settings`. |
| `QUICK_APPS_DEFAULT_MODEL` |    No    | `gpt-4o` | Model ID pre-selected in the form when no model is stored in the app config. Served to the client via `/api/settings`.                                                                                                                                                                     |

## Content Security Policy

This app sends a `Content-Security-Policy: frame-ancestors ...` header (configured in `next.config.ts`) to control which origins are allowed to embed it in an `<iframe>`. By default `frame-ancestors 'self'` is sent, meaning no other site can frame it until `ALLOWED_FRAME_ANCESTORS` is set. In production, set it to the exact `ai-dial-chat` origin(s) that embed this app.

## postMessage protocol

The editor page (at `/`) communicates with its host via `postMessage`. Both sides validate `event.origin` against `ALLOWED_ORIGIN`.

In Dev mode the messages can be sent via console, e.g.

```
document.querySelector('iframe').contentWindow.postMessage({ type: 'TRIGGER_SAVE' }, '*')
```

**Host → iframe**

| Message type        | Payload                                                                                                     | Description                                                                                                                                                                                                                                                              |
| ------------------- | ----------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `TRIGGER_SAVE`      | `{ general?: { name: string; description?: string; iconUrl?: string; topics?: string[]; intro?: string } }` | Triggers a manual save. `general` carries the host's current General-step fields for an existing app so they're merged into this single save instead of a separate host-side write; omitted for Preview or for an app created in this session. Never includes `version`. |
| `TRIGGER_AUTO_SAVE` | `{ ignoreDirty?: boolean }`                                                                                 | Triggers an auto-save                                                                                                                                                                                                                                                    |
| `RESET`             | —                                                                                                           | Resets the form to the last saved state                                                                                                                                                                                                                                  |

In addition to host-triggered `TRIGGER_AUTO_SAVE` messages, the editor auto-saves itself on a 30-second interval (only when the form is dirty) while mounted — no host action is required.

**Iframe → host**

| Message type         | Payload                                 | Description                                                                                                   |
| -------------------- | --------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `READY`              | —                                       | Editor mounted; host should send `INIT`                                                                       |
| `DIRTY_STATE`        | `{ isDirty: boolean }`                  | Form dirty state changed                                                                                      |
| `SAVE_SUCCESS`       | `{ updatedApp }`, `hasChanges: boolean` | Save completed successfully; `hasChanges` is `true` if any user-editable field changed versus a no-op re-save |
| `SAVE_ERROR`         | `{ error: string }`                     | Save failed                                                                                                   |
| `AUTO_SAVE_COMPLETE` | —                                       | Auto-save completed successfully                                                                              |
| `HEIGHT_CHANGE`      | `{ height: number }`                    | Editor height changed (for iframe resize)                                                                     |

## Setup OpenTelemetry

All standard env variables you could find in the official [opentelemetry documentation](https://opentelemetry.io/docs/specs/otel/configuration/sdk-environment-variables/).
If no value set for the **OTEL_METRICS_EXPORTER** then [OpenTelemetry Prometheus Metric Exporter](https://www.npmjs.com/package/@opentelemetry/exporter-prometheus) will be used. If value set to _"otlp"_ the [OpenTelemetry Collector Metrics Exporter for web and node](https://www.npmjs.com/package/@opentelemetry/exporter-metrics-otlp-http) will be used.

### Using Telemetry locally

Clone `https://github.com/vercel/opentelemetry-collector-dev-setup` locally and run `docker-compose up -d`

### Environment Variables for the Configuration of Opentelemetry

> **Note**: use can find full list of parameters here `https://opentelemetry.io/docs/languages/sdk-configuration/`

| Variable                      | Required | Description                              | Available Values               | Default values                                        | Example value         |
| ----------------------------- | :------: | ---------------------------------------- | ------------------------------ | ----------------------------------------------------- | --------------------- |
| `OTEL_SERVICE_NAME`           |    No    | What name is assigned to service in logs | Any string                     | name from package.json (@dial/source) or 'dial-admin' |                       |
| `OTEL_METRICS_EXPORTER`       |    No    | What to use as metrics exporter          | "otlp" or empty                | empty, it means that Prometheus will be used          |                       |
| `OTEL_EXPORTER_OTLP_ENDPOINT` |    No    | Collector endpoint address               | Any valid url                  |                                                       | http://localhost:4318 |
| `OTEL_EXPORTER_OTLP_PROTOCOL` |    No    | Which protocol to use                    | grpc, http/protobuf, http/json |                                                       |                       |
