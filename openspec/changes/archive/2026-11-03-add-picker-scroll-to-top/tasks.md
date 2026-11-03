## 1. Libraries and label

- [x] 1.1 Bump the eight chat libs to `1.3.0-dev.296` and `@epam/ai-dial-ui-kit` to
      `0.16.0-dev.67` (its peer floor); `npm install`.
- [x] 1.2 Add `CatalogI18nKeys.ScrollToTop` (`catalog.scrollToTop`) and its `en.json` value.
- [x] 1.3 Pass `scrollToTop: t(CatalogI18nKeys.ScrollToTop)` from `useCatalogPickerSharedProps`.
      Cover it in `src/hooks/tests/use-catalog-picker-shared-props.test.tsx`.
  - Verification: `npm run typecheck`, `npm run lint`, `npm test`.

## 2. Specs

- [x] 2.1 `openspec validate add-picker-scroll-to-top --strict`.
