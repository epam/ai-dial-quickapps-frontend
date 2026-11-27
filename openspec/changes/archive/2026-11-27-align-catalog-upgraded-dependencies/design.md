# Design

## Context

See proposal.md. The updated chat API DTO has provider only on model details, and chat-hooks maps that field only for models. The toolset Overview tests use a legacy catalog-property provider. Vitest externalizes the updated canvas package, allowing Node to encounter its CSS import directly.

## Goals / Non-Goals

**Goals:** Keep the existing shared catalog data pipeline and exercise it using current DTO shapes; make the unchanged canvas tests load through Vitest's transform pipeline.

**Non-Goals:** Restore a provider field the API no longer supplies, replace the catalog mapper, or alter the production bundler.

## Decisions

- Update toolset fixtures and assertions to test supported fields such as license and hosted-by; add model-provider coverage using `modelDetails.provider`. This preserves meaningful mapping assertions instead of merely deleting failures. Retaining legacy expectations would contradict both the DTO and catalog.
- Configure Vitest to inline the attachment-canvas dependency, and verify that Vite handles its CSS and any transitive imports. Keep the real module where tests currently depend on it; blanket mocks would hide regressions. If a transitive package also needs inlining, constrain the setting to the minimum necessary chain.
- Keep `useEntityDetails` as the state owner and preserve its memoization, loading and cancellation behavior. Existing translated labels, keyboard behavior and RTL layouts remain unchanged.

## Risks / Trade-offs

- [Older backends may still supply a toolset provider] → The upgraded shared mapper intentionally ignores it for catalog parity; rolling back the dependency restores prior mapping.
- [Inlining dependencies can alter test performance or expose further module issues] → Limit the inline scope and run the full coverage suite.

## Migration Plan

Ship the dependency update and test/spec alignment together. Revert both together if the dependency release must be rolled back. No data migration is needed.
