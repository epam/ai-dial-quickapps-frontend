import { useMemo } from 'react';

// Next's `useSearchParams` replacement: every call site here only reads the URL once (there is
// no client-side navigation in this app), so a plain snapshot is enough — no listener needed.
export const useSearchParams = (): URLSearchParams =>
  useMemo(() => new URLSearchParams(window.location.search), []);
