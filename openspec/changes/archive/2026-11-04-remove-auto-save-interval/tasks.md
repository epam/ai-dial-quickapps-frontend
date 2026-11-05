## 1. Code

- [x] 1.1 Remove the interval `useEffect` and the `AUTO_SAVE_INTERVAL_MS` import from `src/components/EditorClient/EditorClient.tsx`
- [x] 1.2 Remove `AUTO_SAVE_INTERVAL_MS` from `src/constants/editor.ts`
- [x] 1.3 Check `hasSavedOnce` state is still used (host `TRIGGER_AUTO_SAVE` gating); drop only what became unused

## 2. Tests

- [x] 2.1 Delete the "EditorClient auto-save interval" suite and the `AUTO_SAVE_INTERVAL_MS` import in `src/components/EditorClient/tests/EditorClient.test.tsx`
- [x] 2.2 Add a test: a dirty form with fake timers advanced well past 30 s dispatches no save event
- [x] 2.3 Confirm the `TRIGGER_AUTO_SAVE` tests still pass

## 3. Docs and specs

- [x] 3.1 Update the auto-save paragraph in `README.md` (host-triggered only)
- [x] 3.2 Update the "Auto-save" row in `docs/quickapps-migration-guide.md`
- [x] 3.3 Edit the Purpose paragraph of `openspec/specs/application_editing/spec.md` (line 11) to drop "the auto-save interval"
- [x] 3.4 Run `openspec validate remove-auto-save-interval --strict`

## 4. Verify

- [x] 4.1 `npm run lint`, `npm run build` and the unit tests pass
- [x] 4.2 Confirm with the ai-dial-chat team whether the host relied on the timer or sends `TRIGGER_AUTO_SAVE` itself
