## 1. Theme context

- [x] 1.1 Remove `setTheme`, `STORAGE_KEY` and the `localStorage` read from
      `src/context/ThemeContext.tsx`. The active id is the URL theme, or `light`.
- [x] 1.2 Update `src/context/tests/ThemeContext.test.tsx`: drop the stored-choice and setter
      cases, and add "No theme in the URL" ignoring `localStorage`.
  - Verification: `npx vitest run src/context`.

## 2. Docs

- [x] 2.1 Mark the TECH_DEBT "Themes" item fixed; `openspec validate remove-theme-setter --strict`.
