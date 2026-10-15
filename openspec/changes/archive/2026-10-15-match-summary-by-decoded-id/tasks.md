## 1. Fix

- [x] 1.1 In `fetchApplicationSummary`, match the listing entry by `decodeDialPath(d.id)`. Add
      the "Id with special characters" test.
  - Verification: `npx vitest run src/utils/tests`.
- [x] 1.2 Mark the TECH_DEBT item fixed; `openspec validate match-summary-by-decoded-id --strict`.
