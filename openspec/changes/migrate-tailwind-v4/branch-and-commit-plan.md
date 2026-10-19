# Branch and commit plan

Branch: `chore/migrate-tailwind-v4`, cut from `development` (independent of `refactor/remove-readonly-prop`).
One PR. Every commit must leave `npm run build`, `lint`, `typecheck` and `test` green so the history stays bisectable.
Commit messages follow the repo style; reference the issue neutrally (`Issue #NNN`), never `closes/fixes`.

Tasks refer to `tasks.md`.

| # | Commit | Tasks | Contents |
|---|--------|-------|----------|
| 1 | `docs(tailwind): propose migration to Tailwind CSS 4` | – | `openspec/changes/migrate-tailwind-v4/` (proposal, design, tasks, this plan). No code. |
| 2 | `chore(tailwind): record v3 baseline` | 1.1–1.3 | Notes in the change folder: browser-support and ui-kit peer-range findings, baseline CSS size. Screenshots stay out of git (attach to the PR). |
| 3 | `build(tailwind): switch to tailwindcss 4 via @tailwindcss/vite` | 2.1–2.4 | Install `tailwindcss@4` and `@tailwindcss/vite`, drop `autoprefixer`. Register the plugin in `vite.config.ts`, delete `postcss.config.mjs`. Add plain-CSS entry with `@import 'tailwindcss'`, `@source` and `@config './tailwind.config.js'` (stage 1). Fold `index.scss` into it, replace `$font-family`, drop `sass` if unused. Class names unchanged. |
| 4 | `refactor(tailwind): port screens and animations to CSS` | 2.5 | `mobile`/`desktop` as `@custom-variant`; `fadeIn`/`spin-steps`, shadows, 4px radius and 1px outline defaults ported. |
| 5 | `refactor(tailwind): apply v4 utility renames` | 3.1 | Output of `npx @tailwindcss/upgrade`, then hand review (shadow/rounded/outline/ring, `!` suffix, opacity, default border colour). Mechanical rename only; keep it separate for easy review. |
| 6 | `refactor(tailwind): replace tailwind.config.js with @theme/@utility tokens` | 3.2–3.3 | Stage 2: tokens to `@theme`/`@utility` (design decision 3B), delete `tailwind.config.js`, update the `eslint.config.mjs` comment, re-check the 400px Filter overlay and the `blocklist` case. Split into two commits (colours, then the rest) if the diff is large. |
| 7 | `fix(tailwind): visual parity fixes` | 4.1–4.3 | Only if the screenshot comparison finds regressions: layer-order overrides for ag-grid / md-editor / file-manager, RTL, CSP nonce, Docker build. Skip if none. |
| 8 | `docs: update styling stack to Tailwind CSS 4` | 5.1 | `openspec/config.yaml`, README/docs mentions, `docs/TECH_DEBT.md` if relevant. |

## Notes
- Commits 3 and 5 are the risky ones. If 5 gets noisy, review the `upgrade` tool output before hand edits and commit them separately.
- Commit 6 may move to a follow-up PR if stage 1 (`@config`) is already stable; design.md allows this. Then commit 8 describes the interim state.
- Run the verification list (4.1–4.3) after commits 3, 5 and 6, not only at the end.
- Before merge, run the five-axis review (`code-review-and-quality`).
- Rollback: revert the PR.
