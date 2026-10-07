## 1. Keep fetched entity ids decoded

- [x] 1.1 In `src/utils/dialClient.ts`, decode `entity.id` with `decodeDialPath` in
      `mapToolsetToDialToolset` and `mapDeploymentToDialModel`.
- [x] 1.2 Add `src/utils/tests/entity-id-encoding.test.ts`: fetched toolset and agent ids
      are decoded; selecting them and building the config saves `deployment_id`
      single-encoded. The test fails without 1.1.

  Verification: `npx vitest run`, `npm run lint`, `npm run build`.

## 2. Spec

- [x] 2.1 Add the "Saved entity references use the canonical id" requirement to
      `openspec/specs/application_editing/spec.md`.
