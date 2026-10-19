# Design

## Context
Tailwind 3.4 via PostCSS (`tailwind.config.js`, `autoprefixer`), entry `src/index.scss` (Sass +
`@tailwind`/`@apply`). Theme overrides *replace* default `backgroundColor`, `borderColor`, `textColor`,
`stroke`, `divideColor`, `placeholderColor`, `gradientColorStops`; `fill`, shadows, screens, animation
are `extend`ed. Colours are `var(--token, fallback)` strings fed by chat-api themes (see `theming` spec).
`blocklist: ['[-:=]']` suppresses a bogus class candidate.

## Decisions
1. **Vite plugin, not PostCSS.** Add `tailwindcss()` from `@tailwindcss/vite` to `vite.config.ts`; delete
   `postcss.config.mjs`. Keep the custom `trustedStyleNonce`/CSP plugins untouched.
2. **Sass caveat.** v4 does not support Sass on the file containing `@import 'tailwindcss'`/`@theme`.
   Move the Tailwind entry to plain CSS (`src/index.css`, imported from `main.tsx`); the only Sass use is
   the `$font-family` variable, which becomes a CSS custom property. Remove `sass` if nothing else uses it (verify).
3. **Theme tokens.** v3 *replaced* colour scales per utility (bg/text/border share names like `primary`, `error`).
   v4's single `--color-*` namespace would collide. Options:
   (A) one prefixed `--color-*` namespace — renames classes everywhere (rejected, huge diff);
   (B) per-property `@utility` definitions keeping class names (**target**);
   (C) load the existing JS config via `@config` — fastest, legacy-but-supported (**stage 1 / fallback**).
   Plan: land v4 with (C), then convert to (B) in the same or a follow-up PR.
4. **Screens.** `mobile`/`desktop` → `@custom-variant mobile (@media (width <= 1279px))` and
   `desktop (@media (width >= 1280px))`.
5. **Opacity workaround.** The `backdrop` token's baked-in `color-mix` may become `bg-layer-base/80`
   only if visual parity is verified.
6. **Source scanning.** `@source` for `index.html`, `src`, and `node_modules/@epam/ai-dial-ui-kit/dist`
   (v4 skips node_modules by default). Re-check the `blocklist` case.
7. **Class renames** via `npx @tailwindcss/upgrade` on a branch, then manual review: `shadow-sm→shadow-xs`,
   `shadow→shadow-sm`, `rounded→rounded-sm` (app overrides DEFAULT radius to 4px — preserve), `outline-none→outline-hidden`,
   `ring→ring-3`, default `border`/`divide` colour now `currentColor`, `!` important suffix, `bg-opacity-*` removed.
8. **ESLint.** Only update the `tailwind.config.js` override comment in `eslint.config.mjs`.

## Risks
- ui-kit (`@epam/ai-dial-ui-kit` ^0.15.4) CSS/classes may assume v3 defaults → visual pass on ui-kit-heavy screens.
- Cascade layers: v4 emits `@layer`; unlayered third-party CSS (ag-grid, md-editor, file-manager) now beats utilities.
- Browser floor raised (see proposal).
- Confirm ui-kit does not pin a Tailwind 3 peer range.

## Rollback
Revert the PR; the lockfile restores v3. No runtime data/API impact.
