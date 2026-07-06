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

Then to run it, mapping the container's port 3003 to a local port:

`docker run -p 3003:3003 ai-dial-quickapps-frontend`

App will be available at http://localhost:3003.

## Authentication

The editor supports two authentication modes that coexist:

The editor uses [NextAuth.js](https://next-auth.js.org) and supports multiple OAuth/OIDC providers: Keycloak, Azure AD, Google, Auth0, Okta, and Cognito. Enable a provider by setting all of its required environment variables (see [Environment variables](#environment-variables) below); providers with missing configuration are skipped. Multiple providers can be enabled at the same time. After sign-in the access token is kept server-side and injected into the DIAL API proxy automatically. Token refresh is handled transparently per provider.

The proxy at `/api/dial/[...path]` tries the `dial_session` cookie first; if absent it falls back to the NextAuth session token.

### Provider client setup

For each provider you enable, register a confidential OAuth client with:

- **Valid redirect URI**: `{NEXTAUTH_URL}/api/auth/callback/{provider}` — where `{provider}` is `keycloak`, `azure-ad`, `google`, `auth0`, `okta`, or `cognito`.
- **Web origin**: `{NEXTAUTH_URL}`

## Environment variables

Copy `.env.template` to `.env.local` and fill in values. All variables without a `NEXT_PUBLIC_` prefix are server-side only.

### Server

| Variable | Required | Default | Description                                                                               |
| -------- | :------: | ------- | ----------------------------------------------------------------------------------------- |
| `PORT`   |    No    | `4207`  | Port the dev/production server listens on. Also update `NEXTAUTH_URL` when changing this. |

### Authentication

| Variable          | Required | Description                                                                                             |
| ----------------- | :------: | --------------------------------------------------------------------------------------------------------- |
| `NEXTAUTH_SECRET` |   Yes    | Secret for signing session cookies. Generate with `openssl rand -base64 32`.                            |
| `NEXTAUTH_URL`    |   Yes    | Public URL of this app, e.g. `https://quickapps.example.com`. Required for OAuth callback registration. |

At least one OAuth provider below must be fully configured (all of its non-`_NAME` variables set). `*_NAME` variables are optional and override the display name shown on the sign-in button (defaults to `SSO`).

#### Keycloak

| Variable                      | Required | Description                                                          |
| ------------------------------ | :------: | --------------------------------------------------------------------- |
| `AUTH_KEYCLOAK_ISSUER`        |   Yes    | Keycloak realm URL, e.g. `https://keycloak.example.com/realms/dial` |
| `AUTH_KEYCLOAK_CLIENT_ID`     |   Yes    | Keycloak client ID                                                   |
| `AUTH_KEYCLOAK_CLIENT_SECRET` |   Yes    | Keycloak client secret                                               |
| `AUTH_KEYCLOAK_NAME`          |    No    | Sign-in button label                                                 |

#### Azure AD

| Variable                      | Required | Description             |
| ------------------------------ | :------: | ------------------------ |
| `AUTH_AZURE_AD_CLIENT_ID`     |   Yes    | Azure AD application (client) ID |
| `AUTH_AZURE_AD_CLIENT_SECRET` |   Yes    | Azure AD client secret   |
| `AUTH_AZURE_AD_TENANT_ID`     |   Yes    | Azure AD tenant ID       |
| `AUTH_AZURE_AD_NAME`          |    No    | Sign-in button label     |

#### Google

| Variable                   | Required | Description           |
| --------------------------- | :------: | ----------------------- |
| `AUTH_GOOGLE_CLIENT_ID`     |   Yes    | Google OAuth client ID |
| `AUTH_GOOGLE_CLIENT_SECRET` |   Yes    | Google OAuth client secret |
| `AUTH_GOOGLE_NAME`          |    No    | Sign-in button label   |

#### Auth0

| Variable                  | Required | Description                                        |
| -------------------------- | :------: | --------------------------------------------------- |
| `AUTH_AUTH0_CLIENT_ID`     |   Yes    | Auth0 application client ID                        |
| `AUTH_AUTH0_CLIENT_SECRET` |   Yes    | Auth0 application client secret                    |
| `AUTH_AUTH0_ISSUER`        |   Yes    | Auth0 tenant domain URL, e.g. `https://dial.us.auth0.com` |
| `AUTH_AUTH0_NAME`          |    No    | Sign-in button label                               |

#### Okta

| Variable                 | Required | Description                                       |
| ------------------------- | :------: | --------------------------------------------------- |
| `AUTH_OKTA_CLIENT_ID`     |   Yes    | Okta application client ID                         |
| `AUTH_OKTA_CLIENT_SECRET` |   Yes    | Okta application client secret                     |
| `AUTH_OKTA_ISSUER`        |   Yes    | Okta authorization server URL, e.g. `https://dial.okta.com/oauth2/default` |
| `AUTH_OKTA_NAME`          |    No    | Sign-in button label                               |

#### Cognito

| Variable                    | Required | Description                                                       |
| ----------------------------- | :------: | -------------------------------------------------------------------- |
| `AUTH_COGNITO_CLIENT_ID`     |   Yes    | Cognito app client ID                                              |
| `AUTH_COGNITO_CLIENT_SECRET` |   Yes    | Cognito app client secret                                          |
| `AUTH_COGNITO_ISSUER`        |   Yes    | Cognito user pool issuer URL, e.g. `https://cognito-idp.us-east-1.amazonaws.com/us-east-1_xxxxx` |
| `AUTH_COGNITO_NAME`          |    No    | Sign-in button label                                               |

### DIAL core

| Variable        | Required | Description                                                                                                                                             |
| --------------- | :------: | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `DIAL_CORE_URL` |   Yes    | Base URL of the DIAL core API, e.g. `https://core.example.com`. Used as the proxy target in standalone mode and as the default host in the dev harness. |

### Themes

| Variable     | Required | Default | Description                                                                         |
| ------------ | :------: | ------- | ----------------------------------------------------------------------------------- |
| `THEMES_URL` |    No    | —       | URL to the DIAL themes `config.json`. Falls back to CSS variable defaults if unset. |

### Feature flags

| Variable                   | Required | Default | Description                                                                                                                                                         |
| -------------------------- | :------: | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `CODE_INTERPRETER_ENABLED` |    No    | `false` | Enables the Code Interpreter toggle in the QuickApp2 editor. Served to the client via `GET /api/settings`, mirroring the `ENABLED_FEATURES` flag in `ai-dial-chat`. |

### Security

| Variable                  | Required | Default  | Description                                                                                                                                                                    |
| ------------------------- | :------: | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `ALLOWED_FRAME_ANCESTORS` |    No    | `'self'` | Space-separated list of origins allowed to embed this app in an `<iframe>`, sent as the CSP `frame-ancestors` directive. Set to the exact `ai-dial-chat` URL(s) in production. |

### Client-side

| Variable                               | Required | Default                                                         | Description                                                                                                                                                                                                                                         |
| -------------------------------------- | :------: | --------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_ALLOWED_ORIGIN`           |    No    | `*`                                                             | Origin allowed to send `postMessage` events to the editor iframe. Set to the exact ai-dial-chat URL in production (e.g. `https://chat.example.com`). Using `*` accepts messages from any origin — fine for local dev, **unsafe for production**. |
| `NEXT_PUBLIC_QUICK_APPS_DEFAULT_MODEL` |    No    | `gpt-4o`                                                        | Model ID pre-selected in the form when no model is stored in the app config.                                                                                                                                                                        |
| `NEXT_PUBLIC_QUICK_APPS_SCHEMA_2_ID`   |    No    | `https://mydial.epam.com/custom_application_schemas/quickapps2` | `applicationTypeSchemaId` used to identify QuickApp2 applications. Override only if your DIAL instance uses a non-standard schema registry URL.                                                                                                     |

## Content Security Policy

This app sends a `Content-Security-Policy: frame-ancestors ...` header (configured in `next.config.ts`) to control which origins are allowed to embed it in an `<iframe>`. By default `frame-ancestors 'self'` is sent, meaning no other site can frame it until `ALLOWED_FRAME_ANCESTORS` is set. In production, set it to the exact `ai-dial-chat` origin(s) that embed this app.

## postMessage protocol

The editor page (at `/`) communicates with its host via `postMessage`. Both sides validate `event.origin` against `NEXT_PUBLIC_ALLOWED_ORIGIN`.

In Dev mode the messages can be sent via console, e.g.

```
document.querySelector('iframe').contentWindow.postMessage({ type: 'TRIGGER_SAVE' }, '*')
```

**Host → iframe**

| Message type        | Payload                     | Description                             |
| ------------------- | --------------------------- | --------------------------------------- |
| `TRIGGER_SAVE`      | —                           | Triggers a manual save                  |
| `TRIGGER_AUTO_SAVE` | `{ ignoreDirty?: boolean }` | Triggers an auto-save                   |
| `RESET`             | —                           | Resets the form to the last saved state |

**Iframe → host**

| Message type         | Payload                | Description                               |
| -------------------- | ---------------------- | ----------------------------------------- |
| `READY`              | —                      | Editor mounted; host should send `INIT`   |
| `DIRTY_STATE`        | `{ isDirty: boolean }` | Form dirty state changed                  |
| `SAVE_SUCCESS`       | `{ updatedApp }`       | Save completed successfully               |
| `SAVE_ERROR`         | `{ error: string }`    | Save failed                               |
| `AUTO_SAVE_COMPLETE` | —                      | Auto-save completed successfully          |
| `HEIGHT_CHANGE`      | `{ height: number }`   | Editor height changed (for iframe resize) |
