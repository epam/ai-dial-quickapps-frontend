// Configures @monaco-editor/react (and, transitively, every ui-kit component
// that renders Monaco — JsonEditor, MarkdownEditor's JSON mode) to load
// Monaco from this app's own bundle instead of the cdn.jsdelivr.net default.
// Required for CSP `script-src 'self'` (docs/TRANSITION_PLAN.md §2.6) — the
// loader and worker setup are process-wide singletons, so importing this
// once at app startup (see main.tsx) covers every Monaco instance.
import { loader } from '@monaco-editor/react';
// `monaco-editor`'s bare "." export (`editor.main.js`) drags in every bundled
// language's syntax highlighting and features. This app only edits JSON
// (DialJsonEditor, the Markdown editor's JSON mode) — import the lean editor
// core plus just the JSON language contribution instead.
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
// (e.g. the ui-kit's DialJsonEditor) keep working.
(monaco.languages as { json?: typeof jsonContribution }).json = jsonContribution;

// Only json/markdown editing is used in this app (DialJsonEditor, the
// Markdown editor's JSON mode) — add more worker cases here if a future
// editor mode needs e.g. TypeScript or CSS language services.
self.MonacoEnvironment = {
  getWorker(_workerId, label) {
    if (label === 'json') return new jsonWorker();
    return new editorWorker();
  },
};

loader.config({ monaco });
