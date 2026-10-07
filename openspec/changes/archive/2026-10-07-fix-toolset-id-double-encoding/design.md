## Context

chat-api's canonical entity id has each path segment percent-encoded
(`toolsets/<bucket>/QA%20enc%20check__1.0.0`). The editor keeps ids decoded internally
and encodes them at the boundary:

| Boundary                                    | Helper           |
| ------------------------------------------- | ---------------- |
| `tool_sets[].deployment_id` on save         | `encodeApiUrl`   |
| chat-api path parameters (toolset login...) | `encodeDialPath` |
| Saved `deployment_id` → form value          | `decodeApiUrl`   |

The loaders were the one place that did not follow this convention after #149.

## Decision

Decode in the two mappers in `src/utils/dialClient.ts` — the single entry point for
toolsets, models and agents. Fixing it there keeps every consumer (selector modal,
`allEntitiesMap`, sign-in modal, link button) on one id form, instead of patching
individual writers.

`reference` for deployments follows the decoded id, matching the previous behaviour.

## Risks

- `decodeDialPath` throws on a malformed escape (`%E0`). chat-api produces the ids with
  `encodeURIComponent`, so this is not expected; pre-#149 code had the same exposure.
- The host receives a decoded `toolsetId` in the toolset login messages, as it did before
  #149. A host that started matching on the encoded form after #149 would need to decode.
