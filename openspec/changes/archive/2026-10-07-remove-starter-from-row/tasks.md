Slicing strategy: **vertical**, in one slice. The behaviour is small, and it reuses the row's existing `onSave` path and the hover-remove pattern of `src/components/Skills/SkillsList/SkillListItem.tsx`.

Before starting, read `AGENTS.md`, `.claude/rules/all-ts.md`, `.claude/rules/all-tsx.md` and `.claude/rules/rtl.md`.

## 1. Hover remove button on starter items

- [x] 1.1 Add the `quickAppEditor` key `RemoveStarter` ("Remove starter {{name}}") to `src/constants/i18n.ts` and `src/i18n/locales/quick-app-editor.json`.
- [x] 1.2 In `src/components/ConversationStarters/ConversationStartersList.tsx`, add an optional `onRemove?: (id: string) => void` prop.
  - When it is set, each item becomes a `group` row ending with a ui-kit `GhostIconButton`: `IconTrash` with `DIAL_ICON_SIZE.SM` / `DIAL_KIT_ICON_STROKE`, `aria-label` = `RemoveStarter` with `{ name: title || prompt }`.
  - The button is `opacity-0` and becomes visible on `group-hover` / `group-focus-within`.
  - After a removal, focus moves to the first remaining remove button.
  - Use logical classes only.
- [x] 1.3 In `src/components/ConversationStarters/ConversationStartersRow.tsx`, pass `onRemove` unless `isReadonly`. It is a `useCallback` that calls `onSave({ ...values, starters: values.starters.filter((s) => s.id !== id) })`, which keeps the trailing blank row and the settings.
- [x] 1.4 Tests in `src/components/ConversationStarters/tests/ConversationStartersRow.test.tsx`:
  - each starter has a hidden-until-hover "Remove starter <name>" button, using the prompt when the title is blank;
  - removing the middle starter calls `onSave` with the other two in order and the unchanged settings, and does not open the modal;
  - focus moves to the first remaining remove button;
  - removing the last starter returns the row to Add;
  - there are no remove buttons when read-only.
  - Verification: `npx vitest run src/components/ConversationStarters`, `npm run lint`, `npm run typecheck`, then `npm test`.
