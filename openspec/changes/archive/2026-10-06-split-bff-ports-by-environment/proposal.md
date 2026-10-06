# Proposal

## Why

Yesterday's BFF isolation change moved the root Docker image's default listener to `5001`, which is useful for local side-by-side runs but conflicts with the deployment process, which expects the deployable QuickApps image to listen on `5000`. The repository needs an explicit environment split: local workflows remain isolated on `5001`, while the production image and deployment configuration retain chat-api's `5000` contract.

## What Changes

- Restore the deployable root `Dockerfile` default, exposed port, and health-check fallback to `5000`.
- Keep the Vite development proxy and local checkout runner on `5001` so a local QuickApps BFF can coexist with a regular chat-api instance on `5000`.
- Keep the fast local Docker runner (`npm run docker:run`) explicitly mapped and configured for `5001`; it must not inherit the deployment image default accidentally.
- Make `.env.template` and README examples distinguish deployment configuration (`5000`) from local Docker/checkout configuration (`5001`).
- Update the deployment Docker-image specification and OpenSpec context to state both contracts.

### Non-goals

- No change to the Vite dev-server port (`4600`) or `/api` proxy semantics.
- No changes to authentication, host integration, API routes, chat-api dependencies, or container image selection.
- No new user-facing application UI or localization content.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `deployment_docker-image`: define `5000` as the deployable image's default listener while preserving `5001` for the repository's local Docker smoke runner.

## Impact

- **Configuration and runtime:** `Dockerfile`, `.env.template`, and `scripts/docker-run-dist.mjs` determine container defaults and port publishing. `vite.config.ts` and `scripts/run-chat-api-local.mjs` are the local checkout path and should remain on `5001` (current references: `vite.config.ts:34-43`, `scripts/run-chat-api-local.mjs:86-92`).
- **Documentation/spec context:** `README.md:37-54` currently presents the root Docker image as a local `5001` run and must separate it from `npm run docker:run`; `openspec/config.yaml:45-47` documents the local proxy contract.
- **APIs and dependencies:** none; the BFF API paths remain unchanged and the frontend remains static.
- **i18n and RTL:** no new user-visible strings or UI changes, so there is no i18n, direction, logical-property, or icon-mirroring impact.
- **Scope review:** auth, host integration, and the API layer are explicitly out of scope; only the BFF listener configuration and its documentation are affected.

## Alternatives Considered

- **Keep `5001` everywhere:** simplest configuration, but breaks the deployment process's expected listener contract; rejected.
- **Keep the Dockerfile default at `5000` and rely only on local `.env` files:** preserves deployment but is fragile because local Docker runs can accidentally bind `5000`; rejected in favor of explicit `-e PORT=5001` and `5001:5001` in the local runner.
- **Make the port configurable through a new build argument:** adds a build-time concern for a runtime setting and still requires a separate local-run override; rejected as unnecessary for the two established paths.

## Acceptance Criteria

- A root Docker build starts with `PORT=5000` by default, exposes `5000`, and its health check targets the effective port (including an explicit runtime override).
- `npm start` continues proxying to `http://localhost:5001`.
- `npm run start:api:dev` continues forcing the local checkout BFF to `5001` even if the sibling chat-api checkout has another `PORT` setting.
- `npm run docker:run` continues publishing and forcing the mounted local BFF on `5001`.
- README, `.env.template`, OpenSpec context, and the deployment spec no longer imply that the deployable image defaults to `5001`; they clearly identify which command uses each port.
- Rollback is limited to reverting this configuration/documentation change; no data migration or API compatibility step is required.
