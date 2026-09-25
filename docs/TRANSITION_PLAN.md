# QuickApps frontend: transition plan

Status: draft · Owner: QuickApps frontend team · Last updated: 2026-09-25

This document describes the planned sequence of changes to this repository:

1. Move from Next.js to a **React SPA served by the ai-dial-chat NestJS BFF** (`chat-api`) image.
2. Close the items in [`TECH_DEBT.md`](./TECH_DEBT.md). OpenSpec is introduced first, before the migration.
3. **Rewrite the UI** against the new designs. All current visuals are discarded.

Because we know step 3 is coming, every earlier step is scoped so that we don't polish code that will be thrown away (see [Guiding principle](#guiding-principle-invest-only-in-what-survives)).

---

## 1. Why

### Why leave Next.js

- **We don't use what Next.js is for.** The app is a single client-rendered page (`src/app/page.tsx` is `'use client'`) embedded in an iframe. There is no SSR, no server components, and no server actions. Next.js is effectively just our HTTP server plus a thin API layer.
- **Our "server" duplicates code that already exists upstream.** The server side is next-auth plus 18 route handlers under `src/app/api/**`. Almost all of them are pass-through proxies to DIAL Core. `api/dial-skills/catalog` is literally a copy of chat-api's `SkillsListingService`. Every fix to auth, token refresh, CSP or file operations has to be made twice.
- **Security.** The next-auth `session` callback copies `accessToken` into the session, so `/api/auth/session` exposes the DIAL access token to the browser. The BFF keeps tokens server-side, in an encrypted HttpOnly cookie.
- **Framework churn.** Next 16 changed conventions (for example `middleware` → `proxy.ts`), and our agent instructions already have to warn that "this is NOT the Next.js you know". That's maintenance cost for features we don't use.

### Why React SPA + the chat-api NestJS image

1. **No SSR needed.** A static SPA build is all we have to ship.
2. **Fast.** It's a static bundle served by a lightweight NestJS/Express process, with no per-request React rendering.
3. **Ready-made image.** `ghcr.io/epam/ai-dial-chat` already contains a production NestJS BFF (`apps/chat-api`) that provides:
   - OIDC login for Keycloak, Azure AD/B2C, Google, Auth0, Okta, Cognito, GitLab and PingID, with automatic token refresh;
   - encrypted cookie sessions and CSRF protection;
   - Helmet CSP, iframe `frame-ancestors` and HSTS;
   - OpenTelemetry;
   - the health and themes endpoints;
   - typed endpoints for deployments, applications, files, toolsets and skills;
   - static file serving with SPA fallback.

   We copy our build over `/app/apps/chat/dist` and configure the rest with env vars. Another project already does this; our adapted Dockerfile is in [section 2.7](#27-docker-and-ci).

**What "React + NestJS" means here:** we do **not** write or own a NestJS application. We consume the chat-api image as-is. Anything it lacks is either handled in the SPA or contributed upstream to `ai-dial-chat`. Running our own NestJS service was considered and rejected: it would recreate the duplication we are trying to remove.

### Why QuickApps is not part of chat

Sharing the chat-api _image_ is runtime reuse, not a merge. QuickApps stays a separate application: its own repository, image, container, URL and env. Here's why that separation matters.

**How chat knows about app types.** DIAL application types are defined by application type schemas registered in DIAL Core. Each schema carries its own `dial:applicationTypeEditorUrl` (plus viewer URL, display name and icon). Chat and admin know nothing about particular app types:

- They read the schemas (chat-api: `GET /api/v1/application-schemas` returns `editorUrl` per schema).
- They embed whichever editor the schema points at, in an iframe.
- They talk to it over `postMessage` (`ChatVisualizerConnector`).

QuickApps is simply the editor behind the QuickApps schema.

**What the separation gives DIAL installation owners:**

- **Choose only the app types you need.** A deployment registers only the schemas it wants. Without the QuickApps schema, there's no QuickApps, and no dead code in chat.
- **Substitute your own implementation.** Point the schema's `dial:applicationTypeEditorUrl` at a different editor, and chat and admin work unchanged. The host contract (query params and `postMessage` messages) is the only interface.
- **Independent releases and ownership.** QuickApps can ship without a chat release, and the reverse.
- **Chat stays generic.** No app-type-specific code lives in chat. The only QuickApps-specific setting there is the dev-only `DEV_QUICKAPPS_EDITOR_URL` override.

**What this means for the plan:**

- Nothing in the migration moves QuickApps code into ai-dial-chat.
- Anything chat-api lacks is contributed upstream only as a **generic** capability, never QuickApps-specific.
- The host-integration spec (phase 1) is written as a **public contract** that any alternative editor can implement.

### Consequences we accept

- **We depend on chat-api's API contract.** Its endpoints evolve with ai-dial-chat releases.
  - Mitigation: pin the image to a release tag (never `:development` in production), and generate our API client from the OpenAPI spec of that same tag (`libs/chat-api-client/openapi.json` in ai-dial-chat).
- **The browser never has a DIAL token.** The SPA can talk only to chat-api's typed endpoints; there is no generic Core proxy. That's a feature, but anything chat-api lacks must be added there.
- **Chat branding stays in some places:**
  - the default cookie names (`chat.*`) can be overridden with env vars;
  - the `User-Agent` that chat-api sends to Core cannot.

---

## 2. Guiding principle: invest only in what survives

The UI rewrite (phase 4) discards every component and all styling. So at every step, sort code into two buckets:

| Survives the UI rewrite (invest here)                                                                                                        | Disposable (touch only as much as needed to keep it working) |
| -------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| Behaviour specs (OpenSpec)                                                                                                                   | Components in `src/components/**`                            |
| API layer (the BFF client)                                                                                                                   | Styling, layout, Tailwind classes                            |
| Domain logic: application model, serialization of `application_properties`, file-path / URL encoding, entity scope, toolset credential level | react-hook-form wiring in the current forms                  |
| Host integration: the `postMessage` contract with admin/chat, the `ChatVisualizerConnector`                                                  | Component-level tests of today's UI                          |
| Auth flow, config and feature flags                                                                                                          | Refactoring of the current component tree                    |
| i18n setup, RTL mechanics                                                                                                                    |                                                              |
| Build, Docker, CI                                                                                                                            |                                                              |

**Explicitly not doing** before the UI rewrite:

- removing react-hook-form from the existing forms;
- reviewing or merging existing components (e.g. `AgentSkillsField` → `SkillsSelectors`);
- writing tests for the existing components;
- visual, UX or accessibility fixes to the current UI;
- RTL fixes to the current markup.

In the migration itself, Next-specific component code is replaced 1:1 with the smallest equivalent. No redesign happens alongside it.

---

## 3. Plan overview

```text
Phase 0  Prerequisites and decisions (with the ai-dial-chat team)   ── short, unblocks phase 2
Phase 1  OpenSpec baseline: specify current behaviour                ── before the migration
Phase 2  Platform migration: Next.js → Vite SPA on the chat-api image
Phase 3  Non-visual tech debt: layering, tests, coverage gate
Phase 4  UI rewrite against the new designs
```

Phases 0 and 1 can run in parallel. Phase 3 overlaps with the end of phase 2, since most of it is about the code phase 2 creates.

---

## Phase 0: Prerequisites and decisions

These items need an answer before or early in phase 2. Each is a small investigation or a conversation with the ai-dial-chat team.

1. **Client config for QuickApps: decided, no upstream change.**
   - `GET /api/v1/client-config` validates `appId` against `['chat-ui']` and returns 400 for anything else. The value is only echoed back and used in the cache key; the config returned is the same for every app id. Our container has its own env, so calling it with `appId=chat-ui` returns our own values.
   - Use native keys where they exist (the default model comes from `DEFAULT_DEPLOYMENT`, returned as `config.defaultDeploymentId`). Put the QuickApps-specific values in `CUSTOM_CLIENT_VARIABLES`, a JSON object passed through as `config.customVariables`.
   - Allowing a `quickapps` app id upstream would only be cosmetic, so it isn't needed. Only real per-app config would require upstream work (registry and `EnvConfigProvider`), and we don't need it.
   - The remaining task is to validate `customVariables` in the SPA (e.g. with zod), because it's untyped.

2. **Session cookie inside the iframe.** chat-api sets `SameSite=None` only when `OVERLAY_ENABLED=true` and `ALLOWED_IFRAME_ORIGINS` is set. Otherwise it uses `Lax`. We need to:
   - confirm what else `OVERLAY_ENABLED` switches on;
   - decide whether each deployment is same-site with its admin/chat host (`Lax` is then enough) or cross-site (then `None` is required);
   - if the side effects are unwanted, request a dedicated flag upstream.
3. **Saving and loading the application.**
   - Today the editor loads the app through the catch-all proxy and saves it with a full-body `PUT /v1/{appId}` rebuilt from `_rawForSave`.
   - chat-api offers `GET /api/v1/deployments/:deployment/details`, which includes `applicationProperties`, and `PATCH /api/v1/applications/:name`, which fully replaces `applicationProperties` and keeps everything else.
   - Confirm that this covers every field the editor reads and writes, and whether chat-api encodes URLs in `application_properties` itself or whether we still must.
4. **Files API shape.** chat-api's `/api/v1/files/{list,shared,metadata,folders,delete,rename,download}` and `POST /api/v1/files` cover all our operations. Confirm the request/response shapes work for `@epam/ai-dial-react-file-manager`, and that upload keeps its "create-only" semantics.
5. **API client.** `@epam/ai-dial-chat-api-client` is `private` (not published). Options:
   - **(a)** generate our own client from the pinned `openapi.json`, e.g. with `openapi-typescript` + `openapi-fetch`, committed or generated at build time;
   - **(b)** ask the chat team to publish theirs.

   Recommendation: (a). It's independent of their release process, and it pins the contract to the image tag.

6. **Image tag policy.** Choose the ai-dial-chat release we pin to, and decide who bumps it and how. Upgrading means bumping the tag, regenerating the client and running the checks.
7. **CI.** `.github/workflows/*` use the shared `epam/ai-dial-ci` workflows. Confirm they build the root `Dockerfile` unchanged, and that pulling `ghcr.io/epam/ai-dial-chat` during the build works: registry access, and the image is amd64-only.
8. **Sign-in outside the iframe (open).**
   - Embedded in admin/chat, sign-in stays a popup, because most IdPs refuse to be framed (see 2.3).
   - If QuickApps is also opened on its own, it could instead redirect the whole page to `/api/v1/auth/login/<provider>?callbackUrl=<current URL>`. The query string survives the round trip, subject to the 2048-character limit on `callbackUrl`.
   - Decide whether that mode is needed. If not, popup only.
9. **Entry URL encoding (hosts).** An example entry URL carried `id=applications%%2Ftest__0.0.1`, which isn't valid percent-encoding: `decodeURIComponent` throws on it. This repo only builds `authProvider` links, using `encodeURIComponent`, so the fix belongs in whichever admin/chat code generates the entry URL. `id` must be encoded exactly once (`%2F`).

---

## Phase 1: OpenSpec baseline

Covers the `TECH_DEBT.md` item "Add OpenSpec and start using SDD. Cover old functionality".

**Why first:**

- The specs become the **acceptance checklist for phase 2**: same behaviour on a new platform.
- They are the **input contract for phase 4**: new UI, same behaviour.
- Writing them after the migration would mean reconstructing behaviour from code that has already changed.

**Scope: behaviour only, no visuals.** Screens, layout and component structure are not specified; they are about to be redesigned. Suggested capabilities:

| Capability               | What to capture                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Host integration         | The entry URL format (`/?authProvider=…&id=…&theme=…`, with `id` percent-encoded once) and the other query params (`modal`, `applicationCredentials`). The `ChatVisualizerConnector` handshake. The `readyToSave` and `loggedOut` messages. The allowed origin. Picking a host between admin and chat. Written as the public contract an alternative editor must implement (see [Why QuickApps is not part of chat](#why-quickapps-is-not-part-of-chat)). |
| Authentication           | The provider hint. Sign-out on provider mismatch. The popup sign-in flow. 401 handling (reload once, then sign out within 30 s). The forbidden state.                                                                                                                                                                                                                                                                                                     |
| Application editing      | Load, then edit, then save. Which fields are editable. How `application_properties` is encoded and decoded. The default model.                                                                                                                                                                                                                                                                                                                            |
| Agents and toolsets      | Listing deployments (chat, mcp). Toolset sign-in/sign-out with API key, and the USER vs GLOBAL credentials level. Application credentials.                                                                                                                                                                                                                                                                                                                |
| Skills                   | Catalog composition: personal + public + shared, with duplicates removed; the ownership flags.                                                                                                                                                                                                                                                                                                                                                            |
| Context files            | List, list shared, upload (create-only, progress), create folder, rename, delete (recursive), download.                                                                                                                                                                                                                                                                                                                                                   |
| Feature flags and config | Code interpreter, web fetch and attachments flags, and what each one shows or hides.                                                                                                                                                                                                                                                                                                                                                                      |
| Theming and i18n         | Theme selection, theme icons, supported locales, RTL direction switching.                                                                                                                                                                                                                                                                                                                                                                                 |

**Deliverables:**

- `openspec/` initialised in the repo, with one spec per capability above;
- the SDD workflow noted in `AGENTS.md`, so new work starts from a spec change.

---

## Phase 2: Platform migration (Next.js → Vite SPA on chat-api)

Goal: the same behaviour, verified against the phase 1 specs, shipped as the chat-api image with our SPA inside. The UI stays the same, apart from unavoidable 1:1 swaps.

### 2.1 Build tooling

- Replace Next with **Vite + React 19**, the same stack as `ai-dial-chat/apps/chat`. Serve from the site root; chat-api has no base-path support.
- `index.html`:
  - takes over the title and the font setup from `layout.tsx`;
  - carries the `__DIAL_CSP_NONCE__` marker (see chat's `tools/vite/csp-nonce.mjs`), so that `CSP_MODE=enforce` can be used;
  - must not contain inline scripts.
- Dev loop: run the chat-api image locally (docker compose + `.env`), and have the Vite dev server proxy `/api` to it. This mirrors chat's `vite.config.mts`.
- Update `tsconfig.json`: remove the `next` plugin and `.next/types`, and keep `moduleResolution: "bundler"`.
- Update ESLint: drop `eslint-config-next` and add React/hooks rules. `vitest.config.ts` already uses Vite and stays.

### 2.2 Replace Next client APIs (small, mechanical)

| Next API                                     | Where        | Replacement                                                                                                               |
| -------------------------------------------- | ------------ | ------------------------------------------------------------------------------------------------------------------------- |
| `useSearchParams`                            | 4 files      | `URLSearchParams(window.location.search)` or a tiny hook. There is no router need beyond `/` and the sign-in popup route. |
| `next/dynamic` (`ssr:false`)                 | 2 files      | `React.lazy` + `Suspense`                                                                                                 |
| `next/image` (`unoptimized`)                 | `ModelIcon`  | `<img>`                                                                                                                   |
| `next/font/google` + `Metadata`              | `layout.tsx` | Self-hosted Inter (e.g. `@fontsource-variable/inter`) plus `<title>` in `index.html`                                      |
| `layout.tsx` providers and `<html dir/lang>` | `layout.tsx` | `main.tsx`. The `dir`/`lang` switching moves to the i18n provider (`document.documentElement`).                           |

### 2.3 Auth: next-auth → chat-api auth

| Today                                                 | After                                                                                                                                                                |
| ----------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `useSession()`                                        | `GET /api/v1/auth/me` (401 means logged out). Returns `providerId` and `bucket`. Keep the `X-CSRF-Token` response header for non-GET calls.                          |
| `getProviders()`                                      | `GET /api/v1/auth/providers`                                                                                                                                         |
| `signIn(provider)` in the `/signin` popup             | The popup navigates to `/api/v1/auth/login/:providerId?callbackUrl=<origin>/signin/complete`. That SPA route posts `AUTH_WINDOW_CLOSE_KEY` to the opener and closes. |
| `signOut()`                                           | `POST /api/v1/auth/logout` (CSRF header, and an Origin that matches `CORS_ORIGIN`)                                                                                   |
| Provider-mismatch sign-out                            | Compare `me.providerId` with `?authProvider`, then log out and log in again.                                                                                         |
| Missing or unconfigured `?authProvider` (`AuthError`) | Check `?authProvider` against `GET /api/v1/auth/providers` **before** redirecting; `/login/:id` returns 404 for an id that isn't configured.                         |
| Any non-GET call                                      | Send `X-CSRF-Token` (taken from the `/me` response) and credentials `include`.                                                                                       |
| 401 handling (`handle-unauthorized-response.ts`)      | Same logic, calling the new logout. On a 403 `CSRF_INVALID`, refresh through `/me` and retry, as chat does.                                                          |

**Delete:** `next-auth`, `src/utils/auth-options.ts`, `src/types/next-auth.d.ts`, `AuthProvider`, and the unused `dial_session` cookie fallback in `dial-server-auth.ts`.

**Provider in the login URL:** it goes in the **path**. chat-api rejects unknown query params with a 400, so the SPA reads `?authProvider` from its own URL and builds `/api/v1/auth/login/<provider>` itself. chat-api's provider ids (`keycloak`, `azure-ad`, `google`, `auth0`, `okta`, `cognito`, `gitlab`) match next-auth's default ids. Check any custom ids the hosts send.

**Ops (must be done per environment):**

- Register the new redirect URI `${AUTH_CALLBACK_BASE_URL}/api/v1/auth/callback/<provider>` in every IdP client. The next-auth path `/api/auth/callback/<provider>` stops working.
- Set `AUTH_CALLBACK_BASE_URL` to the QuickApps origin (e.g. `https://quickapps.dial`). The login `callbackUrl` must be on that origin and at most 2048 characters long; the popup's fixed `/signin/complete` URL satisfies both.
- Set `AUTH_SESSION_COOKIE_NAME` / `AUTH_TRANSACTION_COOKIE_NAME` (e.g. `__Host-quickapps.sess` / `__Host-quickapps.tx`), and `AUTH_LEGACY_COOKIE_NAMES` to clear the old next-auth cookies.

### 2.4 API layer: replace `/api/*` with typed chat-api calls

Generate the client from the pinned `openapi.json` (Phase 0, item 5), and point every call site in `dialClient.ts`, `dial-files-api.ts`, `user-config.ts`, `resolve-icon-url.ts`, `ThemeContext.tsx` and `ToolsetLoginModal.tsx` at it. The full mapping is in [Appendix A](#appendix-a-route-mapping).

Logic that moves from our routes into the SPA:

- **Toolset credentials level:** USER for public toolsets, GLOBAL otherwise (`isPublicToolsetId`). The level becomes a body field on `/toolsets/:name/login`.

**Delete:**

- `src/app/api/**`
- `src/utils/server/**` (together with the server-side `@epam/ai-dial-typescript-sdk` usage)
- `src/proxy.ts`, `src/instrumentation.ts`, `src/opentelemetry.ts`, `src/server/logger.ts`
- all `@opentelemetry/*`, `pino` and `pino-pretty` dependencies
- the unused `fetchDialFiles`

### 2.5 Configuration

- Feature flags and host settings go in `CUSTOM_CLIENT_VARIABLES` (Phase 0, item 1), read once at startup from `client-config`. The default model comes from the native `config.defaultDeploymentId` (`DEFAULT_DEPLOYMENT`). Keep the `AppSettings` interface so consumers don't change.
- Env var mapping: [Appendix B](#appendix-b-env-var-mapping).

### 2.6 CSP compatibility

chat-api's CSP is stricter than ours: `script-src 'self'`, with no inline scripts or `unsafe-eval` and no CDN.

- **Monaco** is loaded from `cdn.jsdelivr.net` today. Bundle it locally instead (`monaco-editor` + Vite workers, configured through `@monaco-editor/react`'s `loader.config({ monaco })`).
- Check `@uiw/react-md-editor` and the ui-kit for inline styles and scripts under `CSP_MODE=report-only`, and switch to `enforce` once the violation reports are clean.
- **Target: the app's own origin only.** Leave `ALLOWED_CONNECT_ORIGINS` empty. `ALLOWED_IFRAME_ORIGINS` lists only the admin and chat hosts that embed us, which is what `frame-ancestors` needs. Any new external origin is a deliberate, reviewed exception.

### 2.7 Docker and CI

- Replace the root `Dockerfile` with the one below. It's adapted from another project that already ships its SPA on the chat-api image; that project uses Nx, and we don't. Here `npm run build` produces `dist/`, which is copied over `/app/apps/chat/dist`.

  ```dockerfile
  # syntax=docker/dockerfile:1

  # Must be declared before the first FROM: an ARG used in a later FROM has to be
  # in global scope for classic builders (no buildx/BuildKit).
  # Point it at a real, published release tag of ai-dial-chat (the "Packages" tab of
  # the epam/ai-dial-chat repo). Run `docker login ghcr.io` first if the package is private.
  ARG CHAT_API_IMAGE=ghcr.io/epam/ai-dial-chat:<pinned-release>

  # Pin exact Node (and, if needed for a security patch, npm) versions for reproducible builds.
  FROM node:24.17-alpine AS builder
  # RUN npm install --global npm@<patched-version>
  WORKDIR /app

  # Copy manifests first so the dependency layer is cached across source-only changes.
  COPY package.json package-lock.json ./
  RUN npm ci --ignore-scripts

  COPY . .
  RUN npm run build

  # Take the published chat-api image as-is and swap its frontend for our build.
  # chat-api's static-assets.ts resolves the frontend root by walking up from its
  # own dist dir to ../../chat/dist, i.e. /app/apps/chat/dist inside the image.
  # The image is amd64-only: build with --platform=linux/amd64 (ARM needs emulation).
  FROM ${CHAT_API_IMAGE} AS runner

  COPY --from=builder /app/dist /app/apps/chat/dist

  USER node

  EXPOSE 5000

  # No curl in the image, so use Node's fetch. Respects PORT and API_PREFIX overrides.
  HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
    CMD ["node", "-e", "fetch('http://127.0.0.1:' + (process.env.PORT || '5000') + '/' + (process.env.API_PREFIX || 'api').replace(/^[/]+|[/]+$/g, '') + '/health', {signal: AbortSignal.timeout(4000), redirect: 'error'}).then(r => process.exit(r.status === 200 ? 0 : 1)).catch(() => process.exit(1))"]

  CMD ["node", "apps/chat-api/dist/main.js"]
  ```

- Update the deployment env config in the GitLab deploy (`deploy-development.yml`) using Appendix B.

### 2.8 Verification and clean-up

- Walk through every phase 1 spec against the new build, embedded in both admin and chat.
- Update `README.md`, `.env.template`, `AGENTS.md` (remove the Next.js section, and describe the SPA + BFF architecture and the API client), and `.claude/rules/rtl.md` (it references `src/app/layout.tsx`).
- Remove `next`, `eslint-config-next`, `next-env.d.ts`, `.next/` and `next.config.ts`.

**Exit criteria:**

- all phase 1 specs pass;
- the image runs in dev with `CSP_MODE=enforce`;
- no `next`/`next-auth` imports remain;
- the Next-specific files and dependencies listed above are gone.

---

## Phase 3: Non-visual tech debt

Applies [`TECH_DEBT.md`](./TECH_DEBT.md) to the code that survives the UI rewrite.

| TECH_DEBT item                                          | Resolution                                                                                                                                                                                                                                                                                                 |
| ------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Use typescript-sdk instead of hardcoded Core endpoints  | **Closed by phase 2.** The browser no longer calls Core. chat-api uses the typescript-sdk server-side, and we call chat-api through a client generated from its OpenAPI spec, so no endpoints are hard-coded.                                                                                              |
| Add OpenSpec / SDD                                      | **Closed by phase 1.** From then on, every change starts with a spec change.                                                                                                                                                                                                                               |
| Test coverage                                           | **Done here, for surviving code only.** Unit tests for the API layer (mocked HTTP), the domain logic and the auth/host-integration flows, derived from the specs. Add `@vitest/coverage-v8` with a CI gate scoped to non-UI folders; suggested target ≥ 80 % lines. Components are excluded until phase 4. |
| Remove react-hook-form                                  | **Deferred to phase 4.** The new forms are built without it. Here, only extract the form model out of RHF (zod schema, `quickApp2Form` builders, the save serialization) into the domain layer, so phase 4 reuses it.                                                                                      |
| Review unnecessary components (e.g. `AgentSkillsField`) | **Dropped.** The components are replaced in phase 4. Any real logic found inside them moves to hooks or the domain layer during this phase.                                                                                                                                                                |

**Structural outcome** that phase 4 builds on:

```text
src/
  api/        generated chat-api client + thin wrappers (auth/CSRF, 401 handling)
  domain/     application model, serialization, file paths, entity scope — pure, fully tested
  host/       postMessage contract, ChatVisualizerConnector
  hooks/      state and data hooks used by the UI
  i18n/, types/, constants/
  components/ disposable — replaced in phase 4
```

---

## Phase 4: UI rewrite

- Build the new designs from Figma (use the `figma` skill) on `@epam/ai-dial-ui-kit`, on top of `api/`, `domain/`, `host/` and `hooks/`, which are unchanged.
- Form state without react-hook-form. The approach is decided when the new form designs are known.
- RTL and Arabic support built in from the start, following `.claude/rules/rtl.md`.
- Component tests are written with the new components, and the coverage gate extends to `components/`.
- Delete the old `components/` tree as the new screens replace it. When phase 4 is done, react-hook-form, `@hookform/resolvers` and any other dependency used only by the old UI are removed.

---

## Risks

| Risk                                                    | Mitigation                                                                                        |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| A chat-api release changes an endpoint we use           | Pin the image tag. Regenerate the client from the same tag and run the spec checks on every bump. |
| The session cookie is blocked in a cross-site iframe    | Phase 0, item 2. Test the embedding in both admin and chat before the rollout.                    |
| A gap in chat-api found during migration                | Interim workaround in the SPA or env, then an upstream PR to ai-dial-chat.                        |
| The IdP redirect URIs aren't updated during the rollout | Add it to the rollout checklist per environment, and run a smoke test of sign-in per provider.    |
| The stricter CSP breaks Monaco or the markdown editor   | Bundle them locally, and use `report-only` before `enforce`.                                      |

---

## Appendix A: route mapping

"Verify" means the endpoint exists, but its request/response shape still has to be confirmed against our usage (see Phase 0).

| Current (Next.js)                                                    | chat-api replacement                                                            | Status                                                   |
| -------------------------------------------------------------------- | ------------------------------------------------------------------------------- | -------------------------------------------------------- |
| `api/auth/[...nextauth]`                                             | `/api/v1/auth/{providers, login/:id, callback/:id, logout, me}`                 | Covered; client rewrite (2.3)                            |
| `api/dial/*` → `GET /openai/applications/{id}` and `GET /v1/{appId}` | `GET /api/v1/deployments/:deployment/details`                                   | Verify (Phase 0, item 3)                                 |
| `api/dial/*` → `PUT /v1/{appId}`                                     | `PATCH /api/v1/applications/:name` with `applicationProperties`                 | Verify (Phase 0, item 3)                                 |
| `api/dial/*` → `GET /v1/bucket`                                      | `GET /api/v1/auth/me` (`bucket`)                                                | Covered                                                  |
| `api/dial/*` → user-config JSON file                                 | `GET /api/v1/user-config`                                                       | Covered; verify the favorites shape                      |
| `api/dial/*` → file URLs used as icon `src`                          | `GET /api/v1/files/download?bucket&path` (cookie auth works for `<img>`)        | Covered                                                  |
| `api/dial/*` → `GET /v1/metadata/...` (`fetchDialFiles`)             | —                                                                               | Dead code; delete                                        |
| `api/dial-deployments`                                               | `GET /api/v1/deployments?interface_type=`                                       | Covered                                                  |
| `api/dial-toolsets`                                                  | `GET /api/v1/toolsets`                                                          | Covered                                                  |
| `api/dial-toolsets/signin` / `signout`                               | `POST /api/v1/toolsets/:name/login` / `logout` (`credentialsLevel` in the body) | Covered; the level logic moves to the SPA                |
| `api/dial-files/list`                                                | `GET /api/v1/files/list`                                                        | Verify (Phase 0, item 4)                                 |
| `api/dial-files/list-shared`                                         | `GET /api/v1/files/shared`                                                      | Verify                                                   |
| `api/dial-files/download`                                            | `GET /api/v1/files/download`                                                    | Covered                                                  |
| `api/dial-files/upload` (PUT)                                        | `POST /api/v1/files` (multipart)                                                | Verify create-only semantics and progress                |
| `api/dial-files/create-folder`                                       | `POST /api/v1/files/folders`                                                    | Verify                                                   |
| `api/dial-files/delete`                                              | `POST /api/v1/files/delete`                                                     | Verify recursive folder delete                           |
| `api/dial-files/rename`                                              | `POST /api/v1/files/rename`                                                     | Verify                                                   |
| `api/dial-skills/catalog`                                            | `GET /api/v1/skills/catalog`                                                    | Covered (our route is a copy of it)                      |
| `api/settings`                                                       | `GET /api/v1/client-config?appId=chat-ui` → `config.customVariables`            | Covered with `appId=chat-ui` (Phase 0, item 1)           |
| `api/themes`                                                         | `GET /api/themes`                                                               | Covered                                                  |
| `api/themes/image/[...path]`                                         | `GET /api/themes/icon?iconName=`                                                | Covered; update the URL builder in `resolve-icon-url.ts` |
| `api/health`                                                         | `GET /api/health`                                                               | Covered                                                  |
| `src/proxy.ts` (CSP) and `next.config.ts` headers                    | chat-api Helmet CSP and security headers                                        | Covered, but stricter (2.6)                              |
| `instrumentation.ts`, OTel, pino                                     | chat-api OpenTelemetry (`OTEL_SDK_DISABLED=false` to enable)                    | Covered                                                  |

## Appendix B: env var mapping

The per-provider variable names differ slightly between next-auth and chat-api. Check each provider against `ai-dial-chat/apps/chat-api/.env.template`.

| Current                                                                                                                                                       | chat-api                                                                                                                      | Notes                                                                                                                                                                                                                                                      |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `NEXTAUTH_SECRET`                                                                                                                                             | `AUTH_SESSION_SECRET`                                                                                                         | 64 hex characters; `AUTH_SESSION_PREV_SECRET` is available for rotation                                                                                                                                                                                    |
| `NEXTAUTH_URL`                                                                                                                                                | `AUTH_CALLBACK_BASE_URL` (and `CORS_ORIGIN`)                                                                                  | Also allows the popup's `callbackUrl`                                                                                                                                                                                                                      |
| `AUTH_<PROVIDER>_*`                                                                                                                                           | `AUTH_<PROVIDER>_*`                                                                                                           | Mostly the same; e.g. `*_ISSUER` / `*_CLIENT_SECRET` vs `*_HOST` / `*_SECRET` differ per provider                                                                                                                                                          |
| `DIAL_CORE_URL`                                                                                                                                               | `DIAL_CORE_URL`                                                                                                               | Unchanged                                                                                                                                                                                                                                                  |
| `THEMES_URL` (points at `config.json`)                                                                                                                        | `THEMES_CONFIG_URL`                                                                                                           | Base URL; chat-api appends `/config.json`                                                                                                                                                                                                                  |
| `ALLOWED_FRAME_ANCESTORS`                                                                                                                                     | `ALLOWED_IFRAME_ORIGINS`                                                                                                      | Plus `OVERLAY_ENABLED` if `SameSite=None` is needed (Phase 0, item 2)                                                                                                                                                                                      |
| `QUICK_APPS_DEFAULT_MODEL`                                                                                                                                    | `DEFAULT_DEPLOYMENT`                                                                                                          | Native chat-api setting, returned as `config.defaultDeploymentId` by `client-config`. The BFF doesn't apply it server-side, so the SPA still fills it into the application itself. Our container has its own env, so there's no clash with chat's value.   |
| `CODE_INTERPRETER_ENABLED`, `WEB_FETCH_ENABLED`, `ADD_ATTACHMENT_ENABLED`, `ALLOWED_ORIGIN`, `DIAL_ADMIN_URL`, `DIAL_CHAT_URL`, `QUICK_APPS_APPLICATION_NAME` | `CUSTOM_CLIENT_VARIABLES` (a JSON object)                                                                                     | Permanent (Phase 0, item 1). Keep the same key names so they map 1:1 onto `AppSettings`.                                                                                                                                                                   |
| `OTEL_*`                                                                                                                                                      | `OTEL_*`                                                                                                                      | Disabled by default in chat-api                                                                                                                                                                                                                            |
| `PORT`                                                                                                                                                        | `PORT`                                                                                                                        | Default 5000                                                                                                                                                                                                                                               |
| —                                                                                                                                                             | `CSP_MODE`, `ALLOWED_CONNECT_ORIGINS`, `AUTH_SESSION_COOKIE_NAME`, `AUTH_TRANSACTION_COOKIE_NAME`, `AUTH_LEGACY_COOKIE_NAMES` | New. Rename the cookies away from the `chat.*` defaults while keeping the `__Host-` prefix, e.g. `__Host-quickapps.sess` / `__Host-quickapps.tx`. List the old next-auth cookie names in `AUTH_LEGACY_COOKIE_NAMES` (comma-separated) so they get expired. |
