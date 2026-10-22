# Proposal

## Why

The app is on Tailwind CSS 3.4 (`package.json`, `tailwind.config.js`, `postcss.config.mjs`,
`src/index.scss` with `@tailwind` directives). Tailwind 3 is in maintenance; v4 is the supported
line, has a faster engine, a first-party Vite plugin (the app already builds with Vite 8) and
CSS-first configuration. Staying on v3 also widens the gap with `@epam/ai-dial-ui-kit` and
ai-dial-chat as they move forward. The workaround comment in `tailwind.config.js` ("Tailwind 3 can't
apply `/80` opacity modifiers to `var()` colours") goes away with v4's `color-mix` based opacity.

## What Changes

- Upgrade `tailwindcss` to v4 and add `@tailwindcss/vite`; remove `autoprefixer` and
  `postcss.config.mjs` (v4 handles vendor prefixes and imports itself).
- Replace `tailwind.config.js` with CSS-first config (`@theme` / `@custom-variant` / `@source`)
  that keeps every existing token (colours, shadows, `mobile`/`desktop` screens, `fadeIn` and
  `spin-steps` animations, 4px default radius, 1px default outline).
- Replace `@tailwind base/components/utilities` in `src/index.scss` with `@import 'tailwindcss'`,
  keeping the `html, body, #root` base styles and the 400px Filter overlay override.
- Re-point content scanning (`index.html`, `src/**`, `@epam/ai-dial-ui-kit` dist) via `@source`.
- Fix renamed/removed v3 utilities in `src/**` (shadow/rounded/blur/outline/ring scale renames,
  `outline-none` → `outline-hidden`, default border colour, `!important` syntax, etc.).
- Update the "Styling: Tailwind CSS 3" line in `openspec/config.yaml` and any docs mentioning v3.
- **No intended visual or behavioural change.**

## Capabilities

### New Capabilities
None.

### Modified Capabilities
None — build tooling only; no externally observable behaviour changes (`skip_specs: true`). The
`theming` spec describes CSS custom properties from chat-api, which are unchanged.

## Impact

- Files: `package.json`/lockfile, `vite.config.ts`, `src/index.scss`, `tailwind.config.js` (deleted),
  `postcss.config.mjs` (deleted), `eslint.config.mjs` (tailwind.config.js override comment), class names in `src/**`.
- Dependencies: `tailwindcss` 3 → 4, `+@tailwindcss/vite`, `-autoprefixer`. `@epam/ai-dial-ui-kit`
  ships precompiled `styles.css`; this app's Tailwind build also scans its dist for utilities
  (current `content` entry), so that must keep working.
- Browser support: v4 needs Safari 16.4+, Chrome 111+, Firefox 128+. Confirm against host (ai-dial-chat/admin) targets.
- i18n: no new strings. RTL: none — logical utilities (`ms-*`, `ps-*`, `start-*`, `rtl:`) are unchanged in v4;
  verify the `rtl:` variant still follows `dir` on `<html>`.
- Non-goals: redesign, token renames, moving off SCSS beyond what v4 requires, changing ui-kit.
- Alternatives: (a) stay on v3 — zero risk, growing debt; (b) v4 via the official `@tailwindcss/upgrade`
  tool then manual review (**chosen**); (c) v4 via PostCSS plugin — works, but the Vite plugin is faster and recommended.
- Rollback / compat: not breaking for consumers (static SPA). Revert = revert the PR; no data or API changes.
- Acceptance: `npm run build`, `lint`, `typecheck`, `test` pass; visual comparison of key screens
  (light/dark, mobile ≤1279px, RTL via `dir=rtl`) shows no regressions; CSP nonce build still works.
