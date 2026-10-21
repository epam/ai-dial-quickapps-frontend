# Baseline (Tailwind CSS 3.4.19)

Recorded on `chore/migrate-tailwind-v4` before any code change (tasks 1.1–1.3).

## 1.1 Browser support and ui-kit

- Tailwind 4 needs Safari 16.4+, Chrome 111+, Firefox 128+.
- `@epam/ai-dial-ui-kit` installed: `0.16.0-dev.22`. Its `styles.css` is **already built with Tailwind v4**
  and targets the same browser floor (see its `CHANGELOG.md` and
  `migration-guides/0.16.0/tailwind-v4-stylesheet.md`).
- ui-kit peer dependencies list no `tailwindcss` (only react, react-dom, monaco, md-editor, MCP sdk), so there is
  no v3 pin to conflict with. Its own devDependency is `tailwindcss ^4.3.3`.
- Still to confirm: the host (ai-dial-chat / admin) browser targets are not below the floor above.
- ui-kit v4 behaviours that affect this app's visual pass (task 4.2):
  - variant utilities (`hover:`, `focus-visible:`, `mobile:` …) now live inside `@layer ui`, so unlayered
    host CSS always beats them; `hover:` applies only where `(hover: hover)` matches;
  - preflight resets `margin`/`padding` on every element, makes `input`/`select`/`textarea` transparent with no
    radius, and `[hidden]` wins over display utilities.
- No unlayered `.dial-*`, `.ag-*` or md-editor override selectors were found in this app's own `.css`/`.scss`
  under `src/` (grep), so the layer-order risk is limited to third-party CSS imported in TS files
  (ag-grid, md-editor, file-manager); check those in 4.2.

## 1.3 Build output (`npm run build`, Vite 8)

| CSS asset (dist/assets) | Size | Gzip |
|---|---|---|
| `index-*.css` (app + Tailwind) | 335,465 B | 55,251 B |
| `MarkdownEditor-*.css` | 34,066 B | 6,049 B |
| `PdfContent-*.css` | 18,006 B | 4,837 B |
| `SkillFilePreview-*.css` | 10,793 B | 3,278 B |
| `katex-*.css` | 29,802 B | 8,011 B |

Main JS chunk `index-*.js`: 4,636.44 kB (gzip 1,193.90 kB). Build succeeded in ~9.8 s.
Compare `index-*.css` after the migration; the v4 build also scans ui-kit dist via `@source`.

## 1.2 Screenshots

Not captured by this commit. Per the commit plan they stay out of git and are attached to the PR:
light, dark, mobile (≤1279px) and `dir=rtl` for the editor, catalog filter, popups and login.

## Verification after the migration

- `npm run build`, `typecheck`, `eslint src` and `vitest` (873 tests) pass; `npm ci --dry-run` accepts the lockfile.
- RTL: in a page using the built CSS, `rtl:scale-x-[-1]` applies with `dir=rtl` (any `lang`), and with `lang=ar` under `dir=ltr`; it is off for `ltr`/`en`. Same as the stage-1 build.
- CSP nonce: `dist/index.html` still has `nonce="__DIAL_CSP_NONCE__"` on the script, stylesheet link and `csp-nonce` meta, and no inline `<style>`.
- `blocklist` (`[-:=]`) is not needed: no such selector is emitted.
- The kit's and file manager's utilities are `@layer ui`, so the app's unlayered preflight zeroed their spacing until
  their components were added as `@source` (as ai-dial-chat does).
- Default-palette selectors such as `bg-red-500` exist in the build only because kit/file-manager components use them; `src` uses none.
- Not run: Docker image build (no daemon locally).
