# Design

## Context

The repository has two different BFF execution paths. The Vite proxy and local checkout launcher already form a live-development path around port `5001` (`vite.config.ts:34-43`, `scripts/run-chat-api-local.mjs:84-95`), while the root `Dockerfile` is the deployable image and the `docker:run` script is a separate local smoke path. See `proposal.md` for the motivation and `specs/deployment_docker-image/spec.md` for the behavior contract.

The port is a chat-api runtime setting, not a frontend build setting: the SPA bundle contains no port configuration. Therefore the split belongs at process/container entrypoints and must not be implemented as a Vite build variable or an application-level API change.

## Goals / Non-Goals

**Goals:**

- Make the root Docker image self-describe and run with deployment's `5000` default.
- Make every local workflow explicitly target the isolated `5001` listener.
- Keep the health check aligned with the effective runtime `PORT`, including explicit platform overrides.
- Make a copied environment template and the README unambiguous about which port applies to each command.

**Non-Goals:**

- Changing the Vite server (`4600`), frontend bundle, `/api` paths, or chat-api API contract.
- Introducing a new environment-variable layer, build argument, proxy abstraction, or shared TypeScript port module.
- Changing image selection, authentication, host integration, or deployment platform manifests outside this repository.

## Decisions

### 1. Assign the default by execution path

The root `Dockerfile` will use `ENV PORT=5000` and `EXPOSE 5000`, with its health-check fallback changed to `5000`. The local paths retain explicit `5001` values:

- `vite.config.ts` continues targeting `http://localhost:5001`.
- `scripts/run-chat-api-local.mjs` continues overriding the child environment with `PORT=5001`.
- `scripts/docker-run-dist.mjs` continues using `5001:5001` and `-e PORT=5001`.

This is preferred over a single shared constant because these are separate process boundaries: the deployable image must advertise the deployment default, while local runners must deliberately override it. A build argument was rejected because the listener is selected at runtime and the local Docker runner does not build the root image.

### 2. Keep the health check runtime-aware

The existing health-check command will continue reading `process.env.PORT` and only change its fallback from `5001` to `5000`. This preserves support for a deployment platform that supplies another `PORT`; hard-coding a health-check URL would make a valid runtime override report unhealthy.

`EXPOSE 5000` is image metadata for the default deployment contract. It does not prevent an explicit `PORT` override, and the deployment operator remains responsible for publishing/configuring the effective port.

### 3. Treat environment templates as deployment defaults, with local commands as explicit overrides

`.env.template` will document `PORT=5000` because its primary runtime-image use is deployment. The local checkout and local Docker instructions will state that their launchers force `5001`, so copying the template does not create an implicit collision with a sibling chat-api process. README examples will show `5000:5000` for a root-image deployment/local deployment-like run and `5001` for `npm run docker:run` or the Vite-plus-checkout loop.

No new i18n keys or UI strings are involved. The change is direction-agnostic and has no RTL, logical-property, or icon-mirroring work.

### 4. Update the existing deployment capability, not create a new port capability

The behavior remains part of `deployment_docker-image`; the delta adds the environment-specific listener and documentation requirements there. This avoids splitting one container-runtime contract across near-duplicate specs.

## Risks / Trade-offs

- **[Risk]** An operator copies an older `.env.docker` containing `PORT=5000` and expects the local smoke runner to use it. **Mitigation:** keep `-e PORT=5001` after `--env-file` in `scripts/docker-run-dist.mjs`, and document that the command intentionally overrides the file.
- **[Risk]** A platform ignores Docker `EXPOSE` and injects a listener port. **Mitigation:** retain the runtime `PORT` override behavior and dynamic health-check expression; deployment configuration must publish the same effective port.
- **[Risk]** A user runs the root image locally and expects the Vite URL/port instead of deployment's default. **Mitigation:** README clearly labels the root Docker invocation as the deployment-shaped path and directs fast local iteration to `npm run docker:run` on `5001`.
- **[Trade-off]** The same numeric values are repeated in shell/config/documentation files. **Mitigation:** these are intentionally explicit per process boundary; hiding them behind a new abstraction would make container behavior less inspectable and would not cover the sibling chat-api checkout.

## Migration Plan

1. Update the root image and deployment template defaults to `5000`; leave local runner overrides at `5001`.
2. Build and inspect the image metadata, then run the local Docker smoke path to verify it still binds `5001`.
3. Deploy the rebuilt image with the deployment process's existing port configuration. Deployments that explicitly set `PORT` remain compatible; deployments relying on the old repository default should use `5000` (or explicitly set another supported port).
4. If rollback is required, revert the configuration/documentation commit and redeploy the prior image. No data migration, cookie migration, or API rollout is required.

## Open Questions

None. The design assumes “deployment” refers to the root `Dockerfile` image and its runtime environment, while `npm run docker:run`, `npm run start:api:dev`, and `npm start` are local workflows.
