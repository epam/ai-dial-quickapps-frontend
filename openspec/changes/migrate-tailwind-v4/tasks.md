# Tasks

## 1. Preparation
- [ ] 1.1 Confirm host browser support allows Chrome 111+/Safari 16.4+/Firefox 128+; check ui-kit peer deps for a Tailwind range (ui-kit part done, see `baseline.md`; host targets still to confirm)
- [ ] 1.2 Capture baseline screenshots (light, dark, mobile ≤1279px, `dir=rtl`) of editor, catalog filter, popups, login
- [x] 1.3 Record `npm run build` CSS size (see `baseline.md`)

## 2. Tooling
- [ ] 2.1 Install `tailwindcss@4` and `@tailwindcss/vite`; remove `autoprefixer`
- [ ] 2.2 Register plugin in `vite.config.ts`; delete `postcss.config.mjs`
- [ ] 2.3 Create plain-CSS entry (`@import 'tailwindcss'`, `@source` for index.html, src, ui-kit dist), import in `main.tsx`; fold `index.scss` into it (replace `$font-family`), drop `sass` if unused
- [ ] 2.4 Stage 1: load `tailwind.config.js` via `@config`; get build green with unchanged class names
- [ ] 2.5 Port `mobile`/`desktop` screens to `@custom-variant`; port `fadeIn`/`spin-steps`, shadows, 4px radius, 1px outline defaults

## 3. Class migration
- [ ] 3.1 Run `npx @tailwindcss/upgrade`; review utility renames by hand (shadow/rounded/outline/ring/`!`/opacity, default border colour)
- [ ] 3.2 Stage 2: replace `@config` with `@theme`/`@utility` tokens (design decision 3), delete `tailwind.config.js`, update `eslint.config.mjs` comment
- [ ] 3.3 Re-check the 400px Filter overlay override and the `blocklist` case

## 4. Verification
- [ ] 4.1 `npm run build`, `lint`, `typecheck`, `test` pass
- [ ] 4.2 Compare screenshots with baseline; check ag-grid/md-editor/file-manager layer-order overrides
- [ ] 4.3 Verify RTL (`dir=rtl`), CSP-nonce build and Docker image build

## 5. Docs
- [ ] 5.1 Update "Styling: Tailwind CSS 3" in `openspec/config.yaml`, README/docs mentions, and `docs/TECH_DEBT.md` if relevant
