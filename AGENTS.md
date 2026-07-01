<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

<!-- END:nextjs-agent-rules -->

## Architecture

Single Next.js 16 app (App Router), no monorepo. All source lives under `src/`:

- `app/` — App Router pages and layouts. The main feature lives at `app/editor/` — an iframe-embedded app that communicates with its host via `postMessage`.
- `components/` — React components. Shared reusables go in `components/common/`; form-specific components go in `components/QuickApp2Form/`.
- `context/` — React context providers (`AppContext`, `DataContext`).
- `form/` — `react-hook-form` schema definitions and form data builders (validated with `zod`).
- `hooks/` — Custom React hooks.
- `i18n/` — i18next setup and locale JSON files (namespaces: `marketplace`, `common`, `settings`, `chat`).
- `types/` — TypeScript types, interfaces, and enums.
- `utils/` — Pure utility functions.
- `constants/` — App-wide constants including i18n key enums.

Use the `@/*` path alias (resolves to `src/`) for all imports that would otherwise require multiple `../` traversals.

## Commands

- `npm run dev` — start development server
- `npm run build` — type-check and build
- `npm run lint` — run ESLint

## Skill routing

Use these local skills for specific workflows:

- `.claude/skills/code-review-and-quality/SKILL.md` — quality pass before merge or on explicit review requests
- `.claude/skills/feature-research/SKILL.md` — broad feature research and trade-off analysis before implementation
- `.claude/skills/figma/SKILL.md` — translating Figma designs into React components

Default behavior:

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
  Idle = "idle",
  Loading = "loading",
}

// Avoid for reused, exported, or logic-compared values
type UploadStatus = "idle" | "loading";
```

Place enums in `src/types/` or `src/constants/`.

## RTL and Arabic language support

All UI must support Arabic (`ar`) and any other right-to-left locale. Arabic changes the visual direction of the entire UI.

The `<html dir>` attribute must be set dynamically in `src/app/layout.tsx` when the active locale is RTL. See `.claude/rules/rtl.md` for the full ruleset — it applies to every file.

## @epam/ai-dial-ui-kit MCP tools

Use `searchEntity(entity, query?)` and `getEntityDetails(entity, name?)` for all UI kit discovery and documentation. **Never** use `grep`, `glob`, or `find` to discover components — they miss type information and examples.

When you encounter errors after a ui-kit upgrade:

1. Check the installed version in `package.json` (`@epam/ai-dial-ui-kit`).
2. Read `node_modules/@epam/ai-dial-ui-kit/dist/CHANGELOG.md` for `### Breaking Changes` entries.
3. Follow migration guides at `node_modules/@epam/ai-dial-ui-kit/dist/migration-guides/<version>/`.
4. Use `getEntityDetails("component", "DialXxx")` to confirm the current prop signature before applying a fix.
