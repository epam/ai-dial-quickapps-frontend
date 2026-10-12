// Loaded by vitest before every test file (see `setupFiles` in vitest.config.ts).

// Tells React that `act()` is available, so it flushes updates inside it and
// warns about state updates that escape it.
(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;
