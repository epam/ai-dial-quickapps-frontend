Slicing strategy: **vertical**, with the riskiest part (dnd-kit inside the kit `Popup`) isolated in its own slice. Slice 2 makes the new row and modal work end to end without reordering. Slice 3 adds reordering on top. Every slice leaves `npm run lint`, `npm run typecheck` and `npm test` green.

Before starting, read `AGENTS.md`, `.claude/rules/all-ts.md` and `.claude/rules/rtl.md`. Use extensionless imports for code, the `@/` alias, arrow-function exports, `is/has` boolean names and `on/handle` handler names. Confirm kit props with the ui-kit MCP before using `Input` (postfix, rest props), `Popup`, `Switch`, `RadioGroup` and `NeutralButton`.

## 1. Contract: types, constants, pure helpers

- [x] 1.1 Create `src/types/conversation-starters.ts` with:
  - `StarterWithId` (moved from `src/components/ConversationStarters/ConversationStartersField.tsx:13`);
  - `ConversationStartersValues` (`starters`, `introText?`, `autoSubmit`, `chatMessageInputDisabled`);
  - the string enum `StarterSelectionBehavior { SendPrompt = 'send-prompt', PopulateInput = 'populate-input' }`.
- [x] 1.2 Create `src/constants/conversation-starters.ts` with `STARTER_TITLE_MAX_LENGTH = 30`.
- [x] 1.3 Create `src/utils/conversation-starters.ts` with the arrow-function exports below (design D3):
  - `createEmptyStarter`;
  - `updateStarterField`: trims a leading single whitespace character, applies the growth-only 30-character limit for `title`, and appends a blank row when the last row becomes non-blank;
  - `removeStarter`: does nothing for the trailing row;
  - `moveStarter(starters, activeId, overId)`: rejects moves of or onto the trailing row;
  - `hasCompleteStarter`;
  - `isSavedVisibleStarter`;
  - `getStarterSelectionBehavior(autoSubmit)` / `getAutoSubmit(behavior)`.
- [x] 1.4 Add `src/utils/tests/conversation-starters.test.ts` covering:
  - appending a blank row and the leading-space trim;
  - the 30-character limit, including a legacy 42-character title that can be shortened but not lengthened;
  - delete being a no-op on the trailing row;
  - `moveStarter` A,B,C → B,A,C, and refusing to move onto the trailing row;
  - `hasCompleteStarter` for half-filled rows;
  - the behaviour ↔ `autoSubmit` mapping.
- [x] 1.5 Switch the `UPDATE_STARTER` / `REMOVE_STARTER` branches of `src/hooks/use-quick-app2-form.ts:237-256` to `updateStarterField` / `removeStarter`. The existing `src/hooks/tests/use-quick-app2-form.test.tsx:247-255` must still pass. Note that this also applies the 30-character growth limit to the reducer path.

## 2. Vertical slice: Add-ons row and modal (no reordering)

Depends on 1.

- [x] 2.1 Add optional `actionLabel?: string` and `actionIcon?: ReactNode` props to `src/components/AddOns/AddOnRow.tsx`. The defaults keep the `common` `Add` label and the `IconPlus` icon, so existing rows are unchanged.
- [x] 2.2 Add `quickAppEditor` keys to `src/constants/i18n.ts` (`QuickAppEditorI18nKeys`) and `src/i18n/locales/quick-app-editor.json`:
  - `SetUpConversationStarters`, `CloseConversationStarters`, `ConversationStartersAddOnDescription`, `Manage`;
  - `ButtonLabel`, `IntroMessage`, `RequireStarterToStartNewChat`, `RequireStarterToStartNewChatDescription`;
  - `WhenStarterIsSelected`, `SendPromptToTheChat`, `DeleteStarter`.
  - Change `PromptToSendInChat` to "Prompt to send in chat", and make `AtLeastOneStarterIsRequiredToEnableSettings` end with a period.
  - Use the English copy from the proposal and specs.
- [x] 2.3 Create `src/components/ConversationStarters/ConversationStartersList.tsx`: the read-only list with `IconMessage`, semibold title and truncated secondary prompt. Only saved-visible starters are listed, using `gap`/`me-*` logical spacing.
- [x] 2.4 Create `src/components/ConversationStarters/StarterRow.tsx` (renamed to `SortableStarterRow` in 3.2). It renders:
  - a placeholder handle slot;
  - the title `Input` (`aria-label` and placeholder `ButtonLabel`, `n/30` postfix while non-empty, error styling when over the limit, design D5);
  - the prompt `Input` (`aria-label` and placeholder `PromptToSendInChat`);
  - a delete button (`aria-label` `DeleteStarter`), disabled but visible on the trailing row.
  - Rows sit on a raised card surface.
- [x] 2.5 Create `src/components/ConversationStarters/ConversationStartersModal.tsx`:
  - the kit `Popup` with `PopupSize.Md`, `SetUpConversationStarters` header, `CloseConversationStarters` close label, both dividers, Close (link) and Save (neutral);
  - a local draft seeded from props, with rows edited through the 1.3 helpers;
  - the Settings block: `Settings` heading and hint, the Intro message `Input`, the Require-a-starter `Switch` with caption, and a `RadioGroup` named `WhenStarterIsSelected`. All three get `disabled={!hasCompleteStarter(draft.starters)}`;
  - Save calls `onSave(draft)` then `onClose()`.
- [x] 2.6 Create `src/components/ConversationStarters/ConversationStartersRow.tsx` (`memo`):
  - owns `isModalOpen` and uses `AddOnRow`;
  - empty: shows the description and Add;
  - populated: no description, `Manage` + `IconPencil`, and `ConversationStartersList`;
  - passes `isAddDisabled={isReadonly}` and `addTooltip={tooltip}`;
  - mounts the modal only while it is open.
- [x] 2.7 Wire up the form:
  - `src/components/AddOns/AddOnsSection.tsx`: render `ConversationStartersRow` after the Agents & Toolsets row, with new props `conversationStarters: ConversationStartersValues` and `onConversationStartersSave`.
  - `src/components/QuickApp2Form.tsx`: build `conversationStarters` with `useMemo` from the four fields, and add `handleConversationStartersSave = useCallback((v) => setValues(v), [setValues])`. Remove `hasStarters` / `startersSettingsTooltip` (lines 136-139) and the `startersSettingsTooltip` prop.
- [x] 2.8 Remove the starters fields from the legacy bridge in `src/components/QuickApp2FormLegacyFields/QuickApp2FormLegacyFields.tsx`:
  - remove `starters`, `introText`, `autoSubmit` and `chatMessageInputDisabled` from `LEGACY_FIELDS`;
  - remove `ConversationStartersSection`, the trailing `<hr>` before it, `hasStarters` and the `startersSettingsTooltip` prop.
  - Update `src/components/QuickApp2FormLegacyFields/tests/QuickApp2FormLegacyFields.test.tsx` to match.
- [x] 2.9 Delete `ConversationStartersSection.tsx`, `ConversationStartersField.tsx` and `StartersBehaviourRadioGroup.tsx`, and their tests `tests/ConversationStartersSection.test.tsx` and `tests/ConversationStartersField.test.tsx`. Then remove the i18n keys that no longer have call sites (`IntroText`, `OptionalTextShownAboveTheStarters`, `StartersBehavior`, `StartersSettings`, `DisableChatInput`, `DisableChatInputSoUsersCanOnlyUseStarters`, `ImmediatelySendPrompt`, `ButtonTitleTravelTips`, `StartersDescription`). Grep each key before removing it.
- [x] 2.10 Add tests in `src/components/ConversationStarters/tests/`:
  - `ConversationStartersRow.test.tsx`:
    - empty state shows the description and Add;
    - populated state shows Manage and the list in order, with no description;
    - read-only and shared: the action is disabled, has the tooltip and doesn't open the modal.
  - `ConversationStartersModal.test.tsx`:
    - opens seeded from props;
    - typing into the last row appends a blank row;
    - the `16/30` counter, and the legacy `42/30` counter in error styling;
    - delete;
    - settings are disabled until a complete starter exists, enabled live, and disabled again after deletion;
    - Close discards; Save calls `onSave` with the draft.
- [x] 2.11 Update `src/components/tests/QuickApp2Form.test.tsx` and `QuickApp2Form.behavior.test.tsx`:
  - there's no main-column starters section;
  - saving the modal makes the form dirty and the next save writes the spec's `conversation_starters` JSON;
  - Save with no changes keeps the form clean.
- [ ] 2.12 Verify by hand with `npm start`: the empty row, the populated row, a Save round trip and Close discarding.

## 3. Risk slice: reordering with dnd-kit

Depends on 2.

- [x] 3.1 `npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities`, and commit the `package.json` / lockfile changes.
- [x] 3.2 Rename `StarterRow.tsx` → `SortableStarterRow.tsx` and use `useSortable({ id, disabled: isTrailing })`. The handle is a `<button type="button">` with `IconGripVertical`, `aria-label` `ReorderStarter` (`{{name}}` = title, or the position when the title is blank) and `{...attributes} {...listeners}`. Apply the transform with `CSS.Transform.toString`. The trailing row's handle is disabled.
- [x] 3.3 In `ConversationStartersModal.tsx`, wrap the rows in `DndContext` and `SortableContext`:
  - `DndContext`: `closestCenter`, `PointerSensor` with `{ distance: 4 }`, `KeyboardSensor` with `sortableKeyboardCoordinates`, and an inline vertical-only modifier;
  - `SortableContext`: `verticalListSortingStrategy`, items = the non-trailing ids;
  - `onDragEnd` calls `moveStarter`.
- [x] 3.4 Add the announcement keys `StarterDragInstructions`, `StarterPickedUp`, `StarterMovedOver`, `StarterDropped`, `StarterDragCancelled` and `ReorderStarter` to `QuickAppEditorI18nKeys` and `quick-app-editor.json`, using the design's proposed copy. Wire them into `DndContext`'s `accessibility.screenReaderInstructions` / `announcements`.
- [x] 3.5 Stop Escape from closing the `Popup` while a keyboard drag is active: track `isDragging` from `onDragStart`/`onDragEnd`/`onDragCancel`, and add a capture-phase `keydown` handler on the modal body (design, Risks).
- [x] 3.6 Add tests to `ConversationStartersModal.test.tsx`:
  - keyboard reorder (focus B's handle → Space → ArrowUp → Space gives B,A,C) and cancel with Escape (order kept, modal still open);
  - the trailing handle is disabled;
  - Save passes the reordered starters to `onSave`.
  - Add a `src/form/tests/quickApp2Form.test.ts` case showing `getQuickApp2FormData` writes starters in list order.
- [ ] 3.7 Verify by hand: mouse drag and keyboard drag in Chrome, and in RTL (set the `ar` locale) the handle is on the right and arrows still move up and down.

## 4. RTL and accessibility pass

Depends on 3.

- [x] 4.1 Check `ConversationStartersList`, `SortableStarterRow` and `ConversationStartersModal` against `.claude/rules/rtl.md`: logical utilities only, no mirroring of the grip, message, pencil or trash icons, and the counter at the logical end in `dir="rtl"`.
- [x] 4.2 Add an RTL test, in `ConversationStartersModal.test.tsx` or a sibling: with `document.documentElement.dir = 'rtl'`, the row DOM order is handle, title, prompt, delete, and no icon has a `scale-x` class.
- [ ] 4.3 Check accessibility with Playwright or by hand:
  - the dialog role and name;
  - focus returns to Manage/Add after the modal closes;
  - the radio group is named;
  - the handle and delete buttons have names;
  - the live region announces moves.

## 5. Specs and docs

Depends on 2–4.

- [x] 5.1 Re-read the delta specs in `openspec/changes/redesign-conversation-starters/specs/` against the implementation and adjust any copy or keys that changed during the build.
- [x] 5.2 Update the Conversation starters entry in `docs/TECH_DEBT.md`: the area moved to `src/components/ConversationStarters/**` (new files), and the half-filled-starter item stays open.
- [x] 5.3 Run `npm run lint`, `npm run typecheck`, `npm test` and `npm run build`.

## 6. Follow-ups (out of scope, record only)

- [x] 6.1 Record in `docs/TECH_DEBT.md`: remove the now-unused `updateStarter` / `removeStarter` actions from `useQuickApp2Form` once no test depends on them.
- [x] 6.2 Record in `docs/TECH_DEBT.md`: the Add-ons restructure from the same mock (separate Toolsets and Agents rows, Knowledge base row) as its own change.
- [x] 6.3 Record in `docs/TECH_DEBT.md`: an upstream ui-kit ask to export a sortable list, or the `DndProvider` behind `DialDraggableItem`, with keyboard support.
