## 1. Implementation

- [x] 1.1 Add `getClientTimeZone` in `src/utils/get-client-time-zone.ts`.
- [x] 1.2 Attach `X-Timezone` in `chatApiFetch`, first request and CSRF retry.
- [x] 1.3 Add tests in `src/utils/tests/get-client-time-zone.test.ts` and
      `src/utils/tests/chat-api-fetch.test.ts`.
  - Verification: `npx vitest run src/utils/tests`, then lint and build.

## 2. Follow-ups (not in this change)

- [ ] 2.1 Confirm header name and forwarding with the backend team (#649).
- [ ] 2.2 If the backend adds `default_timezone`, add the editor field, schema and i18n keys.
- [ ] 2.3 Check whether ai-dial-chat (the completions sender) needs the same header.
