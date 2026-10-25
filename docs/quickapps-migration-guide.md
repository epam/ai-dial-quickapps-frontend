# Migrating to the Redesigned QuickApps Frontend

This guide is for teams that run the pre-migration QuickApps frontend (a Next.js
server with its own `next-auth` and API routes) and are moving to the current
one: a Vite-built React SPA served by `chat-api`, with a redesigned editor UI.
It covers what changes for an operator (image, environment variables,
authentication, CSP), for a host that embeds the editor (entry URL, messages,
origins), and for the people who use the editor (layout, controls, removed
features). It links to the OpenSpec capability that is the source of truth for
each area.

It does **not** cover moving data between DIAL Core instances. The editor reads
and writes the same applications in the same DIAL Core storage, so a migration
in place keeps every saved Quick App. See [Saved applications](#saved-applications)
for the few cases where the saved shape or the editor's reading of it differs.

Behavior is specified in [`openspec/specs/`](../openspec/specs/). This guide
only describes what happens to an existing deployment. The historical reasoning
behind the platform move is in [`TRANSITION_PLAN.md`](./TRANSITION_PLAN.md).

## What changed at a glance

| Area               | Before                                                            | Now                                                                                           |
| ------------------ | ----------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| Runtime            | Next.js server, 18 API route handlers, `next-auth`                | Static React SPA served by the `chat-api` BFF image; no server code in this repo              |
| Build              | `next build`                                                      | `vite build`; no env vars are read at build time                                              |
| Image              | Standalone Node image                                             | `ghcr.io/epam/ai-dial-chat-bff` with this app's `dist/` layered on top                        |
| Configuration      | Per-app env vars read by the Next.js server                       | `chat-api`'s own env vars; QuickApps-specific keys travel in `CUSTOM_CLIENT_VARIABLES` (JSON) |
| Authentication     | `next-auth` in the app; access token exposed through the session  | Server-side OIDC in `chat-api`, encrypted `HttpOnly` cookie, no token in the browser          |
| DIAL access        | Raw DIAL Core calls through our own proxy routes                  | Typed `@epam/ai-dial-chat-api-client` against `chat-api`'s `/api/v1/*`; no proxy of our own   |
| Application name   | `QUICK_APPS_APPLICATION_NAME` env var                             | `applicationName` query parameter of the entry URL, set per embedding by the host             |
| Editor layout      | One vertical form with a collapsible Orchestrator block           | Two columns: Instructions and Add-ons on the left, Configuration on the right                 |
| Add-ons            | Skills and one combined Agents & Toolsets row with a JSON view    | One Add-ons card: Skills, Toolsets, Agents, Knowledge base, Conversation starters             |
| Editor controls    | Temperature, process-files and feature toggles inline             | Behind the Settings row, in the Advanced Settings popup                                       |
| Add-on details     | Per-add-on modals with a nested configuration dialog              | Catalog-style details popup with tabs, including an app-specific Settings tab                 |
| Language and theme | Hand-rolled i18n namespace `marketplace`, theme loaded by Next.js | i18next namespaces `quickAppEditor` and `common`; theme from `chat-api` (`/api/themes`)       |
| Auth state screens | Original sign-in, access-denied and error pages                   | Redesigned sign-in, forbidden and error screens; popup sign-in                                |

Two operational consequences are worth stating on their own:

- **The frontend reads no environment variables.** Everything comes from
  `chat-api` at runtime. Changing configuration is a restart of the container,
  never a rebuild.
- **The OAuth redirect URI moved.** Every identity provider client must be
  updated before the first sign-in, or sign-in fails. See
  [Authentication](#authentication).

## Migration checklist

1. Pick the `ai-dial-chat-bff` image tag to pin and build or pull the new image —
   see [Image and ports](#image-and-ports).
2. Port environment variables — see [Environment variables](#environment-variables).
3. Re-register the redirect URI with every identity provider and set the session
   secrets and cookie names — see [Authentication](#authentication).
4. Move `QUICK_APPS_APPLICATION_NAME` out of the env: upgrade the host first so
   it sends `applicationName` — see [Host integration](#host-integration).
5. Check the iframe origins and the CSP mode — see
   [Content Security Policy](#content-security-policy).
6. Point a non-production deployment at a copy of real storage and open a few
   existing applications — see [Saved applications](#saved-applications).
7. Walk the editor and compare it with
   [What changed in the editor](#what-changed-in-the-editor), especially the
   [removed or relocated controls](#removed-or-relocated-controls).
8. Switch `CSP_MODE` to `enforce` only after `report-only` is clean — see
   [Content Security Policy](#content-security-policy).

## Image and ports

The deployable image is the published `chat-api` image with this app's static
build copied over its frontend directory. The root `Dockerfile` does this:

```dockerfile
ARG CHAT_API_IMAGE=ghcr.io/epam/ai-dial-chat-bff:development
FROM ${CHAT_API_IMAGE} AS runner
COPY --from=builder /app/dist /app/apps/chat/dist
```

- **Pin a tag.** The default is `development`, which moves. For a reproducible
  deployment, build with `--build-arg CHAT_API_IMAGE=ghcr.io/epam/ai-dial-chat-bff:<tag>`.
  Bump the image tag and `@epam/ai-dial-chat-api-client` together; their release
  lines match.
- **The image is amd64-only.** Build with `--platform=linux/amd64`.
- **Port `5000` is the deployment default**, the same contract as before. Local
  workflows use other ports so they can run beside a regular `chat-api`:

  | Workflow                                                  | Port   |
  | --------------------------------------------------------- | ------ |
  | Deployed image                                            | `5000` |
  | `npm run start:api:dev`, `npm run docker:run` (local BFF) | `5001` |
  | `npm start` (Vite dev server, proxies `/api` to the BFF)  | `4600` |

- There is no `curl` in the image. The health check uses Node's `fetch` against
  `/api/health`.

Specified in [`deployment_docker-image`](../openspec/specs/deployment_docker-image/spec.md).

## Environment variables

`.env.template` and the [README Configuration section](../README.md#configuration)
are the reference for what the deployment needs. The tables below only describe
what happens to a pre-migration deployment's variables. Every variable now
belongs to `chat-api`; check names that are not listed here against its own
[`.env.template`](https://github.com/epam/ai-dial-chat/blob/development/apps/chat-api/.env.template),
because provider variable names differ per provider.

### Renamed or re-shaped

| Before                        | Now                                                                                  | Notes                                                                         |
| ----------------------------- | ------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------- |
| `NEXTAUTH_SECRET`             | `AUTH_SESSION_SECRET`                                                                | 64 hex characters; generate a new one. `AUTH_SESSION_PREV_SECRET` rotates it. |
| `NEXTAUTH_URL`                | `AUTH_CALLBACK_BASE_URL` and `CORS_ORIGIN`                                           | Same origin for both; also where the popup sign-in's `callbackUrl` lives.     |
| `THEMES_URL`                  | `THEMES_CONFIG_URL`                                                                  | Base URL; `chat-api` appends `/config.json`.                                  |
| `ALLOWED_FRAME_ANCESTORS`     | `ALLOWED_IFRAME_ORIGINS`                                                             | Exact origins of the admin and chat hosts.                                    |
| `QUICK_APPS_DEFAULT_MODEL`    | `DEFAULT_DEPLOYMENT`                                                                 | Returned to the client as `config.defaultDeploymentId`.                       |
| `CODE_INTERPRETER_ENABLED`    | `CUSTOM_CLIENT_VARIABLES.codeInterpreterEnabled`                                     | JSON boolean — see [`CUSTOM_CLIENT_VARIABLES`](#custom_client_variables).     |
| `WEB_FETCH_ENABLED`           | `CUSTOM_CLIENT_VARIABLES.webFetchEnabled`                                            | JSON boolean.                                                                 |
| `ADD_ATTACHMENT_ENABLED`      | `CUSTOM_CLIENT_VARIABLES.addAttachmentEnabled`                                       | JSON boolean.                                                                 |
| `ALLOWED_ORIGIN`              | `CUSTOM_CLIENT_VARIABLES.allowedOrigin`                                              | One origin, a comma-separated list, or a JSON array.                          |
| `DIAL_ADMIN_URL`              | `CUSTOM_CLIENT_VARIABLES.dialAdminHost`                                              |                                                                               |
| `DIAL_CHAT_URL`               | `CUSTOM_CLIENT_VARIABLES.dialChatHost`                                               |                                                                               |
| `QUICK_APPS_APPLICATION_NAME` | **Not an env var any more** — the `applicationName` query parameter of the entry URL | See [Host integration](#host-integration).                                    |

Identity provider variables follow the same rule:

| Before                        | Now                    |
| ----------------------------- | ---------------------- |
| `AUTH_AUTH0_ISSUER`           | `AUTH_AUTH0_HOST`      |
| `AUTH_AUTH0_CLIENT_SECRET`    | `AUTH_AUTH0_SECRET`    |
| `AUTH_KEYCLOAK_ISSUER`        | `AUTH_KEYCLOAK_HOST`   |
| `AUTH_KEYCLOAK_CLIENT_SECRET` | `AUTH_KEYCLOAK_SECRET` |
| `AUTH_AZURE_AD_CLIENT_SECRET` | `AUTH_AZURE_AD_SECRET` |

For every other configured provider, expect the same kind of rename and verify
it against `chat-api`'s template; do not assume the old name still works.

### New

| Variable                                                   | Required | Notes                                                                                        |
| ---------------------------------------------------------- | :------: | -------------------------------------------------------------------------------------------- |
| `CORS_ORIGIN`                                              |   Yes    | Same value as `AUTH_CALLBACK_BASE_URL`.                                                      |
| `AUTH_POST_LOGOUT_REDIRECT_URI`                            |   Yes    | Same value as `CORS_ORIGIN`; also register it with the provider's post-logout allow-list.    |
| `AUTH_SESSION_COOKIE_NAME`, `AUTH_TRANSACTION_COOKIE_NAME` |    No    | Defaults `__Host-quickapps.sess` and `__Host-quickapps.tx`, away from `chat-api`'s `chat.*`. |
| `AUTH_LEGACY_COOKIE_NAMES`                                 |    No    | Old `next-auth` cookie names to expire — see [Stale cookies](#stale-cookies-http-431).       |
| `CSP_MODE`                                                 |    No    | `report-only` (default) or `enforce`.                                                        |
| `ALLOWED_CONNECT_ORIGINS`                                  |    No    | Leave empty: the editor only calls its own origin.                                           |
| `OVERLAY_ENABLED`                                          |    No    | Leave unset; it is `chat-api`'s overlay flag, not a QuickApps switch.                        |
| `API_PREFIX`                                               |    No    | Default `api`.                                                                               |

### Behavior changes of variables that stay

- **OpenTelemetry is off by default** (`OTEL_SDK_DISABLED=true`). Set it to
  `false` plus the standard `OTEL_*` variables to enable tracing. The `pino`
  logger and the old instrumentation hook are gone.
- **`DIAL_CORE_URL` is still required**, but the browser never calls Core. It is
  `chat-api` that does.

### `CUSTOM_CLIENT_VARIABLES`

`CUSTOM_CLIENT_VARIABLES` is one JSON object that `chat-api` passes through
untouched to `GET /api/v1/client-config`. The editor validates it at runtime.

```dotenv
CUSTOM_CLIENT_VARIABLES={"allowedOrigin":"https://chat.example.com,https://admin.example.com","dialAdminHost":"https://admin.example.com","dialChatHost":"https://chat.example.com","codeInterpreterEnabled":true}
CUSTOM_CLIENT_VARIABLES={"allowedOrigin":"https://chat.example.com,https://admin.example.com","dialAdminHost":"https://admin.example.com","dialChatHost":"https://chat.example.com","codeInterpreterEnabled":true}
```

Three things to get right when porting:

1. **The three feature flags must be JSON booleans.** `"codeInterpreterEnabled": "true"`
   (a string) counts as off. The old env vars accepted string values, so a
   mechanical copy can silently hide the Code interpreter, Web fetch or Add
   attachment switch.
2. **`allowedOrigin` accepts several origins now.** `*` or an unset value accepts
   any origin and is unsafe outside local development.
3. **`applicationName` is not read from here.** A value left in the object is
   ignored.

If the client-config request fails, every flag is off and no origin is allowed.
The key-by-key behavior is in
[`app-configuration`](../openspec/specs/app-configuration/spec.md).

## Authentication

The mechanism is different, not only the variable names. `chat-api` holds the
OIDC session in an encrypted `HttpOnly` cookie and refreshes the access token
itself. The editor calls `/api/v1/auth/*` same-origin with credentials and a
CSRF token, and has no auth logic of its own.

- **Re-register the redirect URI with every identity provider.** The path
  changed:

  | Before                                  | Now                                                        |
  | --------------------------------------- | ---------------------------------------------------------- |
  | `{origin}/api/auth/callback/{provider}` | `{AUTH_CALLBACK_BASE_URL}/api/v1/auth/callback/{provider}` |

  A client left on the old URI is rejected by the provider before the callback
  is reached; with Keycloak the authorization request fails with
  `Invalid parameter: redirect_uri`. Also add the post-logout redirect URI to
  the client's allow-list.

- **Provider ids come from `chat-api`.** The `authProvider` the host sends must
  match an id returned by `GET /api/v1/auth/providers` (`keycloak`, `azure-ad`,
  `auth0`, `google`, `okta`, `cognito`, `gitlab`). The editor checks it against
  that list before redirecting, so an unconfigured provider is reported instead
  of ending on a 404. Check any custom ids your hosts send.

- **Sign-in is a popup, and only inside the host's iframe.** QuickApps is never
  opened standalone, so the full-page redirect flow is not implemented. The
  popup goes to `/api/v1/auth/login/{provider}?callbackUrl={origin}/signin/complete`;
  the editor polls `/api/v1/auth/me` and closes the popup itself once the
  session exists. `/signin/complete` is only a landing page.

- **Existing sessions do not carry over.** The old `next-auth` cookies are not
  recognised by `chat-api`; users sign in once after the switch.

- **Provider mismatch signs the user out.** If the session's provider differs
  from the `authProvider` the host asked for, the editor logs out and logs in
  again, as before.

- **A 401 triggers one reload, then a sign-out** if it repeats within 30
  seconds. This loop-breaker is unchanged; it now lives in the shared API client.

- **The session cookie is `SameSite=Lax`.** QuickApps leaves `OVERLAY_ENABLED`
  unset, so the cookie is never `SameSite=None`. Verify, per host, that
  `/api/v1/auth/me` and a mutating call succeed from inside the iframe. Browsers
  compute `SameSite` from the whole ancestor chain, so a fetch from a cross-site
  iframe can lose a `Lax` cookie even when the request is same-origin with the
  iframe. If that happens in your topology, the fallback is an upstream flag
  decoupling `SameSite=None` from the overlay mode.

The sign-in, access-denied and error screens were redesigned at the same time;
behavior is in [`auth`](../openspec/specs/auth/spec.md).

### Stale cookies (HTTP 431)

A browser that still holds the old `next-auth` / `chat.*` cookies for the same
host sends them next to the new `__Host-quickapps.*` ones. Together they can
exceed the server's header limit and the request is rejected with
`431 Request Header Fields Too Large` before any code runs, so the server cannot
clear them itself. Reduce the risk before the cutover:

- Set `AUTH_LEGACY_COOKIE_NAMES` to the exact old cookie names, so `chat-api`
  expires them on the first request that gets through.
- Give the reverse proxy header headroom (nginx `large_client_header_buffers`,
  or Node's `--max-http-header-size`).

A user who hits it anyway clears cookies for the host once.

## Host integration

The host contract is a public one: any editor host can implement it. Most of it
is unchanged, so an existing admin or chat integration keeps working with two
exceptions below. The full contract is
[`host-integration`](../openspec/specs/host-integration/spec.md); the message
tables are in the [README](../README.md#postmessage-protocol).

### Breaking: `applicationName` moves to the entry URL

The host must now pass the application name per load:

```text
/?id=<percent-encoded id>&applicationName=<percent-encoded name>&authProvider=…&theme=…
```

- Without it, the editor still renders, but it **does not send the host
  handshake** and does not send the `{applicationName}/readyToSave` and
  `{applicationName}/loggedOut` messages.
- It is never read from runtime configuration, so one deployment can serve
  several applications, each addressed by its own name.
- **Upgrade order matters.** `ai-dial-chat` sends it when
  `pass-application-name-to-quickapps` is enabled and supplies the schema's
  display name. Upgrade `ai-dial-chat` with that flag **before** deploying the
  new QuickApps, or the handshake silently stops.
- Custom hosts must add the parameter to the iframe URL.

### Other changes a host should know

| Area                    | Before                                      | Now                                                                                                                                                          |
| ----------------------- | ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Allowed origins         | One origin                                  | One origin, a comma-separated list, or a JSON array in `allowedOrigin`.                                                                                      |
| Application credentials | Action shown whenever an app needs services | Shown only when the host advertises `applicationCredentials=true`; older hosts simply hide the action.                                                       |
| Credentials flow        | Handled inside the editor                   | The editor closes the details popup and posts `REQUEST_APPLICATION_CREDENTIALS` with `appId`; the host opens its own forms. No credentials reach the editor. |
| `display_version`       | Could be lost on host save                  | `TRIGGER_SAVE`'s `general.display_version` is saved as the application's `version`.                                                                          |
| `intro`                 | Round-tripped as a top-level field          | **Dropped.** `chat-api` rejects the field; it is not preserved anywhere. See [Saved applications](#saved-applications).                                      |
| Auto-save               | Host-triggered only                         | Also every 30 seconds while mounted, once the app has been saved once and the form is dirty.                                                                 |

Messages `READY`, `DIRTY_STATE`, `SAVE_SUCCESS`, `SAVE_ERROR`,
`AUTO_SAVE_COMPLETE`, `HEIGHT_CHANGE` and the host's `TRIGGER_SAVE`,
`TRIGGER_AUTO_SAVE`, `RESET` keep their names and payloads.

## Content Security Policy

`chat-api`'s CSP is stricter than the old Next.js one: `script-src 'self'`, no
inline scripts, no `unsafe-eval`, no CDN. What this means in practice:

- **Monaco is bundled**, not loaded from a CDN. Nothing to allow-list; the
  bundle is larger.
- **The build carries a `__DIAL_CSP_NONCE__` marker** on its script and
  stylesheet tags, and on a `<meta property="csp-nonce">` tag read by the
  bundled grid component. `chat-api` substitutes a per-request nonce.
- **Start in `report-only`** (the default). Embed the editor in the real admin
  and chat hosts, read the violation reports, and switch to `CSP_MODE=enforce`
  only when they are clean. An image built before the nonce-aware build plugin
  shows blocked grid styles under `enforce`: rebuild and redeploy it.
- Keep `ALLOWED_CONNECT_ORIGINS` empty. Add the exact admin and chat origins to
  `ALLOWED_IFRAME_ORIGINS`; it controls `frame-ancestors`.

## Saved applications

Both versions write the same application in DIAL Core, so existing Quick Apps
open in the new editor. What differs:

- **`intro` is no longer saved or shown.** The typed update endpoint rejects the
  field. A value stored by the old editor is not preserved on the next save.
- **One model default instead of a hardcoded one.** An application with no stored
  model used to fall back to `gpt-4o`. Now the model is resolved in this order:
  the stored model, `DEFAULT_DEPLOYMENT` if that deployment is visible, the
  first model that supports tools, or empty. An installation without
  `DEFAULT_DEPLOYMENT` that has a `gpt-4o` deployment now pre-selects the first
  tool-capable model instead; set `DEFAULT_DEPLOYMENT` to keep the old result.
- **New applications default the temperature to `0.5`.** Saved values are not
  touched.
- **Toolset and agent ids are saved single-encoded.** A fix for ids that were
  saved double-encoded; ids already stored that way are read as before.
- **`tool_sets` round-trip unchanged,** including inline toolsets without a
  `deployment_id`. They stay visible as chips and are preserved on save, even
  though the JSON view that created them is gone.
- **The `application_properties` shape is the same.** The editor writes the same
  fields and `chat-api` passes the object through verbatim.
- **Loading one application costs two requests** (deployment details, then a
  list scan for name, description, icon, topics, version). It is not observable
  except in network logs.
- **Instructions are required.** Save and auto-save are skipped while the
  Instructions text is empty or only whitespace. An existing application with
  empty Instructions loads without an error until the user edits it or saves.

Validate against a copy of real storage before switching production over.

## What changed in the editor

The redesign changes where things are, not what is stored. Form field names, the
saved shape and the host messages are the same; the exceptions are listed in
[Saved applications](#saved-applications). The authoritative description of each
area is the linked spec.

### Layout

| Area           | Before                                  | Now                                                                                                    | Spec                                                                                       |
| -------------- | --------------------------------------- | ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------ |
| Page structure | One column                              | Two columns at the desktop breakpoint, stacked below it; no horizontal scrolling                       | [`application_editor-layout`](../openspec/specs/application_editor-layout/spec.md)         |
| Instructions   | Inside a collapsible Orchestrator block | Standalone, always visible, marked required                                                            | `application_editor-layout`                                                                |
| Model          | Model selector inside Orchestrator      | **Default model** block in Configuration, with a catalog-style picker                                  | [`orchestrator_model-selection`](../openspec/specs/orchestrator_model-selection/spec.md)   |
| Settings       | Temperature and process-files inline    | A **Settings** row that opens the Advanced Settings popup                                              | [`application_advanced-settings`](../openspec/specs/application_advanced-settings/spec.md) |
| Attachments    | Section in the main column              | **Attachments** row under Settings, with an on/off switch and a required type list                     | [`application_user-attachments`](../openspec/specs/application_user-attachments/spec.md)   |
| Add-ons        | Separate sections                       | One **Add-ons** card below Instructions, each row with its Add action in the row header                | `application_editor-layout`                                                                |
| Directionality | Not driven by language                  | Logical start/end spacing and mirrored directional icons; ready for an RTL locale (only English ships) | [`i18n`](../openspec/specs/i18n/spec.md)                                                   |

### Add-ons

| Row                   | What changed                                                                                                                                                                       | Spec                                                                                                                                             |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Skills                | Redesigned list, catalog-style picker modal, and file previews by type inside a skill package                                                                                      | [`skills_catalog`](../openspec/specs/skills_catalog/spec.md)                                                                                     |
| Toolsets              | Split out of the old Agents & Toolsets row; search field and tool count in the Tools tab; sign-in from the details popup                                                           | [`toolsets_selection`](../openspec/specs/toolsets_selection/spec.md), [`toolsets_login`](../openspec/specs/toolsets_login/spec.md)               |
| Agents                | Split out; details popup gained a **Settings** tab where **Connect via** (MCP or Chat completion) is set, applied at once                                                          | [`agents_selection`](../openspec/specs/agents_selection/spec.md)                                                                                 |
| Knowledge base        | New row listing context files and folders, added through a restyled file-manager popup. Uploads use the shared transfer queue. Adding a folder adds its files and reports failures | [`application_knowledge-base`](../openspec/specs/application_knowledge-base/spec.md), [`context-files`](../openspec/specs/context-files/spec.md) |
| Conversation starters | Moved from its own section into Add-ons. Editing is in a **Set up conversation starters** modal with drag-to-reorder, a 30-character label limit and reworded settings             | [`application_conversation-starters`](../openspec/specs/application_conversation-starters/spec.md)                                               |
| Details popups        | Add-on details follow the catalog (details header, tabs, Connect tab). The Connect tab appears only when `dialCoreExternalUrl` is configured                                       | [`catalog-entity-details`](../openspec/specs/catalog-entity-details/spec.md)                                                                     |

### Advanced Settings popup

Everything that used to be scattered inline now lives in one popup, opened from
the Settings row, which edits a draft and applies it on **Save**:

- Temperature slider with a value input, shown only for models that support it
- Max attachments
- Time awareness and Built-in file tools switches
- Allow orchestrator to process files, when the model accepts attachments
- Code interpreter, Add attachment and Web fetch, each only when its
  `CUSTOM_CLIENT_VARIABLES` flag is `true`

### Removed or relocated controls

| Was                                                                  | Now                                                                                      |
| -------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| **Agents & Toolsets JSON view** (toggle, editor, Save JSON, Discard) | **Removed with no replacement.** Hand-editing `tool_sets` as JSON is no longer possible. |
| Inline Temperature slider                                            | Advanced Settings popup                                                                  |
| Inline "Allow orchestrator to process files" switch                  | Advanced Settings popup                                                                  |
| Inline feature toggles (Code interpreter, Web fetch, Add attachment) | Advanced Settings popup, still gated by the flags above                                  |
| Orchestrator collapsible block                                       | Gone; Instructions is standalone                                                         |
| Separate Conversation starters section                               | Add-ons row                                                                              |
| Nested agent configuration dialog                                    | Settings tab in the agent details popup                                                  |
| Hardcoded `gpt-4o` fallback                                          | Configured `DEFAULT_DEPLOYMENT`, else first tool-capable model                           |
| `intro` field                                                        | Removed                                                                                  |

## Technology changes

For teams that fork or extend the editor, or that script around its build.

| Concern       | Before                                                  | Now                                                                                                                                                                                                                               |
| ------------- | ------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Framework     | Next.js (`next/dynamic`, `next/image`, `next/font`)     | Vite 8, React 19, `react-router` for `/` and `/signin/complete`; `React.lazy`, plain `<img>`, self-hosted Inter                                                                                                                   |
| Auth          | `next-auth`                                             | `chat-api`'s OIDC endpoints through `AuthContext`; no auth library in this repo                                                                                                                                                   |
| Server code   | `src/app/api/**`, `src/proxy.ts`, OpenTelemetry, `pino` | None. All removed, along with the server-side DIAL SDK dependency                                                                                                                                                                 |
| API access    | Hand-written DIAL Core calls                            | `@epam/ai-dial-chat-api-client`; one shared client with CSRF, credentials and a 401 loop-breaker                                                                                                                                  |
| UI components | Local components and styling                            | `@epam/ai-dial-ui-kit` `^0.15.0` plus the `@epam/ai-dial-*` libraries pinned at `1.2.0-rc.0` (catalog, attachment input and canvas, chat hooks and shared, quotations, skill editor), `@epam/ai-dial-react-file-manager` `^0.3.0` |
| Monaco        | Loaded from a CDN                                       | Bundled `monaco-editor`; lean core plus the JSON language only                                                                                                                                                                    |
| i18n          | Namespace `marketplace`                                 | Namespaces `quickAppEditor` and `common`; key enums renamed `MarketplaceI18nKeys` → `QuickAppEditorI18nKeys`                                                                                                                      |
| Form state    | `useQuickApp2Form` reducer-backed controller with the Zod schema | Replaced `react-hook-form` and `@hookform/resolvers` in the `remove-react-hook-form` OpenSpec change |
| Tests         | Mostly none for the app layer                           | Vitest with a coverage gate that ratchets up                                                                                                                                                                                      |
| Workflow      | Ad hoc                                                  | Spec-driven: new work starts from an OpenSpec change (`AGENTS.md`)                                                                                                                                                                |

If you carry local patches, rebase them on the new layout, not the old one:
`src/app/**` and `src/utils/server/**` no longer exist, and a component that
imported `next/*` has a 1:1 replacement as listed above. A locale added by hand
must use the new namespaces; see [`i18n`](../openspec/specs/i18n/spec.md) and
[`.claude/rules/rtl.md`](../.claude/rules/rtl.md).

## Capabilities that changed or are absent

| Capability                            | Status                                                                        |
| ------------------------------------- | ----------------------------------------------------------------------------- |
| Agents & Toolsets JSON view           | Removed on purpose (product decision); no advanced or JSON editor replaces it |
| `intro` field                         | Removed; `chat-api` does not accept it                                        |
| Standalone (non-embedded) use         | Not supported; sign-in is popup-only inside the host's iframe                 |
| Full-page redirect sign-in            | Not implemented                                                               |
| Other languages                       | Only English ships; the UI is RTL-ready but nothing selects a language today  |
| `QUICK_APPS_APPLICATION_NAME` env var | Replaced by the `applicationName` query parameter                             |

## Verification checklist

After the switch, in a non-production deployment embedded in the real hosts:

- [ ] Sign-in opens the popup, completes, and the popup closes by itself.
- [ ] `GET /api/v1/auth/me` and a mutating call (a save) both succeed from inside
      the iframe, in admin and in chat.
- [ ] The host receives the handshake and `readyToSave` (proves `applicationName`
      reaches the editor).
- [ ] An existing application opens with its model, Instructions, skills,
      toolsets, agents, knowledge base and starters populated.
- [ ] Saving it unchanged does not alter `tool_sets`.
- [ ] A new application pre-selects the expected model and a `0.5` temperature.
- [ ] The Code interpreter, Web fetch and Add attachment switches appear exactly
      as before the migration.
- [ ] Toolset sign-in and sign-out update the chip status immediately.
- [ ] `REQUEST_APPLICATION_CREDENTIALS` reaches a host that advertises
      `applicationCredentials=true`, and the action is hidden on one that does not.
- [ ] With `CSP_MODE=report-only`, the console and reports show no violations;
      only then, `CSP_MODE=enforce` still renders the editor, including the
      grid styles and Monaco.
- [ ] No `431` on the sign-in redirect for a browser that used the old
      deployment.

## Related

- [README](../README.md) — setup, commands, Docker, the full configuration reference and message tables
- [`openspec/specs/`](../openspec/specs/) — the current, normative behavior of every area above
- [`TRANSITION_PLAN.md`](./TRANSITION_PLAN.md) — why the platform moved and how, as historical context
- [`TECH_DEBT.md`](./TECH_DEBT.md) — known gaps and follow-ups
