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

The editor uses [NextAuth.js](https://next-auth.js.org) with Keycloak. After sign-in the access token is kept server-side and injected into the DIAL API proxy automatically. Token refresh is handled transparently.

The proxy at `/api/dial/[...path]` tries the `dial_session` cookie first; if absent it falls back to the NextAuth session token.

### Keycloak client setup

Create a confidential client in your Keycloak realm:

- **Valid redirect URIs**: `{NEXTAUTH_URL}/api/auth/callback/keycloak`
- **Web origins**: `{NEXTAUTH_URL}`

## Environment variables

Copy `.env.template` to `.env.local` and fill in values. All variables without a `NEXT_PUBLIC_` prefix are server-side only.

### Server

| Variable | Required | Default | Description                                                                               |
| -------- | :------: | ------- | ----------------------------------------------------------------------------------------- |
| `PORT`   |    No    | `4600`  | Port the dev/production server listens on. Also update `NEXTAUTH_URL` when changing this. |

### Authentication

| Variable                      | Required | Description                                                                                             |
| ----------------------------- | :------: | ------------------------------------------------------------------------------------------------------- |
| `NEXTAUTH_SECRET`             |   Yes    | Secret for signing session cookies. Generate with `openssl rand -base64 32`.                            |
| `NEXTAUTH_URL`                |   Yes    | Public URL of this app, e.g. `https://quickapps.example.com`. Required for OAuth callback registration. |
| `AUTH_KEYCLOAK_ISSUER`        |   Yes    | Keycloak realm URL, e.g. `https://keycloak.example.com/realms/dial`                                     |
| `AUTH_KEYCLOAK_CLIENT_ID`     |   Yes    | Keycloak client ID                                                                                      |
| `AUTH_KEYCLOAK_CLIENT_SECRET` |   Yes    | Keycloak client secret                                                                                  |

### DIAL core

| Variable        | Required | Description                                                                                                                                             |
| --------------- | :------: | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `DIAL_CORE_URL` |   Yes    | Base URL of the DIAL core API, e.g. `https://core.example.com`. Used as the proxy target in standalone mode and as the default host in the dev harness. |

### Themes

| Variable     | Required | Default | Description                                                                         |
| ------------ | :------: | ------- | ----------------------------------------------------------------------------------- |
| `THEMES_URL` |    No    | —       | URL to the DIAL themes `config.json`. Falls back to CSS variable defaults if unset. |

### Feature flags

| Variable                    | Required | Default | Description                                                                                                                              |
| ---------------------------- | :------: | ------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `CODE_INTERPRETER_ENABLED`  |    No    | `false` | Enables the Code Interpreter toggle in the QuickApp2 editor. Served to the client via `GET /api/settings`, mirroring the `ENABLED_FEATURES` flag in `ai-dial-chat`. |

### Security

| Variable                  | Required | Default  | Description                                                                                                                                                                       |
| -------------------------- | :------: | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ALLOWED_FRAME_ANCESTORS` |    No    | `'self'` | Space-separated list of origins allowed to embed this app in an `<iframe>`, sent as the CSP `frame-ancestors` directive. Set to the exact `ai-dial-chat` URL(s) in production. |

### Client-side

| Variable                               | Required | Default                                                         | Description                                                                                                                                                                                                                                         |
| -------------------------------------- | :------: | --------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_ALLOWED_ORIGIN`           |    No    | `*`                                                             | Origin allowed to send `postMessage` events to the `/editor` iframe. Set to the exact ai-dial-chat URL in production (e.g. `https://chat.example.com`). Using `*` accepts messages from any origin — fine for local dev, **unsafe for production**. |
| `NEXT_PUBLIC_QUICK_APPS_DEFAULT_MODEL` |    No    | `gpt-4o`                                                        | Model ID pre-selected in the form when no model is stored in the app config.                                                                                                                                                                        |
| `NEXT_PUBLIC_QUICK_APPS_SCHEMA_2_ID`   |    No    | `https://mydial.epam.com/custom_application_schemas/quickapps2` | `applicationTypeSchemaId` used to identify QuickApp2 applications. Override only if your DIAL instance uses a non-standard schema registry URL.                                                                                                     |

## Content Security Policy

This app sends a `Content-Security-Policy: frame-ancestors ...` header (configured in `next.config.ts`) to control which origins are allowed to embed it in an `<iframe>`. By default `frame-ancestors 'self'` is sent, meaning no other site can frame it until `ALLOWED_FRAME_ANCESTORS` is set. In production, set it to the exact `ai-dial-chat` origin(s) that embed the `/editor` page.

## postMessage protocol

The `/editor` page communicates with its host via `postMessage`. Both sides validate `event.origin` against `NEXT_PUBLIC_ALLOWED_ORIGIN`.

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
