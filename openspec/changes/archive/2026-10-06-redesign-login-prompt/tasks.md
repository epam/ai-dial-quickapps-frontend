Slicing strategy: vertical. Strings come first, because the component depends on them. Then the restyle, then its test. Each slice can be verified on its own.

## 1. i18n strings

- [x] 1.1 Add `LoginScreenTitle`, `LoginScreenDescription`, `LoginScreenAction` and `LoginScreenWindowOpen` to `CommonI18nKeys` in `src/constants/i18n.ts`, with the values from design.md Decision 4.
- [x] 1.2 Add the four matching entries to `src/i18n/locales/common.json`, with key equal to value. This is the only locale file that exists today.
  - Verification: `npm run lint` and `npm run typecheck`

## 2. Restyle `LoginScreen`

- [x] 2.1 Rewrite `src/components/LoginScreen/LoginScreen.tsx`:
  - Keep the `LoginScreenProps { provider: string }` contract, `useAuth(provider)` and the `memo` export.
  - Read strings with `useTranslation(Translation.Common)` and the `CommonI18nKeys.LoginScreen*` keys.
  - Render a centred `flex h-screen flex-col items-center justify-center` column containing:
    - a lock badge (`IconLock` inside a round bordered `span`, `aria-hidden`)
    - the `<h1>` title
    - the `<p>` description
    - the 2.0 `NeutralButton` (design.md Decision 2, `iconAfter={<IconExternalLink aria-hidden className="rtl:scale-x-[-1]" />}`, `disabled={isWindowOpen}`, `onClick={openLoginWindow}`), with the label switching to `LoginScreenWindowOpen` while the popup is open
  - Confirm the `Button` props with the UI kit MCP (`getEntityDetails("component", "Button")`) before writing.
  - Use extensionless imports.
- [x] 2.2 Match spacing, sizes and colour tokens to the design screenshot: lock badge `size-14`, a small gap between badge, title and description, and a slightly larger gap before the button. Confirm the button variant against Figma (design.md Open Questions). If the outlined primary doesn't match, switch to the documented fallback.
- [x] 2.3 RTL pass, per `.claude/rules/rtl.md`:
  - Use only logical or direction-agnostic classes, with no `ml-*/mr-*/pl-*/pr-*/left-*/right-*/text-left/right`.
  - Mirror the external-link icon in RTL. Do not mirror the lock icon.
  - Verification: `npm run lint` and `npm run typecheck`

## 3. Tests

- [x] 3.1 Add `src/components/LoginScreen/tests/LoginScreen.test.tsx`, following the `createRoot` and `act` pattern in `src/components/InstructionsSection/tests/InstructionsSection.test.tsx`. Mock `@/hooks/useTranslation` (identity `t`) and `@/hooks/useAuth`. Cover these behaviours:
  - shows the title heading, the description, and a "Log in" button
  - clicking "Log in" calls `openLoginWindow`
  - while the window is open, the button is disabled and shows the pending label
  - the decorative icons are hidden from assistive technology

  Use role and text queries only.
  - Verification: `npx vitest run src/components/LoginScreen/tests/LoginScreen.test.tsx`, `npm run lint`, `npm run typecheck`
- [x] 3.2 Run the full `npm test` once the slice is complete.

## 4. Docs and follow-ups

- [x] 4.1 Add a follow-up item to `docs/TECH_DEBT.md`: `ForbiddenPage` ("Access Denied" / "Sign out") and `AuthError` still use hardcoded English strings and the 1.0 buttons. They should move to i18n and match the new prompt's style. Do not change those components in this change.
