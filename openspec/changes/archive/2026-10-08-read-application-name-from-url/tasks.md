# Tasks

## 1. Read `applicationName` from the entry URL

- [x] 1.1 In `src/App.tsx`, read `applicationName` via `searchParams.get('applicationName') || undefined`; use it (not `settings`) in the connector effect guard, the `ChatVisualizerConnector` constructor and `connectorTargetRef`; add it to the effect deps. Verify with `npm run typecheck`.
- [x] 1.2 Add `src/tests/App.test.tsx` (mock connector, `useAuthContext`, `fetchAppSettings`, `getAuthProviders`; set `window.location` search per case) covering: param present → connector built with that name and resolved host; two loads with different names use their own; param absent or empty → no connector; `X/readyToSave` and `X/loggedOut` posted with the prefix. Verify `npm test` passes.

## 2. Remove the env-based setting

- [x] 2.1 Delete `applicationName` from `CustomVariables`, `readCustomVariables` and the `fetchAppSettings` return in `src/utils/dial-client.ts`, and from `AppSettings` in `src/types/dial-entities.ts`. Verify `grep -rn applicationName src` shows only the URL-param usage in `App.tsx` and unrelated chat-api `applicationName` path params, and `npm run build` passes.
- [x] 2.2 Remove `applicationName` from `CUSTOM_CLIENT_VARIABLES` and its comment in `.env.template` (lines 66–67) and from `.env.local`. Verify by grep that neither file mentions it.

## 3. Documentation and specs

- [x] 3.1 README: delete the `applicationName` table row and drop it from the example `CUSTOM_CLIENT_VARIABLES`; add a short note that the host passes `applicationName` in the URL (pointing to the `host-integration` spec rather than redefining behavior). Verify the table renders and the example is valid JSON.
- [x] 3.2 CHANGELOG `[Unreleased]`: add a **BREAKING** entry — `applicationName` is no longer read from `CUSTOM_CLIENT_VARIABLES`, hosts must pass `?applicationName=`; deploy `ai-dial-chat` first. Leave the historical 1.0.0 migration table untouched. Verify the entry is under `Unreleased`.
- [x] 3.3 Run `openspec validate read-application-name-from-url` and verify it passes; after review, sync/archive so `openspec/specs/host-integration` reflects the delta.

## 4. Final checks

- [x] 4.1 Run `npm run lint`, `npm test`, `npm run build`, and verify all pass; manually load the app with and without `?applicationName=` inside a host iframe stub and confirm the handshake is sent only with it.
- [ ] 4.2 Confirm the sibling `ai-dial-chat` change is released first and that no other embedder (e.g. admin host) omits the param.
