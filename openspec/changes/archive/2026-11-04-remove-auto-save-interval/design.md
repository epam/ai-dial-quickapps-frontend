## Context

`EditorClient` runs a `setInterval` (30 s) once `appState` exists and `hasSavedOnce` is true. It
dispatches the same window event as the host's `TRIGGER_AUTO_SAVE`, so the save path, gating and
outcome messages are shared.

## Decisions

- **Delete the interval effect and `AUTO_SAVE_INTERVAL_MS` only.** The shared path (`isAutoSave`,
  `shouldIgnoreDirty`, `hasSavedOnce`, `AUTO_SAVE_COMPLETE`) stays because the host still sends
  `TRIGGER_AUTO_SAVE` and may wait for `AUTO_SAVE_COMPLETE`.
- **No protocol change.** Removing the message would need a matching ai-dial-chat change.
- **`hasSavedOnce` stays.** It still gates the host's `TRIGGER_AUTO_SAVE`.

## Risks

- Users lose the 30 s safety net. Mitigation: the host can send `TRIGGER_AUTO_SAVE`; confirm
  with the chat team whether it does.

## Alternatives considered

1. Keep the interval (status quo).
2. Remove the whole auto-save path including `TRIGGER_AUTO_SAVE`: cleaner, but needs a chat change.
