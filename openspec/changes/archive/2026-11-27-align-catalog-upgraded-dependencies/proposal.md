# Proposal

## Why

The DIAL 1.4 dependency update removed toolset and agent catalog provider mapping, while the catalog details spec and tests still expect it. Vitest also cannot load the updated attachment-canvas package's CSS imports, blocking CI.

## What Changes

- Align the catalog-details contract and test fixtures with the updated chat API and catalog mapper: only models expose the new top-level provider, while toolsets and agents no longer expose a catalog provider.
- Keep toolset authentication, vendor, license and hosted-by fields mapped and translated as before.
- Configure Vitest to transform the updated attachment-canvas dependency so its CSS imports do not prevent the skill preview tests from running.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `catalog-entity-details`: update the toolset details example and expected Overview to reflect the updated catalog API; cover model provider mapping.

## Impact

### Problem and solution

`src/hooks/use-entity-details.ts:44` already delegates details to the shared catalog hook; retaining that pipeline preserves parity with chat. Tests in `src/hooks/tests/use-entity-details.test.tsx:119` and the toolset popup test still use a provider field no longer included in the typed toolset DTO. `vitest.config.ts:12` owns the test environment and can handle dependency transformation without touching production behavior.

### Alternatives and scope

Preserving the obsolete toolset provider locally would diverge from the shared catalog and depend on data the updated API does not promise; aligning with the catalog is the smaller, correct option. No auth, host-integration, or API layer changes are planned. No new state, context, or user-visible strings are needed. RTL impact: none; this changes data expectations and test infrastructure, not layout.

### Non-goals

Changing the shared DIAL libraries, inventing provider values, redesigning catalog UI, or changing package versions.

### Acceptance criteria

- Toolset and agent fixtures reflect the current API and their Overview follows the shared mapper; model provider is still displayed when provided.
- Skill preview and canvas resolver test suites load and pass without masking their behavior.
- The full test suite, build, and lint pass. Changed files pass formatting checks; existing repository-wide formatting failures are reported without reformatting unrelated files.

### Compatibility and rollback

Toolsets and agents no longer show the former provider field, matching the upgraded chat API and catalog. Rolling back the dependency upgrade together with these test, configuration and spec changes restores the prior contract.
