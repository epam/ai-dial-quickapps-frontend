# Quick Apps Frontend

A static single-page React app for the QuickApp2 settings editor, built with Vite and served by
[chat-api](https://github.com/epam/ai-dial-chat)'s own server (see `docs/TRANSITION_PLAN.md`
Phase 2 — this app has no server-side code of its own). Designed to be embedded as an `<iframe>`
inside `ai-dial-chat` and communicate with the host via `postMessage`.

## Development

```bash
npm install
npm run dev
```

`npm run dev` starts the Vite dev server on `http://localhost:4600` and proxies `/api/*` to a
chat-api instance running locally on `http://localhost:5000` (see `vite.config.ts`). Start that
backend with `npm run docker:run:backend` (runs the published chat-api image directly, on 5000,
reading env from `.env.example` — see [Configuration](#configuration) for what to put in it),
then `npm run dev` in another terminal for a live-reloading frontend against a real backend.

## Commands

| Command                      | Description                                                                                              |
| ---------------------------- | -------------------------------------------------------------------------------------------------------- |
| `npm run dev`                | Start the Vite dev server (hot-reloading frontend only — see above for the backend)                      |
| `npm run build`              | Type-check and build                                                                                     |
| `npm run lint`               | Run ESLint                                                                                               |
| `npm test`                   | Run the test suite                                                                                       |
| `npm run docker:build`       | Build this repo's own Docker image (frontend + chat-api, see [Docker build](#docker-build))              |
| `npm run docker:run`         | Run that locally-built image                                                                             |
| `npm run docker:run:dist`    | Rebuild `dist/` and run it mounted into the published chat-api image — faster than a full `docker:build` |
| `npm run docker:run:backend` | Run just the published chat-api image, for pairing with `npm run dev`'s live frontend (see above)        |

## Docker build

The root `Dockerfile` builds this app's static assets and layers them onto a published chat-api
image (`CHAT_API_IMAGE` build arg — see the Dockerfile for the exact tag to pin). From the project
root:

```bash
npm run docker:build
cp .env.template .env.example   # fill in values — see Configuration below
npm run docker:run
```

(`npm run docker:run`/`docker:run:dist`/`docker:run:backend` all read `.env.example` — edit those
scripts in `package.json` if you'd rather use a different filename.) The image is amd64-only
(`docker:build` already passes `--platform=linux/amd64`, needed on ARM hosts). App will be
available at http://localhost:4600 — the image's default `PORT` (see the Dockerfile) matches this
app's own Vite dev port, so the URL is the same whether you're running `npm run dev` or this built
image.

For faster iteration without a full image build, `npm run docker:run:dist` rebuilds `dist/` and
mounts it straight into the published chat-api image (see `scripts/docker-run-dist.mjs`) —
override the image tag with `CHAT_API_IMAGE=ghcr.io/epam/ai-dial-chat:<tag> npm run docker:run:dist`.

## Configuration

The Docker image built from this repo (see [Docker build](#docker-build)) is chat-api's own
server with this app's static build layered on top (`docs/TRANSITION_PLAN.md` Phase 2) — this
app has no server-side code or build-time env vars of its own, but the **running container**
still needs chat-api's own runtime configuration to actually work, same as any other chat-api
deployment. Copy `.env.template` to `.env` and fill in values; `docs/TRANSITION_PLAN.md`
Appendix B has the full old-to-new mapping from this app's former standalone-Next.js setup, for
context on why these are named the way they are.

### Server

| Variable     | Required | Default | Description                                                                                                                                                     |
| ------------ | :------: | :-----: | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `PORT`       |    No    | `4600`  | Port the server listens on. Defaults to this app's own Vite dev port (see `vite.config.ts`) so the URL is consistent between `npm run dev` and the built image. |
| `API_PREFIX` |    No    |  `api`  | Path prefix for the API and health-check routes.                                                                                                                |

### DIAL core

| Variable        | Required | Description                                                     |
| --------------- | :------: | --------------------------------------------------------------- |
| `DIAL_CORE_URL` |   Yes    | Base URL of the DIAL Core API, e.g. `https://core.example.com`. |

### Auth: session

| Variable                       | Required | Description                                                                                                                                                                          |
| ------------------------------ | :------: | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `AUTH_SESSION_SECRET`          |   Yes    | 64 hex characters, used to sign/encrypt the session cookie. Generate with e.g. `openssl rand -hex 32`.                                                                               |
| `AUTH_SESSION_PREV_SECRET`     |    No    | Previous session secret, for zero-downtime rotation — sessions signed with either secret are accepted while both are set.                                                            |
| `AUTH_CALLBACK_BASE_URL`       |   Yes    | This app's own origin, e.g. `https://quickapps.example.com`. The popup sign-in's `callbackUrl` must be on this origin.                                                               |
| `CORS_ORIGIN`                  |   Yes    | Origin(s) allowed to call this app's API cross-origin. Usually the same value as `AUTH_CALLBACK_BASE_URL`.                                                                           |
| `AUTH_SESSION_COOKIE_NAME`     |    No    | Default `__Host-quickapps.sess`. Renamed away from chat's own `chat.*` cookie names so the two apps' sessions never collide when served from related origins.                        |
| `AUTH_TRANSACTION_COOKIE_NAME` |    No    | Default `__Host-quickapps.tx`. Short-lived cookie used only during the OAuth/OIDC handshake itself.                                                                                  |
| `AUTH_LEGACY_COOKIE_NAMES`     |    No    | Comma-separated cookie names to actively expire — set this when renaming `AUTH_SESSION_COOKIE_NAME`/`AUTH_TRANSACTION_COOKIE_NAME` on an existing deployment, otherwise leave unset. |

#### Known issue: `HTTP ERROR 431` clicking Login, after an old deployment on the same host

`431 Request Header Fields Too Large` on the sign-in redirect (or any request) means the browser
is sending more cookie data for this origin than the server's header-size limit allows. It shows
up when this app (or a build of it) has previously run on the same host under a different cookie
setup — most commonly, a pre-migration deployment that used next-auth's own `chat.*`/`next-auth.*`
cookie names on `localhost:4600` (or the same production host) before this app's chat-api-based
auth (with its own `AUTH_SESSION_COOKIE_NAME`/`AUTH_TRANSACTION_COOKIE_NAME`) took over — the
browser keeps sending both the old and new cookies on every request, and their combined size
eventually exceeds the limit.

**Local dev fix:** clear cookies for `localhost:4600` (or whatever host you're testing) in the
browser, then retry.

**Production:** there's no way to auto-clear this from server code, because the request is
rejected for being oversized _before_ the server parses it far enough to run any
cookie-clearing logic — the fix has to happen on the next request, not the failing one. Two
things reduce the risk instead:

- Set `AUTH_LEGACY_COOKIE_NAMES` to the exact old cookie names being retired on that host (e.g.
  next-auth's defaults) so chat-api actively expires them on the first request that _does_ get
  through, rather than letting them accumulate indefinitely.
- Give the reverse proxy/load balancer in front of chat-api some header-size headroom above the
  default (e.g. nginx's `large_client_header_buffers`, or Node's own
  `--max-http-header-size`) as a safety margin — this doesn't fix stale cookies, but it buys
  enough room for the `AUTH_LEGACY_COOKIE_NAMES` expiry above to actually get a chance to run
  before the header set grows large enough to trip the limit again.

If a user hits this in production and neither mitigation is in place yet, the only recovery is
the same one as local dev: clear cookies for that host manually.

### Auth: identity provider

At least one OAuth/OIDC provider must be configured (Keycloak, Azure AD, Google, Auth0, Okta,
Cognito, GitLab). The variable names are per-provider and differ slightly (e.g. Keycloak's
`_HOST`/`_SECRET` vs. Azure AD's `_TENANT_ID`/`_CLIENT_SECRET`); `AUTH_KEYCLOAK_*` below is one
concrete example — see chat-api's own documentation for every supported provider's exact
variable names.

| Variable                  | Required | Description                                                                                                                                                                                                                |
| ------------------------- | :------: | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `AUTH_KEYCLOAK_HOST`      |    †     | Keycloak realm base URL, e.g. `https://keycloak.example.com/realms/dial`.                                                                                                                                                  |
| `AUTH_KEYCLOAK_CLIENT_ID` |    †     | OAuth client id registered for this app in that realm.                                                                                                                                                                     |
| `AUTH_KEYCLOAK_SECRET`    |    †     | That client's secret. **Never commit a real value** — this is the one variable in this table you should treat as sensitive and set out-of-band (e.g. `docker run -e`, a secrets manager), not in a checked-in `.env` file. |

† Required if Keycloak is the (or one of the) configured provider(s); substitute the equivalent
provider-specific variables otherwise. Register `${AUTH_CALLBACK_BASE_URL}/api/v1/auth/callback/<provider>`
as that client's redirect URI.

### Themes

| Variable            | Required | Default | Description                                                                                                     |
| ------------------- | :------: | ------- | --------------------------------------------------------------------------------------------------------------- |
| `THEMES_CONFIG_URL` |    No    | —       | Base URL for DIAL themes; chat-api appends `/config.json` itself. Falls back to CSS variable defaults if unset. |

### Iframe embedding

| Variable                 | Required | Default | Description                                                                                                                                                                                                     |
| ------------------------ | :------: | ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ALLOWED_IFRAME_ORIGINS` |    No    | none    | Space-separated list of origins allowed to embed this app in an `<iframe>` (CSP `frame-ancestors`). Set to the exact admin/chat origin(s) in production.                                                        |
| `OVERLAY_ENABLED`        |    No    | unset   | Leave unset (decided in Phase 0, item 2) unless the session cookie needs `SameSite=None` for a specific embedding scenario — turning it on is chat's own overlay-runtime flag, not a QuickApps-specific toggle. |

### Content Security Policy

| Variable                  | Required | Default       | Description                                                                                                                                                             |
| ------------------------- | :------: | ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `CSP_MODE`                |    No    | `report-only` | Set to `enforce` only after confirming `report-only` produces no violation reports for this deployment — see [Content Security Policy](#content-security-policy) below. |
| `ALLOWED_CONNECT_ORIGINS` |    No    | none          | Additional origins the page may `fetch`/`XHR` to, beyond its own. Leave empty — this app only ever calls its own origin.                                                |

### Default model

| Variable             | Required | Description                                                                                                                               |
| -------------------- | :------: | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `DEFAULT_DEPLOYMENT` |    No    | Deployment id pre-selected in the form when no model is stored in the app config. Returned to the client as `config.defaultDeploymentId`. |

### QuickApps-specific settings

These don't map onto a native chat-api concept, so they travel inside `CUSTOM_CLIENT_VARIABLES`
— a single JSON object (Phase 0, item 1), passed through untouched to the client via
`GET /api/v1/client-config` (`src/utils/dialClient.ts`'s `fetchAppSettings`). Keys map 1:1 onto
`AppSettings` (`src/types/dial-entities.ts`):

| Key               | Required | Description                                                                                                                                                                                        |
| ----------------- | :------: | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `allowedOrigin`   |    No    | Origin allowed to send/receive `postMessage` events with the editor iframe. Set to the exact `ai-dial-chat`/admin origin in production; `*` accepts any origin — unsafe outside local dev.         |
| `dialAdminHost`   |    No    | Origin of the admin host this app is embedded in. Default target for `@epam/ai-dial-chat-visualizer-connector`.                                                                                    |
| `dialChatHost`    |    No    | Origin of the `ai-dial-chat` host. Used instead of `dialAdminHost` when the app detects it's embedded directly inside chat (`document.location.ancestorOrigins[0]` matches this value).            |
| `applicationName` |    No    | Visualizer name; must match the `title` configured for this app in `ai-dial-chat`'s visualizer settings. Required (with at least one of the hosts above) for the visualizer connector to activate. |

Example: `CUSTOM_CLIENT_VARIABLES={"allowedOrigin":"https://chat.example.com","dialAdminHost":"https://admin.example.com","applicationName":"QuickApps"}`

### OpenTelemetry

Disabled by default (`OTEL_SDK_DISABLED=true`). To enable, set it to `false` plus the standard
[OpenTelemetry SDK environment variables](https://opentelemetry.io/docs/specs/otel/configuration/sdk-environment-variables/)
(`OTEL_SERVICE_NAME`, `OTEL_EXPORTER_OTLP_ENDPOINT`, `OTEL_EXPORTER_OTLP_PROTOCOL`,
`OTEL_METRICS_EXPORTER`, …) — see `.env.template` for the ones this deployment is most likely
to need.

## Authentication

Auth is handled entirely by chat-api itself (see `docs/TRANSITION_PLAN.md` §2.3) — this app's
own frontend code calls chat-api's `/api/v1/auth/*` endpoints same-origin
(`credentials: 'include'`, CSRF token from the `/me` response echoed back on non-GET calls) and
has no auth logic of its own. The **runtime environment** still needs the "Auth: session" and
"Auth: identity provider" variables above, since that's chat-api's own auth configuration
running inside the same container this app's build is shipped in.

## API layer

Every DIAL entity call (applications, deployments, toolsets, skills, files, user config, themes,
client config) goes through the typed `@epam/ai-dial-chat-api-client` package against chat-api's
`/api/v1/*` REST surface (see `docs/TRANSITION_PLAN.md` §2.4 and Appendix A for the full route
mapping) — this app has no server-side proxy of its own. `src/utils/chat-api-client.ts` holds one
shared `Configuration` (CSRF + credentials via `src/utils/chat-api-fetch.ts`, plus a 401
loop-breaker) that every typed API instance is built from.

## Content Security Policy

CSP is enforced by chat-api's own server (Helmet), not by this app — see `docs/TRANSITION_PLAN.md`
§2.6. This app's build carries a `__DIAL_CSP_NONCE__` placeholder on its built `<script>`/`<link
rel="stylesheet">` tags (see `vite.config.ts`) for chat-api's nonce-based `CSP_MODE=enforce`
policy, and bundles Monaco locally (`src/monaco-setup.ts`) instead of loading it from a CDN, since
`script-src` has no CDN allowance.

## postMessage protocol

The editor page (at `/`) communicates with its host via `postMessage`. Both sides validate
`event.origin` against `allowedOrigin` (see [Configuration](#configuration)).

In Dev mode the messages can be sent via console, e.g.

```
document.querySelector('iframe').contentWindow.postMessage({ type: 'TRIGGER_SAVE' }, '*')
```

**Host → iframe**

| Message type        | Payload                                                                                     | Description                                                                                                                                                                                                                                                              |
| ------------------- | ------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `TRIGGER_SAVE`      | `{ general?: { name: string; description?: string; iconUrl?: string; topics?: string[] } }` | Triggers a manual save. `general` carries the host's current General-step fields for an existing app so they're merged into this single save instead of a separate host-side write; omitted for Preview or for an app created in this session. Never includes `version`. |
| `TRIGGER_AUTO_SAVE` | `{ ignoreDirty?: boolean }`                                                                 | Triggers an auto-save                                                                                                                                                                                                                                                    |
| `RESET`             | —                                                                                           | Resets the form to the last saved state                                                                                                                                                                                                                                  |

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

## Application credentials in the Chat host

When embedded by a Chat host advertising `applicationCredentials=true` in the iframe URL,
selected agents load their individual application metadata because deployment lists omit
`external_services`. Agents requiring authentication expose credentials from their chip
and Advanced settings. If metadata loading fails, the action remains available so the
host can display its retry form. The editor sends `{ type: 'REQUEST_APPLICATION_CREDENTIALS', appId }`
to its configured parent origin. The host opens its shared Catalog credential forms,
including API keys, OAuth and DIAL-native offline consent. No credentials are passed to
this editor or saved in the Quick app configuration. Closing the host dialog preserves
unsaved transport settings. Older hosts do not advertise the query parameter, so this
action is hidden there.

> **Known regression (§2.4):** the per-selected-application metadata load this section
> describes (`fetchApplicationRequiresAuthentication` in `src/utils/dialClient.ts`) has no
> chat-api equivalent — `ApplicationDetailsDto` carries nothing corresponding to Core's raw
> `external_services` map. That function is currently a stub that always returns `false`, so
> **the credentials action described above never appears**, regardless of whether the
> selected application actually needs one. Flagged for follow-up with the ai-dial-chat team;
> see `docs/TRANSITION_PLAN.md` §2.4.
