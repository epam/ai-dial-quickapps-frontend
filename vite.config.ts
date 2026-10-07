import react from '@vitejs/plugin-react';
import path from 'path';
import ts from 'typescript';
import { defineConfig, Plugin } from 'vite';

/**
 * chat-api's stricter CSP can run in `CSP_MODE=enforce`, a nonce-based
 * `script-src`/`style-src` policy rather than a blanket `'self'`. Stamp
 * every built `<script>`/`<link
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
      .replace(/<link rel="stylesheet" /g, '<link rel="stylesheet" nonce="__DIAL_CSP_NONCE__" ')
      .replace('</head>', '  <meta property="csp-nonce" nonce="__DIAL_CSP_NONCE__">\n  </head>');
  },
});

const isTrustedStyleProducer = (id: string) => {
  const modulePath = id.split('?')[0].replaceAll('\\', '/');
  return modulePath.endsWith('.js') && modulePath.includes('/node_modules/@epam/ai-dial-ui-kit/dist/');
};

/**
 * ui-kit bundles its own ag-grid copy, which injects its theme as `<style>`
 * elements; `provideGlobalGridOptions({ styleNonce })` doesn't reach that copy
 * and `ListView` exposes no grid options. Under `CSP_MODE=enforce` those styles
 * are blocked (and ag-grid then warns about missing `--ag-*` values).
 * Mirrors ai-dial-chat's `tools/vite/csp-nonce.mjs`: rewrite literal
 * `createElement('style')` calls in ui-kit's dist to take the nonce from the
 * `csp-nonce` meta tag stamped above. Nothing else is touched.
 */
const addTrustedStyleNonces = (code: string, id: string): string | null => {
  if (!isTrustedStyleProducer(id) || !code.includes('createElement')) return null;
  const source = ts.createSourceFile(id, code, ts.ScriptTarget.Latest, true);
  const edits: { start: number; end: number; replacement: string }[] = [];
  const visit = (node: ts.Node) => {
    if (
      ts.isCallExpression(node) &&
      ts.isPropertyAccessExpression(node.expression) &&
      node.expression.name.text === 'createElement' &&
      node.arguments.length === 1 &&
      ts.isStringLiteral(node.arguments[0]) &&
      node.arguments[0].text === 'style'
    ) {
      const doc = node.expression.expression.getText(source);
      edits.push({
        start: node.getStart(source),
        end: node.end,
        replacement: `((doc) => Object.assign(doc.createElement('style'), { nonce: doc.querySelector('meta[property="csp-nonce"]')?.nonce ?? '' }))(${doc})`,
      });
      return;
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  if (!edits.length) return null;
  let result = code;
  for (const { start, end, replacement } of edits.reverse()) {
    result = result.slice(0, start) + replacement + result.slice(end);
  }
  return result;
};

const trustedStyleNonce = (): Plugin => ({
  name: 'dial-trusted-style-nonce',
  enforce: 'pre',
  transform(code, id) {
    const transformed = addTrustedStyleNonces(code, id);
    return transformed == null ? null : { code: transformed, map: null };
  },
});

/**
 * TEMPORARY dev-only mock for previewing the logged-out LoginScreen without a backend.
 * Opt in with `MOCK_AUTH=1`: answers the auth endpoints itself (no session, one
 * `keycloak` provider, a stub login page) before the `/api` proxy sees them.
 * Open `/?authProvider=keycloak`.
 */
const mockLoggedOutAuth = (): Plugin => ({
  name: 'dial-mock-logged-out-auth',
  apply: 'serve',
  configureServer(server) {
    server.middlewares.use((req, res, next) => {
      const url = req.url ?? '';
      if (url.startsWith('/api/v1/auth/me')) {
        res.statusCode = 401;
        res.setHeader('Content-Type', 'application/json');
        res.end('{"message":"Unauthorized"}');
        return;
      }
      if (url.startsWith('/api/v1/auth/providers')) {
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify([{ id: 'keycloak', label: 'Keycloak' }]));
        return;
      }
      if (url.startsWith('/api/v1/auth/login/')) {
        res.setHeader('Content-Type', 'text/html');
        res.end('<h3>Mock IdP login page</h3><p>Close this window to return.</p>');
        return;
      }
      next();
    });
  },
});

// Mirrors vitest.config.ts's react plugin + `@` alias — each of Vite/Vitest reads its own
// config file, so this can't be deduplicated into a single shared object.
export default defineConfig({
  plugins: [
    react(),
    cspNoncePlaceholder(),
    trustedStyleNonce(),
    ...(process.env.MOCK_AUTH ? [mockLoggedOutAuth()] : []),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 4600,
    proxy: {
      // Local development contract: the QuickApps BFF runs on 5001 while the
      // deployable Docker image defaults to 5000. Start it locally via
      // `npm run start:api:dev` (or `npm run docker:run`) — see README.md.
      '/api': {
        target: 'http://localhost:5001',
        changeOrigin: true,
      },
    },
  },
  preview: {
    port: 4600,
  },
});
