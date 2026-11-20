# Tasks

## 1. Group suggestions

- [x] 1.1 Add the three group suggestions (`image/*`, `text/*`, `application/*`, names `ANY-IMAGE`, `ANY-TEXT`, `ANY-APPLICATION`) in `src/constants/attachment-types.ts` and put them ahead of the concrete types in the list passed to `AttachmentsSection`
- [x] 1.2 Test the group suggestions: a constants test for their order, names and prefixes, and the `AttachmentsSection` test for the first suggestion passed to the kit field (typing, filtering and de-duplication of selected tags are ui-kit behaviour, covered by the unchanged mock-based tests)

## 2. Default max of 10

- [x] 2.1 Set `DEFAULT_MAX_INPUT_ATTACHMENTS` to `10` in `src/constants/quick-apps.ts`
- [x] 2.2 Update tests that assume `1`: `src/form/tests/quick-app-form.test.ts` and the `QuickApp2Form` / Attachments toggle tests (turn on, load with types and no max, invalid host max, seeded max survives save, user-saved `10` kept on switch-off)

## 3. Verification

- [x] 3.1 Run `npm run lint`, `npm run build` and the test suite
- [x] 3.2 Check in the running app that typing `image/` offers `image/*` first, the tag round-trips through save and the Edit JSON popup, and turning the switch on shows max `10`
