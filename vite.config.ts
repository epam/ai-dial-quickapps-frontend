import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, Plugin } from 'vite';

/**
 * chat-api's stricter CSP (docs/TRANSITION_PLAN.md §2.6) can run in
 * `CSP_MODE=enforce`, a nonce-based `script-src`/`style-src` policy rather
 * than a blanket `'self'`. Stamp every built `<script>`/`<link
 * rel="stylesheet">` tag with a literal `__DIAL_CSP_NONCE__` placeholder
 * (matching ai-dial-chat's own `tools/vite/csp-nonce.mjs` convention) —
 * chat-api's static file server is expected to replace it with a real
 * per-request nonce before serving. A harmless no-op under a plain
 * `'self'` policy (dev, or `CSP_MODE=report-only`) since we never emit an
 * inline `<script>` for it to gate.
 */
const cspNoncePlaceholder = (): Plugin => ({
  name: 'dial-csp-nonce-placeholder',
  transformIndexHtml(html) {
    return html
      .replace(/<script /g, '<script nonce="__DIAL_CSP_NONCE__" ')
      .replace(/<link rel="stylesheet" /g, '<link rel="stylesheet" nonce="__DIAL_CSP_NONCE__" ');
  },
});

// Mirrors vitest.config.ts's react plugin + `@` alias — each of Vite/Vitest reads its own
// config file, so this can't be deduplicated into a single shared object.
export default defineConfig({
  plugins: [react(), cspNoncePlaceholder()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 4600,
    proxy: {
      // Points at the chat-api BFF this app will eventually run behind (see
      // docs/TRANSITION_PLAN.md §2.1/§2.3/§2.4). Nothing listens here yet, so
      // /api/* calls fail with a connection error until that lands — expected
      // for now.
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
  preview: {
    port: 4600,
  },
});
