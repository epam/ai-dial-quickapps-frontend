## 1. Shared contract and compatible application boundary

Slicing strategy: contract-first. Add the shared package and validated app boundary before migrating its consumers; complete the integration with one full verification pass. Preserve extensionless imports and bundler resolution throughout.

- [x] 1.1 Replace the direct old connector dependency in `package.json` with exact `@epam/ai-dial-visualizer-connector@1.3.0-dev.163` and regenerate `package-lock.json` without unrelated upgrades.
  - Verification: inspect the dependency diff and installed package version; `npm run typecheck` and `npm run lint` after consumer imports migrate.
- [x] 1.2 Share protocol definitions in `src/types/editor-messages.ts`; implement `src/utils/read-host-editor-message.ts` and `src/utils/post-editor-message.ts` with domain validation, parent/source checks and preserved Admin/allowed-origin behavior.
  - Verification: `src/utils/tests/read-host-editor-message.test.ts`, `src/utils/tests/post-editor-message.test.ts`; `npm run lint` and `npm run typecheck`.

## 2. Lifecycle and message consumers

Depends on section 1's shared contract; the two consumers can then be migrated independently.

- [x] 2.1 Migrate `src/App.tsx` to typed lifecycle methods and isolate host-origin resolution in `src/utils/get-editor-host-origin.ts`, retaining legacy handshake messages and scoping model readiness to the mounted authenticated editor.
  - Verification: `src/tests/App.test.tsx` and `src/utils/tests/get-editor-host-origin.test.ts` using the real published SDK for handshake, origin configuration, cleanup, late callbacks, user/session replacement and delayed readiness; `npm run lint` and `npm run typecheck`.
- [x] 2.2 Migrate `src/components/EditorClient/EditorClient.tsx`, `src/context/DataContext.tsx`, `src/hooks/use-toolset-credentials.ts` and `src/utils/request-application-credentials.ts` to the common adapters without changing save/auth outcomes.
  - Verification: `src/components/EditorClient/tests/EditorClient.test.tsx`, `src/context/tests/DataContext.test.tsx`, `src/hooks/tests/use-toolset-credentials.test.tsx`, `src/components/Agents/AgentDetailsPopup/tests/AgentDetailsPopup.test.tsx`; assert malformed/foreign messages cannot mutate state or consume OAuth pending requests, and all legacy payloads remain intact. Run `npm run lint` and `npm run typecheck`.

## 3. Documentation and delivery checks

Depends on both integration slices.

- [x] 3.1 Update `README.md` and `openspec/config.yaml` to name the current package and adapter; synchronize the changed host/toolset requirements without changing unrelated capabilities.
  - Verification: compare documented envelopes and lifecycle with implementation/tests, check all old connector references for current versus historical intent, and run strict OpenSpec validation.
- [x] 3.2 Run focused regressions, then the complete `npm test`, `npm run lint`, `npm run typecheck` and `npm run build`; check formatting of touched files and conduct the five-axis review. Record actual results and any blocked checks before archiving.
  - Verification: command exit status, coverage thresholds, build output, `git diff --check`, and review findings. No new UI, i18n or RTL task is needed because the change renders no new surface.

## Verification results

Baseline before implementation: Node 24.14.0, `npm run typecheck` passed; `npm test` passed all 93 files / 873 tests and every 70% coverage threshold.

Final verification with Node 24.14.0:

- Installed direct connector: exactly `1.3.0-dev.163`; lockfile changes only the connector dependency tree. Attachment canvas retains its existing nested `1.3.0-dev.106` dependency.
- Shared adapter regressions: 53 tests passed. App lifecycle and host-origin resolution: 39 tests passed using the real published SDK. Migrated save/auth consumers and credential requests: 83 focused tests passed; the toolset popup's 17 tests also passed with real parent-source fixtures.
- Full `npm test`: 97 files / 977 tests passed. Coverage: statements 91.89%, branches 83.52%, functions 90.27%, lines 92.81%; all 70% thresholds passed.
- `npm run typecheck`, `npm run lint`, and `npm run build`: passed. Production build reports its non-blocking chunk-size warning.
- Prettier on all touched files and `git diff --check`: passed.
- Strict OpenSpec change validation and all 20 current specs: passed. All eight changed/added requirement blocks match the synchronized main specs.
- Five-axis cross-review of lifecycle and shared protocol boundaries found no blocking issue. No browser session against deployed Chat/Admin was run; compatibility is covered by real-SDK message and consumer regressions.
