// Configures @monaco-editor/react to load Monaco from this app's own bundle
// instead of the cdn.jsdelivr.net default. Required for CSP `script-src 'self'`.
// The loader and worker setup are process-wide singletons. The Edit JSON
// editor is the only Monaco user (ui-kit 0.16 dropped its own), so it imports
// this module and Monaco loads with that lazy chunk, not at app startup. A new
// Monaco user must import this module too, before it renders an editor.
import { loader } from '@monaco-editor/react';
// `monaco-editor`'s bare "." export (`editor.main.js`) drags in every bundled
// language's syntax highlighting and features. This app only edits JSON
// (the Edit JSON editor) — import the lean editor core plus just the JSON
// language contribution instead.
import * as monaco from 'monaco-editor/esm/vs/editor/editor.api.js';
import * as jsonContribution from 'monaco-editor/esm/vs/language/json/monaco.contribution.js';
// Vite's `?worker` suffix bundles each of these as a proper Worker script
// instead of needing a dedicated Monaco Vite plugin.
import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker';
import jsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker';

// `editor.api.js` alone doesn't expose `monaco.languages.json` — that
// assignment normally happens inside `editor.main.js` (the full "all
// languages" bundle we're deliberately not importing). Replicate just that
// one assignment so consumers reading `monaco.languages.json.jsonDefaults`
// (the Edit JSON editor's `beforeMount`) keep working.
(monaco.languages as { json?: typeof jsonContribution }).json = jsonContribution;

// Only JSON editing is used in this app (the Edit JSON editor) — add more
// worker cases here if a future editor mode needs e.g. TypeScript or CSS
// language services.
self.MonacoEnvironment = {
  getWorker(_workerId, label) {
    if (label === 'json') return new jsonWorker();
    return new editorWorker();
  },
};

loader.config({ monaco });
