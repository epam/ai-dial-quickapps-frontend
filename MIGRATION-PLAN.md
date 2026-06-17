# Quick Apps Frontend — Migration Plan

## Context

QuickApp2 editor currently lives inside `ai-dial-chat`. The goal is to extract it into this standalone repository and integrate it back via `<iframe>`. Migration happens in two waves to reduce risk and allow the team to ship incrementally.

---

## Status

| Step  | Status |
| ----- | ------ |
| W1-1  | ✅ Done |
| W1-2  | ✅ Done |
| W1-3  | ✅ Done |
| W1-4  | ✅ Done |
| W1-5  | ✅ Done |
| W1-6  | ✅ Done |
| W1-7  | ✅ Done |
| W1-8  | ⬜ Todo |
| W1-9  | ⬜ Todo |
| W1-10 | ⬜ Todo |

---

## Wave 1 — Next.js app, iframe-able, feature-parity

**Goal:** A working Next.js app that renders the QuickApp2 editor and can be embedded as an iframe inside `ai-dial-chat`. No redesign of the tech stack — copy-port as much as possible to move fast.

### W1-1: Scaffold the Next.js app

- `npx create-next-app@latest` inside this repo with TypeScript, Tailwind, ESLint, **App Router**
- Configure `tsconfig.json` with `@/` alias pointing to `src/`
- Copy `prettier.config.js` and `eslint.config.mjs` structure from `ai-dial-chat`
- Add core dependencies:
  - `react-hook-form`, `zod` (form layer, already used by QuickApp2Form)
  - `@epam/ai-dial-shared`, `@epam/ai-dial-ui-kit` (external packages, same versions as chat)
  - `lodash-es`, `classnames`, `@tabler/icons-react`
  - `i18next` + `react-i18next` (App Router compatible; `next-i18next` is Pages Router only)
- Copy `tailwind.config.js` theme tokens from `ai-dial-chat` (colors, fonts, spacing)
- Copy the relevant i18n locale JSON keys (only `Translation.Marketplace`, `Translation.Chat`, `Translation.Settings` namespaces, only keys used by QuickApp2 components)
- Add an `app/editor/page.tsx` route as the single entry point — this is what gets iframed
- All QuickApp2 components are Client Components (`'use client'`) — no server component complexity

### W1-2: Move pure types and constants

No external dependencies, move as-is:

| Source in `ai-dial-chat`                | Destination                   |
| --------------------------------------- | ----------------------------- |
| `apps/chat/src/types/quick-apps.ts`     | `src/types/quick-apps.ts`     |
| `apps/chat/src/constants/quick-apps.ts` | `src/constants/quick-apps.ts` |

Keep copies of these in `ai-dial-chat` for now — other parts of chat (`share.epics.ts`, `application.epics.ts`, `useAgentMenuItems.ts`) still reference them and those stay in chat permanently (see Wave 1 cleanup section).

### W1-3: Move utilities

Extract the QuickApp2-specific functions from `apps/chat/src/utils/app/application.ts`:

- `isQuickApp2()`
- `isQuickApp2Editor()`
- `getQuickApp2Config()`
- `getQuick2AppDocumentUrl()`
- `getQuickAppItemNameFromConfig()`
- `migrateMCPToolsetIdName()`

Move into `src/utils/application.ts`. These only depend on the types from W1-2.

Move the QuickApp2 form logic from `apps/chat/src/components/AppsEditor/form.ts`:

- `QuickApp2Schema` (Zod schema)
- `QuickApp2Form` type
- `getQuickApp2FormData()`
- `getQuickApp2Toolsets()`

Move into `src/form/quickApp2Form.ts`.

### W1-4: Port shared UI components

The QuickApp2Form imports from `ai-dial-chat`'s common component library. Copy these into `src/components/common/`:

| Component in `ai-dial-chat`                          | Strategy                                                           |
| ---------------------------------------------------- | ------------------------------------------------------------------ |
| `Common/Forms/ControlledFormField` HOC               | Copy                                                               |
| `Common/Forms/Field`                                 | Copy                                                               |
| `Common/Forms/FieldErrorMessage` HOC                 | Copy                                                               |
| `Common/Forms/Label` HOC                             | Copy                                                               |
| `Common/MarkdownEditor/MarkdownEditor`               | Copy                                                               |
| `Common/MarkdownEditor/MarkdownEditorContainer`      | Copy                                                               |
| `Common/ToggleSwitch/ToggleSwitch`                   | Copy                                                               |
| `Common/MultipleComboBox`                            | Copy                                                               |
| `Common/AgentAndToolsetSelector/AgentAndToolsetChip` | Copy                                                               |
| `Marketplace/ToolsetLinkButton`                      | Copy                                                               |
| `AppsEditor/EditorForm/FormCollapsibleSection`       | Copy                                                               |
| `Chat/ChatSettings/Temperature` (TemperatureSlider)  | Copy                                                               |
| `Common/FilesSelector/FilesSelector`                 | Redesign: accept data as props instead of reading Redux (see W1-5) |

All `@epam/ai-dial-ui-kit` imports remain as direct npm dependencies — no copying needed.

### W1-5: Replace Redux store with React context + reducer

The QuickApp2Form reads from `ai-dial-chat`'s Redux store. Replace with React context + `useReducer` — no extra libraries needed, the scope is small enough that Redux/React Query would be overkill.

**Contexts to create:**

- `AppContext` — populated from the `INIT` postMessage on the `/editor` page; holds `{ token, dialApiHost, app, settings }`; never mutated after init
- `DataContext` — holds async data fetched on mount: `{ models, modelsMap, toolsets, toolsetsMap, files }`; managed by a `useReducer` with actions `MODELS_LOADED`, `TOOLSETS_LOADED`, `FILES_LOADED`, `FILES_LOADING`, `ERROR`

**Fetching strategy:** plain `fetch` calls via a thin `dialClient.ts` that reads `token` + `dialApiHost` from `AppContext`. Each async fetch is kicked off in a `useEffect` in the context provider on mount. No library needed.

| What chat's store provides                         | New approach                                                                                                         |
| -------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `ModelsSelectors.selectModels` / `selectModelsMap` | `DataContext` — fetched once on mount, dispatched as `MODELS_LOADED`                                                 |
| `ToolsetSelectors.selectToolsetsMap`               | `DataContext` — fetched once on mount, dispatched as `TOOLSETS_LOADED`                                               |
| `FilesSelectors` (file tree)                       | `DataContext` — fetched via DIAL listing API; `FILES_LOADING` / `FILES_LOADED` actions track pagination/lazy loading |
| `SettingsSelectors.selectIsPublishingEnabled`      | `AppContext.settings` — passed via postMessage `INIT`                                                                |
| `ApplicationSelectors.selectEditorApp`             | `AppContext.app` — passed via postMessage `INIT`                                                                     |
| `UISelectors.selectIsOverlay`                      | Always `false` — constant                                                                                            |
| `AuthSelectors` / token                            | `AppContext.token` — passed via postMessage `INIT`, attached as `Authorization: Bearer` on all DIAL API calls        |

Create a thin `dialClient.ts` that accepts `token` and `dialApiHost` and wraps `fetch` with the correct headers.

### W1-6: Move the QuickApp2Form components

Copy the entire `QuickApp2Form/` directory:

- `QuickApp2Form.tsx` — main form, swap Redux hooks for React Query hooks and context reads
- `AgentsAndToolsetsField.tsx`
- `AgentSkillsField.tsx`
- `CodeInterpreterField.tsx`
- `ConversationStartersField.tsx`
- `DialAppConfigurationModal.tsx`
- `ModelField.tsx`
- `StartersBehaviourRadioGroup.tsx`

For each component, replace `useAppSelector(SomeSelector.x)` with `useContext(DataContext)` or `useContext(AppContext)` reads from W1-5.

### W1-7: Build the `/editor` page and postMessage protocol

The `/editor` page is the single page the iframe loads. It:

1. On mount, sends `{ type: 'READY' }` to `window.parent`
2. Listens for `INIT` message, validates `event.origin` against `ALLOWED_ORIGIN` env var, populates `AppContext`
3. Renders the QuickApp2Form wrapped in `react-hook-form` `<FormProvider>`
4. Watches `formState.isDirty` and sends `{ type: 'DIRTY_STATE', payload: { isDirty } }` to parent on change
5. Listens for `TRIGGER_SAVE` / `TRIGGER_AUTO_SAVE` from parent, calls DIAL Core API to update the app, replies with `SAVE_SUCCESS` or `SAVE_ERROR`
6. On height changes (ResizeObserver on the form root), sends `{ type: 'HEIGHT_CHANGE', payload: { height } }`

**Full postMessage protocol:**

```
Parent → iframe:
  { type: 'INIT', payload: { app, token, dialApiHost, settings } }
  { type: 'TRIGGER_SAVE' }
  { type: 'TRIGGER_AUTO_SAVE', payload: { ignoreDirty?: boolean } }
  { type: 'RESET' }

Iframe → parent:
  { type: 'READY' }
  { type: 'DIRTY_STATE', payload: { isDirty: boolean } }
  { type: 'SAVE_SUCCESS', payload: { updatedApp } }
  { type: 'SAVE_ERROR', payload: { error: string } }
  { type: 'AUTO_SAVE_COMPLETE' }
  { type: 'HEIGHT_CHANGE', payload: { height: number } }
```

Both sides validate `event.origin` on every message. The iframe refuses messages from any origin not matching `ALLOWED_ORIGIN`.

### W1-8: Add iframe host component in `ai-dial-chat`

Create `apps/chat/src/components/AppsEditor/EditorForm/QuickApp2IframeHost.tsx`:

- Reads current app entity and auth token from existing Redux selectors (no store changes needed)
- Renders `<iframe src={process.env.NEXT_PUBLIC_QUICK_APPS_EDITOR_URL + '/editor'} />`
- Sends `INIT` after receiving `READY`
- Listens for `DIRTY_STATE` → dispatches to `ApplicationActions.setEditorDirty` (or equivalent)
- Listens for `SAVE_SUCCESS` → dispatches `ApplicationActions.updateSuccess`
- Forwards `onAutoSave` calls as `TRIGGER_AUTO_SAVE` postMessages
- Validates `event.origin === process.env.NEXT_PUBLIC_QUICK_APPS_EDITOR_URL` on all incoming messages

In `EditorForm.tsx`, replace:

```tsx
<QuickApp2Form onAutoSave={onAutoSave} />
```

with:

```tsx
<QuickApp2IframeHost onAutoSave={onAutoSave} />
```

Add env var to `ai-dial-chat`: `NEXT_PUBLIC_QUICK_APPS_EDITOR_URL`

### W1-9: Remove QuickApp2 editor code from `ai-dial-chat`

Once the iframe integration is verified in staging:

- Delete `apps/chat/src/components/AppsEditor/EditorForm/QuickApp2Form/`
- Remove QuickApp2 branches from `apps/chat/src/components/AppsEditor/form.ts`
- Remove ported utils from `apps/chat/src/utils/app/application.ts` **only if** no remaining chat code uses them — `useAgentMenuItems.ts`, `share.epics.ts`, and `application.epics.ts` still reference `isQuickApp2`, `getQuick2AppDocumentUrl`, etc., so those specific functions stay in chat

**What permanently stays in `ai-dial-chat`** (these are chat-side concerns, not editor UI):

| File                                     | Why it stays                                       |
| ---------------------------------------- | -------------------------------------------------- |
| `store/application/application.epics.ts` | App lifecycle, schema detection for all types      |
| `store/share/share.epics.ts`             | Share permissions — reads QuickApp2 context URLs   |
| `hooks/useAgentMenuItems.ts`             | Chat-side context menu                             |
| `types/quick-apps.ts`                    | Still consumed by the above                        |
| `constants/quick-apps.ts`                | Schema ID constants used by epics                  |
| `ReviewQuickApp2Section.tsx`             | Publication review lives in chat's publishing flow |

### W1-10: CI and deployment

- Add `Dockerfile` (multi-stage: `node:20-alpine` build + `nginx` or `node` serve)
- Add env vars: `ALLOWED_ORIGIN` (the `ai-dial-chat` hostname), `DIAL_API_HOST` is not needed server-side in Wave 1 since all DIAL calls are browser-direct using the token from postMessage
- Deploy independently
- Configure `ai-dial-chat` staging with `NEXT_PUBLIC_QUICK_APPS_EDITOR_URL` pointing to the new service

---

## Wave 2 — Drop Next.js, migrate to pure React SPA

**Goal:** Remove Next.js overhead. The frontend becomes a pure Vite + React SPA. This wave starts only after Wave 1 is stable in production.

Two deployment options are viable. Choose one before starting Wave 2:

---

### Option A — Pure React SPA + reuse existing backend

**When to pick this:** There is already a separate backend service (e.g. the QuickApps backend) that handles DIAL Core proxying and auth. The SPA calls that service directly or calls DIAL Core with the token from postMessage. No new backend needed in this repo.

**W2 work (Option A):**

- **W2-A1: Scaffold Vite + React SPA** — `npm create vite@latest`, TypeScript, Tailwind, same deps as Wave 1 minus all `next/*` imports. This becomes the entire repo (no `packages/` split needed)
- **W2-A2: Remove Next.js App Router shell** — single-page app, no routing needed; the app renders one view. `i18next` + `react-i18next` already in place from Wave 1, no i18n migration needed
- **W2-A3: Update API calls** — point `dialClient.ts` at the existing backend instead of DIAL Core directly, if applicable; otherwise no change since Wave 1 already calls DIAL Core with the bearer token
- **W2-A4: Update Dockerfile** — static build served by nginx; no Node.js runtime needed in production
- **W2-A5: Update `ai-dial-chat` iframe host** — update `QUICK_APPS_EDITOR_URL` env var to point to new SPA origin; postMessage protocol unchanged

**Result:** This repo contains only a Vite + React SPA. One Docker image, nginx-served static files. Simplest possible outcome.

---

### Option B — Pure React SPA + new dedicated backend in this repo

**When to pick this:** There is no reusable backend, or the QuickApps service needs its own server-side logic beyond what the existing backend provides (auth flows, webhooks, background jobs, business logic).

**Decisions to make before starting (Option B only):**

1. **Backend framework** — If it's just a thin auth-forwarding proxy: Express, Hono, or Fastify. If it grows into a service with DI and modules: NestJS. Decide based on the roadmap at that point.
2. **Auth model** — Does the SPA still receive the token via postMessage from chat, or does it authenticate independently (own OAuth flow)? Independent auth is more secure and decoupled but requires configuring the same identity provider.
3. **Monorepo layout** — Keep FE and BE in this repo (`packages/frontend` + `packages/backend`) or split into separate repos. Monorepo is easier to coordinate during Wave 2.

**W2 work (Option B):**

- **W2-B1 to W2-B2:** Same as Option A W2-A1 to W2-A2 (scaffold SPA, remove Next.js shell) but in `packages/frontend/`; no i18n migration since Wave 1 already uses `i18next` + `react-i18next`
- **W2-B4: Scaffold backend** in `packages/backend/` — chosen framework, sets up DIAL Core proxy with proper auth forwarding
- **W2-B5: Migrate postMessage token handling** — if auth becomes independent, replace token-from-postMessage with the SPA's own auth token; update the postMessage protocol to remove `token` from `INIT`
- **W2-B6: Update `ai-dial-chat` iframe host** — update `QUICK_APPS_EDITOR_URL`; update `INIT` payload if token handling changed
- **W2-B7: Update CI/CD** — separate build pipelines for FE and BE; two Docker images or a combined one

---

### What does NOT change in either Wave 2 option

- The postMessage protocol shape (add/remove fields only if auth model changes)
- Everything that permanently stays in `ai-dial-chat` (epics, hooks, types listed in W1-9)
- The form logic, components, types, constants — already decoupled from Next.js in Wave 1
- The `DataContext` + `useReducer` pattern — moves verbatim from Wave 1 into the Vite SPA

---

## Summary

```
Wave 1 (ship fast, minimize risk):
  W1-1  Scaffold Next.js app
  W1-2  Move types & constants
  W1-3  Move utilities & form schema
  W1-4  Port shared UI components
  W1-5  Replace Redux with React context + reducer
  W1-6  Move QuickApp2Form components
  W1-7  Build /editor page + postMessage protocol
  W1-8  Add QuickApp2IframeHost in ai-dial-chat
  W1-9  Remove QuickApp2 editor code from ai-dial-chat
  W1-10 CI/deployment

Wave 2 (after Wave 1 is stable in production):
  Decide: Option A (reuse existing BE) or Option B (new BE in this repo)

  Option A — reuse existing backend:
    W2-A1  Scaffold Vite + React SPA
    W2-A2  Remove Next.js App Router shell (no i18n migration needed)
    W2-A3  Update API calls if needed
    W2-A4  Update Dockerfile (nginx static)
    W2-A5  Update ai-dial-chat iframe host env var

  Option B — new backend in this repo:
    Decide: framework, auth model, monorepo layout
    W2-B1  Scaffold Vite + React SPA (packages/frontend)
    W2-B2  Remove Next.js App Router shell (no i18n migration needed)
    W2-B3  Scaffold backend (packages/backend)
    W2-B4  Migrate auth/token handling
    W2-B5  Update ai-dial-chat iframe host
    W2-B6  Update CI/CD
```
