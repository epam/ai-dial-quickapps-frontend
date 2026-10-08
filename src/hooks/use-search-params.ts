import { useMemo } from 'react';

// A snapshot of the query string taken on first render. The app has no client-side navigation
// that changes the query (the host sets it once when it loads the iframe), so no listener is needed.
export const useSearchParams = (): URLSearchParams =>
  useMemo(() => new URLSearchParams(window.location.search), []);
