## Architecture

Single-page React 19 app built with Vite, no monorepo — a pure static SPA served by
[chat-api](https://github.com/epam/ai-dial-chat)'s own server (see `docs/TRANSITION_PLAN.md`
Phase 2). This app has no server-side code of its own: auth and every DIAL entity call go
through chat-api's `/api/v1/*` REST surface via the typed `@epam/ai-dial-chat-api-client`
package (`src/utils/chat-api-client.ts`), not through a route handler in this repo. All source
lives under `src/`:

- `main.tsx` — the entry point: providers, `react-router` routes (`/` → `App.tsx`, `/signin/complete` →
  `pages/SignInCompletePage.tsx`, the popup sign-in flow's landing page).
- `App.tsx` — the root route component — an iframe-embedded app that communicates with its host
  via `postMessage`.
- `pages/` — top-level route components other than the root (currently just the sign-in popup).
- `components/` — React components. Shared reusables go in `components/common/`; form-specific components go in `components/QuickApp2Form/`.
- `context/` — React context providers (`AppContext`, `DataContext`, `AuthContext`, `ThemeContext`).
- `form/` — `react-hook-form` schema definitions and form data builders (validated with `zod`).
- `hooks/` — Custom React hooks.
- `i18n/` — i18next setup and locale JSON files (namespaces: `marketplace`, `common`, `settings`, `chat`).
- `types/` — TypeScript types, interfaces, and enums.
- `utils/` — Pure utility functions, including the chat-api client layer (`chat-api-client.ts`,
  `chat-api-fetch.ts`, `auth-api.ts`, `dialClient.ts`, `dial-files-api.ts`, `user-config.ts`).
- `constants/` — App-wide constants including i18n key enums.

Use the `@/*` path alias (resolves to `src/`) for all imports that would otherwise require multiple `../` traversals.

## Commands

- `npm run dev` — start development server
- `npm run build` — type-check and build
- `npm run lint` — run ESLint

## Spec-driven development (OpenSpec)

This repo uses [OpenSpec](https://github.com/Fission-AI/OpenSpec) for spec-driven development. See `docs/TRANSITION_PLAN.md` (Phase 1) and `docs/TECH_DEBT.md` for why and the rollout status.

- `openspec/config.yaml` — schema, repo context, and the "Specs organization" naming rules.
- `openspec/specs/` — the current, agreed behaviour, one capability per folder. Written so far: `host-integration`, `auth`. Not every capability has a spec yet — `docs/TECH_DEBT.md`'s "OpenSpec spec creation candidates" list is the first place to check before adding a new spec-id.
- `openspec/changes/` — in-flight change proposals (design + delta specs + tasks) before they're archived into `openspec/specs/`.

**New work starts from a spec change, not from code:**

1. Explore the idea first if it's still fuzzy — `openspec-explore`.
2. Propose the change — `openspec-propose` — which generates the design, delta specs and task breakdown together.
3. Implement the tasks — `openspec-apply-change`.
4. Once implemented and reviewed, sync or archive — `openspec-sync-specs` / `openspec-archive-change`.

If a change touches source files under an area listed in `docs/TECH_DEBT.md`'s candidates list and that capability has no spec yet, writing or extending the spec is in scope for the change — not deferred to "someday".

## Skill routing

Use these local skills for specific workflows:

- `.claude/skills/code-review-and-quality/SKILL.md` — quality pass before merge or on explicit review requests
- `.claude/skills/feature-research/SKILL.md` — broad feature research and trade-off analysis before implementation
- `.claude/skills/figma/SKILL.md` — translating Figma designs into React components
- `.claude/skills/openspec-explore/SKILL.md` — think through an idea or requirement before proposing a change
- `.claude/skills/openspec-propose/SKILL.md` — propose a new change (design + delta specs + tasks) from a description
- `.claude/skills/openspec-apply-change/SKILL.md` — implement the tasks of an in-progress OpenSpec change
- `.claude/skills/openspec-sync-specs/SKILL.md` — sync a change's delta specs into `openspec/specs/` without archiving
- `.claude/skills/openspec-archive-change/SKILL.md` — finalize and archive a completed change

Default behavior:

- New feature or behaviour work starts from an OpenSpec change (see above), not straight from code.
- Before merge (or on explicit review requests), run the five-axis quality review.

## TypeScript module imports

- In `.ts` and `.tsx` source files, omit `.js`, `.jsx`, `.ts`, and `.tsx` from module specifiers. Write `@/utils/api` or `./Component`, not `@/utils/api.ts`.
- Keep extensions that identify non-code resources: `.css`, `.json`, image files.
- `tsconfig.json` uses `moduleResolution: "bundler"`. Do not change it to `node16`/`nodenext` to satisfy `.js` specifiers.

## TypeScript enums

Prefer string enums for named finite sets of statuses, modes, variants, or lifecycle states over string-literal union types:

```ts
// Preferred
enum UploadStatus {
  Idle = 'idle',
  Loading = 'loading',
}

// Avoid for reused, exported, or logic-compared values
type UploadStatus = 'idle' | 'loading';
```

Place enums in `src/types/` or `src/constants/`.

## RTL and Arabic language support

All UI must support Arabic (`ar`) and any other right-to-left locale. Arabic changes the visual direction of the entire UI.

The `<html dir>` attribute must be set dynamically from `src/components/I18nProvider.tsx` (mounted in `main.tsx`) when the active locale is RTL. See `.claude/rules/rtl.md` for the full ruleset — it applies to every file.

## @epam/ai-dial-ui-kit MCP tools

Use `searchEntity(entity, query?)` and `getEntityDetails(entity, name?)` for all UI kit discovery and documentation. **Never** use `grep`, `glob`, or `find` to discover components — they miss type information and examples.

When you encounter errors after a ui-kit upgrade:

1. Check the installed version in `package.json` (`@epam/ai-dial-ui-kit`).
2. Read `node_modules/@epam/ai-dial-ui-kit/dist/CHANGELOG.md` for `### Breaking Changes` entries.
3. Follow migration guides at `node_modules/@epam/ai-dial-ui-kit/dist/migration-guides/<version>/`.
4. Use `getEntityDetails("component", "DialXxx")` to confirm the current prop signature before applying a fix.
