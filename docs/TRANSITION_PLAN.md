# QuickApps frontend: transition plan

Status: draft · Owner: QuickApps frontend team · Last updated: 2026-09-25

**Progress:** Phase 1 started — `openspec/` is initialised in the repo (`openspec/config.yaml`, `openspec/specs/`, `openspec/changes/`) with the OpenSpec skills installed under `.claude/skills/`. Specs written so far: `host-integration`, `auth`.

Phase 0 is underway: items 1, 2, 5, 8 are decided; items 3, 4, 7 are investigated with findings below (item 3 surfaced a real gap — the `intro` field); item 6 (image tag) remains open.

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
  - Mitigation: pin the image to a release tag (never `:development` in production), and pin `@epam/ai-dial-chat-api-client` (the published, generated OpenAPI client — see Phase 0, item 5) to the matching version.
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

2. **Session cookie inside the iframe: decided — `SameSite=Lax`, `OVERLAY_ENABLED` unset.** Confirmed against `apps/chat-api/src/auth/cookies/cookie-options.ts`: chat-api only ever emits `SameSite=None` when `OVERLAY_ENABLED=true` **and** `ALLOWED_IFRAME_ORIGINS` is non-empty (`isOverlayEmbeddingEnabled`); `OVERLAY_ENABLED` is chat's own overlay-runtime-mode flag (see `chat-overlay-security-config` in ai-dial-chat), unrelated to QuickApps, so we leave it unset and accept `Lax`.
   - QuickApps deployments are always cross-site with their admin/chat host (different domain). We accept `Lax` here because the auth backend the browser talks to (the chat-api-based BFF) lives on QuickApps' **own** origin, in our own repo/deployment — the browser only ever needs to send the cookie to same-site requests initiated by the top-level QuickApps page when it's opened standalone, or by the SPA's own fetches while embedded.
   - **Risk to verify empirically once 2.1–2.4 land:** browsers compute `SameSite` from the full ancestor-frame chain, not just the immediate request's origin — a fetch made by script running inside a cross-site iframe (QuickApps framed by admin/chat) can be treated as cross-site even when the request target shares the iframe document's own origin, which would make `Lax` cookies get dropped on those calls. Test this concretely (embedded in both admin and chat, `SameSite=Lax`, confirm `/api/v1/auth/me` and a mutating call succeed) as part of the Phase 2 exit criteria (§2.8). If it fails in practice, the fallback is requesting a dedicated upstream flag to decouple `SameSite=None` from `OVERLAY_ENABLED` (not "turn overlay mode on" as originally considered here).
3. **Saving and loading the application: mostly confirmed, one real gap found (`intro`).** Checked against the local `ai-dial-chat` checkout (`apps/chat-api/src/applications/{applications.controller.ts,dto/update-application.dto.ts}`, `apps/chat-api/src/deployments/dto/deployment-details.dto.ts`, `openspec/specs/applications-write-api/spec.md`):
   - `PATCH /api/v1/applications/:name` (`UpdateApplicationBodyDto`) covers `name`, `description`, `iconUrl`, `topics` (→ `descriptionKeywords`), `version`, `endpoint`, `features`, `inputAttachmentTypes`, `maxInputAttachments`, `locales`/`primaryLocale`, and `applicationProperties` (omit/`null` leaves it untouched; supplied, it fully replaces the stored value — matches today's full-body `PUT`).
   - `GET /api/v1/deployments/:deployment/details` → `applicationDetails.applicationProperties` is an explicitly documented **verbatim passthrough** of the stored `application_properties`; chat-api does no encoding/decoding of anything inside it (it's `Record<string, unknown>` end to end). So URL encoding inside `application_properties` (icon/context-file references, etc.) stays entirely our responsibility, unchanged from today — nothing to adapt here.
   - **Gap: `intro` has no home in the typed API — resolved in 2.4, dropped entirely.** Our old editor round-tripped a top-level `intro` field end to end (`EditorClient.tsx`, `dialClient.ts`'s `_rawForSave`/`saveDialApp`, `has-quick-app-changes.ts`, `editor-messages.ts`'s `TriggerSaveGeneralPayload.intro`) via the raw `PUT /v1/{appId}`, which passes any field through to DIAL Core untyped. chat-api's typed endpoints deliberately don't: `openspec/specs/applications-write-api/spec.md` documents that `intro` was **removed from the request/response contract entirely** — `CreateApplicationBodyDto`/`UpdateApplicationBodyDto` have no `intro` field, and a body containing one is rejected with 400 (`forbidNonWhitelisted`). `ApplicationDetailsDto` doesn't return it either. Rather than block 2.4 on an ai-dial-chat team answer, this was resolved directly with the user: `intro` is dropped entirely, not preserved anywhere (including inside `applicationProperties`). See §2.4.
4. **Files API shape: confirmed, one behavior difference to account for.** Checked against `apps/chat-api/src/files/files.controller.ts`:
   - `POST /api/v1/files` accepts an optional `uploadMode: 'overwrite' | 'create-only'` field; **`'overwrite'` is the default**, not create-only. Our current upload semantics must set `uploadMode: 'create-only'` explicitly on every call, or we'd silently switch from create-only to overwrite-by-default.
   - The rest of the surface (`list`, `shared`, `metadata`, `folders`, `delete`, `rename`, `download`) matches the route mapping in Appendix A; still confirm exact response field names against `@epam/ai-dial-react-file-manager`'s expected shape when wiring 2.4.
5. **API client: resolved — it's already published.** `@epam/ai-dial-chat-api-client` ("Generated OpenAPI client for the AI DIAL Chat API") is public on npm, not private as originally assumed here. Its dist-tags map onto ai-dial-chat's own release channel: `latest` tracks the current stable chat-api release, `development` tracks `:development`, and versioned tags like `1.1-rc`/`1.0-rc` track past release lines. So:
   - Install `@epam/ai-dial-chat-api-client` pinned to the exact version published alongside the ai-dial-chat image tag we pin (Phase 0, item 6) — no client generation step needed.
   - No need for `openapi-typescript` / `openapi-fetch` or committing a generated client; upgrading the image tag is just bumping this dependency to the matching version.
   - Confirm the package's exported API surface (it ships per-domain API classes, e.g. `ApplicationsApi`, `AuthApi`, `DeploymentsApi`, `FilesApi`, `AppConfigApi`, `ChatApi`, `ClientChannelApi`, `ExternalServicesApi`) covers every endpoint in [Appendix A](#appendix-a-route-mapping) before wiring it in during 2.4. **Confirmed in 2.4:** the installed `1.1.4` package also exports `ToolsetsApi`, `SkillsApi`, `ThemesApi`, and `UserConfigApi` — this list wasn't exhaustive, but the package covers everything Appendix A needs.

6. **Image tag policy.** Choose the ai-dial-chat release we pin to, and decide who bumps it and how. Upgrading means bumping the Docker image tag and the `@epam/ai-dial-chat-api-client` npm version together (their release lines match, per item 5), then running the checks.
7. **CI: workflows confirmed, registry access still to verify.** `.github/workflows/{pr,release,deploy-development}.yml` call the shared reusable workflows `epam/ai-dial-ci/.github/workflows/{node_pr,node_release,deploy-development}.yml@4.11.0` — generic Node build/deploy workflows, not specific to this repo's current Dockerfile. Today's `Dockerfile` builds entirely from `node:24-alpine` with no external image pull, so this repo's CI has never needed registry credentials for a second image. Still open, and org-specific rather than something readable from source: does the runner these reusable workflows execute on have `docker login ghcr.io` access (or is `ghcr.io/epam/ai-dial-chat` public), and does it build `--platform=linux/amd64` (the image is amd64-only)?
8. **Sign-in outside the iframe: decided — iframe-only, popup sign-in.** QuickApps is only ever opened embedded in admin/chat, never standalone, so the full-page-redirect flow (`/api/v1/auth/login/<provider>?callbackUrl=<current URL>`) isn't needed. Popup sign-in only (see 2.3).

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

- [x] `openspec/` initialised in the repo, with one spec per capability above (in progress: `host-integration` and `auth` are written; the rest follow the "spec coverage is not all delivered up front" rule below);
- [x] the SDD workflow noted in `AGENTS.md`, so new work starts from a spec change.

**Spec coverage is not all delivered up front.** `TECH_DEBT.md`'s "OpenSpec spec creation
candidates" list enumerates the capabilities above at file-level granularity (e.g.
`application_editing`, `toolsets_selection`/`toolsets_login`, `context-files`, `theming`).
Only `host-integration` and `auth` are written so far. Whenever a future change (in phase 1
or later) touches source files under one of that list's areas and the capability has no spec
yet, writing or extending that spec is in scope for the change — not deferred to "someday" —
following the naming convention in `openspec/config.yaml`'s "Specs organization" section.
`openspec/config.yaml`'s `specs` rules already require checking `openspec/specs/` before
adding a spec-id; treat `TECH_DEBT.md`'s list as the first place to check.

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

### 2.3 Auth: next-auth → chat-api auth — **Done**

| Today                                                 | After                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| ----------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `useSession()`                                        | `GET /api/v1/auth/me` (401 means logged out). Returns `providerId` and `bucket`. Keep the `X-CSRF-Token` response header for non-GET calls.                                                                                                                                                                                                                                                                                                                                                                                      |
| `getProviders()`                                      | `GET /api/v1/auth/providers`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `signIn(provider)` in the `/signin` popup             | The popup navigates directly to `/api/v1/auth/login/:providerId?callbackUrl=<origin>/signin/complete`. chat-api's login/callback flow is a plain full-page redirect with no postMessage handshake (COOP headers on IdP login pages can sever `window.opener` unpredictably — see `ai-dial-chat`'s `useOverlayExternalLogin`/`docs/auth/auth-bff-encrypted-cookie.md` §5.1.1). The opener polls its own `/me` instead and closes the popup itself once authenticated; `/signin/complete` is just a `window.close()` landing page. |
| `signOut()`                                           | `POST /api/v1/auth/logout` (CSRF header, and an Origin that matches `CORS_ORIGIN`), `redirect: 'manual'` so `fetch` doesn't follow chat-api's 302 to the IdP's end-session endpoint.                                                                                                                                                                                                                                                                                                                                             |
| Provider-mismatch sign-out                            | Compare `me.providerId` with `?authProvider`, then log out and log in again.                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| Missing or unconfigured `?authProvider` (`AuthError`) | Check `?authProvider` against `GET /api/v1/auth/providers` **before** redirecting; `/login/:id` returns 404 for an id that isn't configured.                                                                                                                                                                                                                                                                                                                                                                                     |
| Any non-GET call                                      | Send `X-CSRF-Token` (taken from the `/me` response) and credentials `include`.                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| 401 handling (`handle-unauthorized-response.ts`)      | Same logic, calling the new logout. On a 403 `CSRF_INVALID`, refresh through `/me` and retry, as chat does.                                                                                                                                                                                                                                                                                                                                                                                                                      |

**Deleted:** `next-auth`, `src/utils/auth-options.ts`, `src/types/next-auth.d.ts`, `AuthProvider`,
`src/constants/auth.ts`, `src/hooks/use-auth.ts` (→ `useAuth.ts`), `src/pages/SignInPage.tsx`
(→ `SignInCompletePage.tsx`). The unused `dial_session` cookie fallback in `dial-server-auth.ts`
is **not** physically deleted yet — that file, `src/app/api/**`, `src/proxy.ts`,
`src/instrumentation.ts` and `src/opentelemetry.ts` are already dead (Next-only, no server to run
them) and are now excluded from `tsconfig.json`'s typecheck rather than left accidentally-green
via a stale `next` package in `node_modules`. Physical deletion happens in §2.4, which replaces
them outright rather than porting anything from them.

**Provider in the login URL:** it goes in the **path**. chat-api rejects unknown query params with a 400, so the SPA reads `?authProvider` from its own URL and builds `/api/v1/auth/login/<provider>` itself. chat-api's provider ids (`keycloak`, `azure-ad`, `google`, `auth0`, `okta`, `cognito`, `gitlab`) match next-auth's default ids. Check any custom ids the hosts send.

**Ops (must be done per environment):**

- Register the new redirect URI `${AUTH_CALLBACK_BASE_URL}/api/v1/auth/callback/<provider>` in every IdP client. The next-auth path `/api/auth/callback/<provider>` stops working.
- Set `AUTH_CALLBACK_BASE_URL` to the QuickApps origin (e.g. `https://quickapps.dial`). The login `callbackUrl` must be on that origin and at most 2048 characters long; the popup's fixed `/signin/complete` URL satisfies both.
- Set `AUTH_SESSION_COOKIE_NAME` / `AUTH_TRANSACTION_COOKIE_NAME` (e.g. `__Host-quickapps.sess` / `__Host-quickapps.tx`), and `AUTH_LEGACY_COOKIE_NAMES` to clear the old next-auth cookies.

**Known issue, found during live testing (2026-09-25): `HTTP ERROR 431` clicking Login, on a host
that previously ran the pre-migration next-auth deployment.** The browser was still sending the
old next-auth cookies (`chat.*`/`next-auth.*`-style names on `localhost:4600`) alongside the new
`__Host-quickapps.*` ones; combined they exceeded the server's request-header size limit, and the
request was rejected before chat-api ever got to run its own cookie-expiry logic — clearing
browser cookies for the host fixed it. **This can't be auto-cleared from server code**: the 431
is raised by the HTTP layer while rejecting an oversized request, before app code (including
`AUTH_LEGACY_COOKIE_NAMES`'s own expiry) runs, so there's no request left in which the server
could send a `Set-Cookie` to clear anything. Documented in `README.md` (Auth: session) with the
two real mitigations for production — setting `AUTH_LEGACY_COOKIE_NAMES` to the specific old
cookie names so they get expired on requests that _do_ get through, and giving the reverse
proxy/Node extra header-size headroom (`large_client_header_buffers` / `--max-http-header-size`)
as a safety margin — plus the same manual "clear cookies for the host" recovery step for anyone
who hits it before those are in place.

### 2.4 API layer: replace `/api/*` with typed chat-api calls — **Done**

Installed `@epam/ai-dial-chat-api-client@1.1.4` (the current npm `latest` dist-tag — Phase 0 item 6's image-tag policy is still unresolved, so this is a placeholder pin to revisit once a real `ghcr.io/epam/ai-dial-chat` tag is chosen) and pointed every call site in `dialClient.ts`, `dial-files-api.ts`, `user-config.ts`, `resolve-icon-url.ts`, `ThemeContext.tsx` and `ToolsetLoginModal.tsx` at it, per [Appendix A](#appendix-a-route-mapping). Confirmed directly against the installed package's `.d.ts` files that it exports every domain Appendix A needs (`ApplicationsApi`, `DeploymentsApi`, `FilesApi`, `ToolsetsApi`, `AppConfigApi`, `SkillsApi`, `ThemesApi`, `UserConfigApi`), closing Phase 0 item 5's open question.

A shared `src/utils/chat-api-fetch.ts` (promoted out of `auth-api.ts`'s formerly-private CSRF logic) and `src/utils/chat-api-client.ts` (one `Configuration` + one instance per API class, wired to `chat-api-fetch` and firing the existing 401 loop-breaker via middleware) back every one of these calls, so CSRF handling is no longer something each caller has to remember — `ToolsetLoginModal`'s two mutating calls, which used to skip it entirely, now go through the same path as everything else. `dial-files-api.ts`'s `uploadFile` stays hand-written (its `XMLHttpRequest` progress path isn't something a generated OpenAPI client can do), reading the shared CSRF token via a new `getCsrfToken()` accessor.

**Gaps found while implementing, not anticipated by the original table above:**

- **`intro` is dropped entirely**, resolved with the user rather than the ai-dial-chat team (Phase 0 item 3's original question): `UpdateApplicationBodyDto`/`ApplicationDetailsDto` have no `intro` field and reject a request that includes one. Removed from `TriggerSaveGeneralPayload`, `StoredGeneralFields`, and `EditorClient`'s save path — not preserved anywhere, including inside `applicationProperties`.
- **General-step display fields (name, description, iconUrl, topics, version) live only on the deployments _list_ entry (`DeploymentItemDto`), not on `ApplicationDetailsDto`.** Loading one app (`fetchDialApp`) now makes two calls — `getDeploymentDetails` for `applicationProperties`/attachment settings, and a `listDeployments` scan for the display fields — where the old single Core `GET /v1/{appId}` returned everything at once. Worth asking the ai-dial-chat team to fold into one response later; not blocking.
- **`fetchApplicationRequiresAuthentication` has no chat-api equivalent — known regression, not just a stub detail.** `ApplicationDetailsDto` has nothing corresponding to Core's raw `external_services` map. It's now a stub that always returns `false`, flagged in code and in its test. Concretely: the "Application credentials in the Chat host" feature (README) never shows its credentials action anymore, for any application, regardless of whether that application actually needs external-service sign-in — not merely "never blocks the UI" as originally framed, but a real loss of a user-facing feature until chat-api exposes this metadata.
- **`name`/`description`/`locales`/`primaryLocale` map onto chat-api's `UpdateApplicationBodyDto` more directly than expected** — the host's `TriggerSaveGeneralPayload` already sends `locales: LocaleTextEntryDto[]` + `primaryLocale` in exactly chat-api's own shape, so `saveDialApp` passes them straight through instead of needing new recombination logic (`buildLocalizedText` is still used for internal diffing in `hasQuickAppChanges`, unrelated to the wire format).
- **`fetchDialToolsets` uses `ToolsetsApi.listToolsets()`**, not the deployments list — `DeploymentItemDto` (used for models/MCP agents) has no `authSettings` field; only the dedicated toolsets endpoint's `DialToolsetDto` carries it.
- **Known regression, found during live testing (2026-09-26): the model picker (`ModelField.tsx`) is permanently empty.** `ModelField`/`QuickApp2Form` only show models where `features.tools` is truthy (an orchestrator's model must support tool calling) — this filter predates the migration and is unchanged. The old raw Core list response included `features.tools` per item; chat-api's `/api/v1/deployments` list endpoint (`DeploymentItemDto.features`, typed `DeploymentFeaturesDto`) does not — it only has `systemPrompt`, `temperature`, `folderAttachments`, `mcp`, `responsesApi`, `chatCompletion`, `skillsSupported`. The richer set that does include `tools` (`DeploymentFeaturesDetailsDto`) exists only on the per-app `getDeploymentDetails` response, not the list, so filtering the list accurately would mean one extra request per listed model. Every model's `features.tools` is therefore always `undefined`, so `mapDeploymentToDialModel` (`src/utils/dialClient.ts`) never sets it and the filter excludes every model — the Agents & Toolsets picker is unaffected since it doesn't gate on this field. **Decision: fix on the chat-api side** (add a tools-capability flag to the deployments list response) rather than working around it in this app; no client-side change made yet.

**Deleted:**

- `src/app/api/**`
- `src/utils/server/**` (together with the server-side `@epam/ai-dial-typescript-sdk` dependency)
- `src/proxy.ts`, `src/instrumentation.ts`, `src/opentelemetry.ts`, `src/server/logger.ts`
- all `@opentelemetry/*`, `pino` and `pino-pretty` dependencies
- the unused `fetchDialFiles`/`DialFileMetadataItem`
- the `tsconfig.json` `exclude` entries added in §2.3 for the paths above (physically gone now, not just excluded)

### 2.5 Configuration — **Done**

Implemented as part of §2.4's `dialClient.ts` rewrite (`fetchAppSettings`): feature flags and host settings are read once via `AppConfigApi.getClientConfig({appId: 'chat-ui'})`; the default model comes from the native `config.defaultDeploymentId`; QuickApps-specific values (`allowedOrigin`, `dialAdminHost`, `dialChatHost`, `applicationName`) are read from `config.customVariables` with a small runtime shape guard. The `AppSettings` interface is unchanged, so no consumer needed updating. `README.md`'s new "Configuration" section documents the `CUSTOM_CLIENT_VARIABLES` key names. Env var mapping: [Appendix B](#appendix-b-env-var-mapping) — unchanged from Phase 0/§2.3, since it's entirely chat-api's own deployment config, not this repo's.

### 2.6 CSP compatibility — **Done in code; live verification still needs a running chat-api**

chat-api's CSP is stricter than ours: `script-src 'self'`, with no inline scripts or `unsafe-eval` and no CDN.

- **Monaco** no longer loads from `cdn.jsdelivr.net`. `monaco-editor` is now a direct dependency (it was already an optional peer of `@epam/ai-dial-ui-kit`/`@monaco-editor/react`, previously only present transitively), and `src/monaco-setup.ts` (imported once at the top of `main.tsx`) calls `loader.config({ monaco })` — a process-wide singleton, so this covers every ui-kit component that renders Monaco (`DialJsonEditor`, the Markdown editor's JSON mode), not just this app's own usage. It imports the lean `monaco-editor/esm/vs/editor/editor.api` core plus only the JSON language contribution (the only language this app actually edits), and registers `self.MonacoEnvironment.getWorker` using Vite's native `?worker` import suffix instead of a dedicated Monaco Vite plugin. This does grow the main bundle substantially (Monaco's own core, not the per-language contributions, is the bulk of the size) — an accepted, unavoidable cost of self-hosting instead of a CDN.
- `index.html`'s built `<script>`/`<link rel="stylesheet">` tags now carry a literal `__DIAL_CSP_NONCE__` placeholder, injected by a small `transformIndexHtml` Vite plugin in `vite.config.ts`, matching the marker name `ai-dial-chat`'s own `tools/vite/csp-nonce.mjs` uses — chat-api's static file server is expected to substitute a real per-request nonce before serving. This repo has no way to verify that substitution actually happens without ai-dial-chat's source for `tools/vite/csp-nonce.mjs` / its static-asset-serving code, which wasn't available while implementing this — **flagged for verification once chat-api is actually running.**
- Checked `@uiw/react-md-editor`'s and this repo's own compiled output for inline style/script injection patterns (`insertRule`, `document.write`, `dangerouslySetInnerHTML`) — none found. This is not the same as running with `CSP_MODE=report-only` against a live server and reading its violation reports, which is genuinely not possible without one; **do this before switching to `CSP_MODE=enforce`** in a real deployment, per the exit criteria below.
- **Target: the app's own origin only.** `ALLOWED_CONNECT_ORIGINS`/`ALLOWED_IFRAME_ORIGINS` are chat-api's own env vars (Appendix B) — nothing in this repo's code sets them.

### 2.7 Docker and CI — **Done for this repo's own files; two items are genuinely outside it**

- Replaced the root `Dockerfile` with the one below, adapted from this plan's own template with one deliberate deviation: it bakes in `ENV PORT=4600` (and `EXPOSE 4600` to match) instead of chat-api's own default `5000`, so the built image is reachable at the same port as this app's own Vite dev port (`vite.config.ts`) — one URL to remember whether you're running `npm run dev` or the built image. Still fully overridable via `-e PORT=...`/`--env-file` per deployment. `npm run build` produces `dist/`, copied over `/app/apps/chat/dist`.

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

  # Match this app's own dev port (vite.config.ts) — see note above. chat-api's
  # own default (absent this) is 5000.
  ENV PORT=4600
  EXPOSE 4600

  # No curl in the image, so use Node's fetch. Respects PORT and API_PREFIX overrides.
  HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
    CMD ["node", "-e", "fetch('http://127.0.0.1:' + (process.env.PORT || '5000') + '/' + (process.env.API_PREFIX || 'api').replace(/^[/]+|[/]+$/g, '') + '/health', {signal: AbortSignal.timeout(4000), redirect: 'error'}).then(r => process.exit(r.status === 200 ? 0 : 1)).catch(() => process.exit(1))"]

  CMD ["node", "apps/chat-api/dist/main.js"]
  ```

  The `<pinned-release>` placeholder is deliberately unresolved: Phase 0 item 6's image tag policy is still an open decision (who picks the tag, who bumps it) — this Dockerfile cannot actually build until that's answered and the `ARG` default (or a `--build-arg`) is set to a real tag.

- **"Update the deployment env config in the GitLab deploy using Appendix B" is not a change to any file in this repo.** `.github/workflows/deploy-development.yml` (this repo's actual "GitLab deploy" file) only triggers an external GitLab CI/CD pipeline (project id `3450`) via a reusable `epam/ai-dial-ci` workflow — it carries no application env vars itself, and the pipeline it triggers isn't part of this codebase. Appendix B's env vars need to be set as variables on that external GitLab project directly; nothing here to commit.
- `pr.yml`/`release.yml` call generic reusable `epam/ai-dial-ci` workflows unchanged by this migration — no Next.js-specific step existed in either to remove. Phase 0 item 7's open question (does the runner have `ghcr.io` access, does it build `--platform=linux/amd64`) is unchanged and still needs an answer from whoever administers those runners; it can't be determined from this repo's files.

### 2.8 Verification and clean-up — **Code-side done; live/manual QA still outstanding**

- **Not done here — needs a live chat-api plus real admin/chat hosts to embed in, neither of which exists in this environment.** Walking through every phase 1 spec against the new build, embedded in both admin and chat, is a manual QA pass that has to happen once a chat-api instance is actually running; static analysis (typecheck/lint/test/build, all clean) is as far as this repo's own tooling can verify without one.
- `README.md`, `.env.template`, `AGENTS.md` and `.claude/rules/rtl.md` updated: the Next.js section is gone from `AGENTS.md` (which now describes the SPA + chat-api-BFF architecture and the typed API client layer), `.env.template`/`README.md`'s Configuration section reflect that this app has no env vars of its own anymore (§2.5), and both `.claude/rules/rtl.md` and `AGENTS.md`'s own RTL paragraph point at `src/components/I18nProvider.tsx`/`main.tsx` instead of the deleted `src/app/layout.tsx`. (Confirmed while doing this: the dynamic `dir`-switching this rule describes was never actually implemented, even in the old `layout.tsx` — it hardcoded `lang="en"`. Not a regression from this migration; correctly deferred to Phase 4 per that phase's own "RTL and Arabic support built in from the start" scope.)
- `next`, `eslint-config-next`, `next-env.d.ts`, `.next/` and `next.config.ts` were already gone before this phase's work began (removed in §2.1/§2.2) — confirmed still gone; `grep`ed the full `src/` tree for `next`/`next-auth` imports and found none (two code comments mentioning `next-auth`'s old behavior for context, in `AuthContext.tsx`, are not imports).

**Exit criteria:**

- all phase 1 specs pass — **outstanding, needs a live chat-api + real host to embed in (see above);**
- the image runs in dev with `CSP_MODE=enforce` — **outstanding, same reason; §2.6 covers what's verifiable statically;**
- no `next`/`next-auth` imports remain — **done;**
- the Next-specific files and dependencies listed above are gone — **done.**

---

## Phase 3: Non-visual tech debt

Applies [`TECH_DEBT.md`](./TECH_DEBT.md) to the code that survives the UI rewrite.

| TECH_DEBT item                                          | Resolution                                                                                                                                                                                                                                                                                                 |
| ------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Use typescript-sdk instead of hardcoded Core endpoints  | **Closed by phase 2.** The browser no longer calls Core. chat-api uses the typescript-sdk server-side, and we call chat-api through the published `@epam/ai-dial-chat-api-client`, so no endpoints are hard-coded.                                                                                         |
| Add OpenSpec / SDD                                      | **Closed by phase 1.** From then on, every change starts with a spec change.                                                                                                                                                                                                                               |
| Test coverage                                           | **Done here, for surviving code only.** Unit tests for the API layer (mocked HTTP), the domain logic and the auth/host-integration flows, derived from the specs. Add `@vitest/coverage-v8` with a CI gate scoped to non-UI folders; suggested target ≥ 80 % lines. Components are excluded until phase 4. |
| Remove react-hook-form                                  | **Deferred to phase 4.** The new forms are built without it. Here, only extract the form model out of RHF (zod schema, `quickApp2Form` builders, the save serialization) into the domain layer, so phase 4 reuses it.                                                                                      |
| Review unnecessary components (e.g. `AgentSkillsField`) | **Dropped.** The components are replaced in phase 4. Any real logic found inside them moves to hooks or the domain layer during this phase.                                                                                                                                                                |

**Structural outcome** that phase 4 builds on:

```text
src/
  api/        @epam/ai-dial-chat-api-client + thin wrappers (auth/CSRF, 401 handling)
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

| Risk                                                                                                                                                                         | Mitigation                                                                                                                                                                                                                        |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A chat-api release changes an endpoint we use                                                                                                                                | Pin the image tag. Bump `@epam/ai-dial-chat-api-client` to the matching npm version and run the spec checks on every bump.                                                                                                        |
| The session cookie (`SameSite=Lax`) is dropped on iframe-internal fetches because SameSite is computed from the full ancestor-frame chain, not just the request's own origin | Phase 0, item 2. Test `/api/v1/auth/me` and a mutating call from inside both admin and chat before the rollout; fall back to requesting a dedicated upstream flag to decouple `SameSite=None` from `OVERLAY_ENABLED` if it fails. |
| A gap in chat-api found during migration                                                                                                                                     | Interim workaround in the SPA or env, then an upstream PR to ai-dial-chat.                                                                                                                                                        |
| The IdP redirect URIs aren't updated during the rollout                                                                                                                      | Add it to the rollout checklist per environment, and run a smoke test of sign-in per provider.                                                                                                                                    |
| The stricter CSP breaks Monaco or the markdown editor                                                                                                                        | Bundle them locally, and use `report-only` before `enforce`.                                                                                                                                                                      |

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

**Caveat, added once live testing against a real chat-api deployment started (after §2.4):** the table below — including every per-provider `AUTH_<PROVIDER>_*` name — was written from documentation review (a local `ai-dial-chat` checkout's `.env.template`/source at the time), not verified end-to-end against a running instance. At least one entry was already wrong in practice (see "Confirmed corrections" below). Treat every row as "documented, not yet verified" unless it's listed there, and add to that list whenever live testing finds another mismatch — this table is not a substitute for chat-api's own `.env.template` for a real deployment, only a mapping aid for people coming from this app's old next-auth setup.

**Confirmed corrections from live testing:**

| Documented here (as of §2.4)  | Actually required by chat-api | Found                                                         | Notes                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| ----------------------------- | ----------------------------- | ------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `AUTH_KEYCLOAK_CLIENT_SECRET` | `AUTH_KEYCLOAK_SECRET`        | 2026-09-25, testing against a live Keycloak-backed deployment | The `AUTH_<PROVIDER>_*` row's own example (`*_CLIENT_SECRET` vs `*_HOST`/`*_SECRET`) was itself wrong for Keycloak — its secret variable is `_SECRET`, not `_CLIENT_SECRET`. `.env.template`/`README.md` already corrected; this row is the durable record of why. **Still to check:** every other provider's exact variable names (Azure AD, Google, Auth0, Okta, Cognito, GitLab) — none of those have been tested live yet, so treat their names in `.env.template`'s comments as unverified guesses following the same `_HOST`/`_CLIENT_ID`/`_SECRET`-style pattern, not confirmed ones. |

| Current                                                                                                                                                       | chat-api                                                                                                                      | Notes                                                                                                                                                                                                                                                                                                                                                                                       |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `NEXTAUTH_SECRET`                                                                                                                                             | `AUTH_SESSION_SECRET`                                                                                                         | 64 hex characters; `AUTH_SESSION_PREV_SECRET` is available for rotation                                                                                                                                                                                                                                                                                                                     |
| `NEXTAUTH_URL`                                                                                                                                                | `AUTH_CALLBACK_BASE_URL` (and `CORS_ORIGIN`)                                                                                  | Also allows the popup's `callbackUrl`                                                                                                                                                                                                                                                                                                                                                       |
| `AUTH_<PROVIDER>_*`                                                                                                                                           | `AUTH_<PROVIDER>_*`                                                                                                           | Names differ per provider — **do not trust a specific pattern here**, verify each provider live; see "Confirmed corrections" above (Keycloak's secret var is `_SECRET`, not `_CLIENT_SECRET`, contradicting what this row used to say)                                                                                                                                                      |
| `DIAL_CORE_URL`                                                                                                                                               | `DIAL_CORE_URL`                                                                                                               | Unchanged                                                                                                                                                                                                                                                                                                                                                                                   |
| `THEMES_URL` (points at `config.json`)                                                                                                                        | `THEMES_CONFIG_URL`                                                                                                           | Base URL; chat-api appends `/config.json`. **Suspected but not yet confirmed wrong** the same way the Keycloak secret was: a `503` on `GET /api/themes` was observed while testing with `THEMES_URL` set instead of `THEMES_CONFIG_URL` — consistent with chat-api not recognizing that name, but not verified as the actual cause yet. Move to "Confirmed corrections" above once checked. |
| `ALLOWED_FRAME_ANCESTORS`                                                                                                                                     | `ALLOWED_IFRAME_ORIGINS`                                                                                                      | Plus `OVERLAY_ENABLED` if `SameSite=None` is needed (Phase 0, item 2)                                                                                                                                                                                                                                                                                                                       |
| `QUICK_APPS_DEFAULT_MODEL`                                                                                                                                    | `DEFAULT_DEPLOYMENT`                                                                                                          | Native chat-api setting, returned as `config.defaultDeploymentId` by `client-config`. The BFF doesn't apply it server-side, so the SPA still fills it into the application itself. Our container has its own env, so there's no clash with chat's value.                                                                                                                                    |
| `CODE_INTERPRETER_ENABLED`, `WEB_FETCH_ENABLED`, `ADD_ATTACHMENT_ENABLED`, `ALLOWED_ORIGIN`, `DIAL_ADMIN_URL`, `DIAL_CHAT_URL`, `QUICK_APPS_APPLICATION_NAME` | `CUSTOM_CLIENT_VARIABLES` (a JSON object)                                                                                     | Permanent (Phase 0, item 1). Keep the same key names so they map 1:1 onto `AppSettings`.                                                                                                                                                                                                                                                                                                    |
| `OTEL_*`                                                                                                                                                      | `OTEL_*`                                                                                                                      | Disabled by default in chat-api                                                                                                                                                                                                                                                                                                                                                             |
| `PORT`                                                                                                                                                        | `PORT`                                                                                                                        | chat-api's own default is 5000; this repo's `Dockerfile` bakes in `4600` instead, matching the Vite dev port (§2.7) — override per deployment as needed.                                                                                                                                                                                                                                    |
| —                                                                                                                                                             | `CSP_MODE`, `ALLOWED_CONNECT_ORIGINS`, `AUTH_SESSION_COOKIE_NAME`, `AUTH_TRANSACTION_COOKIE_NAME`, `AUTH_LEGACY_COOKIE_NAMES` | New. Rename the cookies away from the `chat.*` defaults while keeping the `__Host-` prefix, e.g. `__Host-quickapps.sess` / `__Host-quickapps.tx`. List the old next-auth cookie names in `AUTH_LEGACY_COOKIE_NAMES` (comma-separated) so they get expired.                                                                                                                                  |
