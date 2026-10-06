# Tasks

## 1. Restore the deployment image contract

- [x] 1.1 Update `Dockerfile` so the root deployable image defaults to `PORT=5000`, declares `EXPOSE 5000`, and uses `5000` only as the health-check fallback while preserving `process.env.PORT` overrides. Verification: no Vitest file applies (Dockerfile-only change); `npm run lint`, `npm run typecheck`, and static port-contract assertions passed. Docker build/image inspection was skipped at the user's request because the local Docker daemon is unavailable.
- [x] 1.2 Change `.env.template` to document `PORT=5000` as the deployment default and explain that local launchers override it to `5001`; update the explanatory comments and error text in `scripts/run-chat-api-local.mjs` so they no longer tell operators to set the template to `5001`. Verification: no Vitest file applies (environment-template/comment change); run `npm run lint` and `npm run typecheck`, then confirm the template default and local override wording are consistent with the deployment and local-port requirements.

## 2. Make local execution guidance explicit

- [x] 2.1 Preserve and clearly document the local contracts in `scripts/docker-run-dist.mjs`, `vite.config.ts`, and `scripts/run-chat-api-local.mjs`: the Vite proxy and local checkout remain on `5001`, and the Docker smoke runner keeps both `5001:5001` and an explicit `PORT=5001` after its env file. Verification: no Vitest file applies (local process-launch configuration); `npm run lint` and `npm run typecheck` passed, and static assertions confirmed the Vite target, local checkout override, Docker mapping, and Docker override. Executing the local Docker runner was skipped at the user's request because the Docker daemon is unavailable.
- [x] 2.2 Update `README.md` and `openspec/config.yaml` to distinguish the root Docker image/deployment example on `5000` from `npm run docker:run` and the Vite-plus-local-checkout workflow on `5001`; update the configuration table and command comments without changing the Vite port `4600`. Verification: no Vitest file applies (documentation/context change); `npm run lint` and `npm run typecheck` passed, and `openspec validate "split-bff-ports-by-environment" --type change --strict` passed.

## 3. Run the complete port-contract verification

- [x] 3.1 Verify the finished change against the deployment delta scenarios: run the frontend build, lint, typecheck, and test suite; inspect the configured deployment and local port contracts statically without changing the Vite proxy target. Verification: `npm run build`, `npm run lint`, `npm run typecheck`, and `npm test` passed (19 files, 172 tests); static port-contract assertions passed. Docker image/container checks were skipped at the user's request because the Docker daemon is unavailable.
