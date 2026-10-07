## Context

Today, conversation starters are a collapsible section at the bottom of the main column (`src/components/ConversationStarters/ConversationStartersSection.tsx`). They're edited inline through react-hook-form `Controller`s, which `QuickApp2FormLegacyFields.tsx:11-20,44-82` bridges into `useQuickApp2Form`. The list logic (append a blank row, trim the leading space, delete) is written twice: once in `ConversationStartersField.tsx:31-45` and once in the hook reducer, `use-quick-app2-form.ts:237-256`. The reducer copy is only exercised by `src/hooks/tests/use-quick-app2-form.test.tsx:247-255`. The settings gating is computed in two places as well, `QuickApp2Form.tsx:136-139` and `QuickApp2FormLegacyFields.tsx:84`. Load and save live in `src/form/quickApp2Form.ts:221-231` and `:261-303`.

The Add-ons card (`AddOnsSection.tsx`) builds its rows with `AddOnRow` (`SectionRow` + a `NeutralButton` Add action). `AdvancedSettingsPopup.tsx` is the existing pattern for a draft-and-Save modal: the kit `Popup`, remounted on each open, with a local draft and Close/Save footer actions.

The user's decisions:
- `chatMessageInputDisabled` keeps its meaning; only its copy changes.
- The change covers starters only.
- Reordering uses `@dnd-kit/sortable`.
- Half-filled starters are still saved.

## Goals / Non-Goals

**Goals:**
- An Add-ons row that shows the empty state, or the read-only list with Manage.
- A modal with a local draft, Save/Close, and pointer- and keyboard-sortable rows.
- A 30-character label limit with a counter.
- Settings with the new copy and the same gating rule as today.
- Move the four starter fields off the react-hook-form bridge, with list logic in a single pure util.

**Non-Goals:**
- No change to the persisted shape, no chat-api change, no save validation.
- No changes to the Agents/Toolsets/Knowledge base rows.
- No changes to how the chat enforces its settings.

## Decisions

### D1. Component split
All files go in `src/components/ConversationStarters/`.
- `ConversationStartersRow.tsx` (`memo`):
  - Renders an `AddOnRow`-like row. `AddOnRow` gets optional `actionLabel` / `actionIcon` props, so Manage reuses it instead of a new row component; the default stays Add + plus icon.
  - Takes the props `starters`, `introText`, `autoSubmit`, `chatMessageInputDisabled`, `isReadonly`, `tooltip` and `onSave(values: ConversationStartersValues)`.
  - Owns `isModalOpen` and mounts the modal only while it is open (`{isModalOpen && <ConversationStartersModal …/>}`). The draft is therefore re-seeded on every open, which is the same trick as `SettingsSection` → `AdvancedSettingsPopup`.
- `ConversationStartersList.tsx`: the read-only list inside the row (`IconMessage`, title, truncated prompt).
- `ConversationStartersModal.tsx`:
  - The kit `Popup` (`PopupSize.Md`, matching the mock's ~700px width), with `headerDivider`, `footerDivider`, `closeAriaLabel`, `additionalButtons` = Close (link) and `mainButtons` = Save (neutral).
  - Owns the draft `useState<ConversationStartersValues>`.
  - Wraps the rows in `DndContext` + `SortableContext`.
- `SortableStarterRow.tsx`: uses `useSortable({ id, disabled: isTrailing })`. It renders the handle button (`IconGripVertical`, with `{...attributes} {...listeners}` on the handle only), the title `Input`, the prompt `Input` and the delete `DialGhostIconButton`/`IconButton`.

*Alternative:* keep the modal body as a single component. Rejected: the sortable row needs its own hook call per item.

### D2. Values type and form wiring
- `src/types/conversation-starters.ts` holds `interface ConversationStartersValues { starters: StarterWithId[]; introText?: string; autoSubmit: boolean; chatMessageInputDisabled: boolean }`. It also holds `StarterWithId`, which moves out of `ConversationStartersField.tsx:13`.
- `QuickApp2Form` builds the values with `useMemo` from the four fields and passes `handleConversationStartersSave = useCallback((v) => setValues(v), [setValues])`. This mirrors `handleAdvancedSettingsSave` (`QuickApp2Form.tsx:188-191`). `setValues` already does an `isEqual`-based dirty check, so an unchanged Save stays clean.
- `starters`, `introText`, `autoSubmit` and `chatMessageInputDisabled` are removed from `LEGACY_FIELDS`, along with `ConversationStartersSection` and its `hasStarters` / `startersSettingsTooltip` props in `QuickApp2FormLegacyFields`. `QuickApp2Form` drops `hasStarters` and `startersSettingsTooltip`; the modal computes gating from the draft.

### D3. Pure list helpers in `src/utils/conversation-starters.ts`
These are arrow-function exports, unit-tested, and shared by the modal and the hook reducer:
- `createEmptyStarter()`
- `updateStarterField(starters, index, field, value)`: trims a leading single whitespace character, enforces the 30-character limit, and appends a blank row when the last row becomes non-blank.
- `removeStarter(starters, index)`: does nothing for the trailing row.
- `moveStarter(starters, activeId, overId)`: wraps `arrayMove`. It refuses to move the trailing row or to drop onto it, so the trailing blank row stays last.
- `hasCompleteStarter(starters)`
- `isSavedVisibleStarter(starter)`
- `STARTER_TITLE_MAX_LENGTH = 30` lives in `src/constants/conversation-starters.ts`.

The 30-character limit only applies to growth. If `value.length > MAX` and `value.length > previous.length`, the edit is rejected, so a legacy title longer than 30 characters can be shortened but never lengthened (spec "Legacy long title"). The `<input maxLength>` attribute is **not** used, because the browser would block editing a legacy over-limit value inconsistently.

The hook reducer's `UPDATE_STARTER` / `REMOVE_STARTER` are switched to these helpers in the same change, so the logic isn't duplicated. Removing the now-unused actions is a follow-up task.

### D4. Drag and drop with dnd-kit
- `DndContext` uses `closestCenter` collision detection and two sensors:
  - `PointerSensor` with `activationConstraint: { distance: 4 }`, so clicking the handle doesn't start a drag;
  - `KeyboardSensor` with `sortableKeyboardCoordinates`.
- Rows are wrapped in `SortableContext` with `verticalListSortingStrategy`. Its items are all starter ids. The trailing blank row calls `useSortable({ disabled: true })`, so it can be neither dragged nor dropped onto, and `moveStarter` refuses such moves as well.
- `onDragEnd` calls `moveStarter`.
- Movement is limited to the vertical axis by a small modifier (`transform.x = 0`), exported as `restrictToVerticalAxis` from `src/utils/conversation-starters.ts`. This avoids adding `@dnd-kit/modifiers`.
- `accessibility.screenReaderInstructions` and `accessibility.announcements` are filled from the translated `StarterDragInstructions` / `StarterPickedUp` / `StarterMovedOver` / `StarterDropped` / `StarterDragCancelled` keys, interpolating `{{position}}` and `{{total}}`.
- The row's transform uses `CSS.Translate.toString` from `@dnd-kit/utilities` in an inline style. That isn't a directional class, so RTL is unaffected.

*Alternatives:*
- `DialDraggableItem`: its private react-dnd copy needs a `DndProvider` the kit doesn't export, and it has no keyboard support.
- Native HTML5 drag events: no keyboard support and inconsistent on touch.

dnd-kit is MIT-licensed, about 15 kB gzipped for core + sortable + utilities, and supports React 19.

### D5. Label input and counter
The kit's `postfix` is always rendered as `text-secondary` with no styling hook. The `n/30` counter is therefore passed as `iconAfter`: a `<span>` styled `text-secondary`, or `text-error` when the title is over the limit. The input also gets `invalid` in that case. The span is the last flex child of the field, so it sits at the logical end.

The inputs get accessible names through `aria-label` (`ButtonLabel`, `PromptToSendInChat`), since the rows have no visible labels. `Input` extends `InputHTMLAttributes` and spreads the rest onto the `<input>`.

### D6. Settings block
- A `<h3>` with `Settings` and the hint paragraph, as today.
- The kit `Input` for Intro message.
- The kit `Switch` (`labelProps.label` + `caption`) for Require a starter, matching `AdvancedSettingsPopup.tsx:122-127`.
- The kit 2.0 `RadioGroup` replaces the local `StartersBehaviourRadioGroup` and the common `RadioButton`. `RadioGroup` takes string values, so a string enum `StarterSelectionBehavior { SendPrompt = 'send-prompt', PopulateInput = 'populate-input' }` in `src/types/conversation-starters.ts` maps to and from `autoSubmit`.
- All three get `disabled={!hasCompleteStarter(draft.starters)}`. The modal can't open while the editor is read-only (D7), so only the starter hint is needed inside it.

### D7. Read-only
The row passes `isAddDisabled={isReadonly}` and `addTooltip={tooltip}`, which is the existing `AddOnRow` contract. The modal is never mounted while the editor is read-only. If the editor becomes read-only while the modal is open, the modal stays usable but Save still goes through `setValues`. That's acceptable, because the editor's save path already refuses read-only saves (`QuickApp2Form.tsx:158`).

### D8. States
- **Loading:** Add-ons renders after the form is seeded, so the row has no separate loading state.
- **Empty:** the description plus Add.
- **Error:** there is no error state. The only error is the counter styling for a legacy over-limit label, and nothing is fetched.

### D9. RTL
- Rows: `flex items-center gap-2`, with no physical margins.
- Handle: first child, so it sits at the start.
- Row list: icon `me-2` or a `gap` (logical).
- Counter: the last flex child of the field, so it sits at the logical end.
- Icons: grip, message, pencil and trash are symmetric, so none get `rtl:scale-x-[-1]`.
- dnd-kit: its vertical strategy uses only `y`, so it isn't affected by direction.

## Risks / Trade-offs

- [New runtime dependency] → It's small, widely used and MIT. Pinned with `^6` / `^10` / `^3` in `package.json`, and reverting removes it cleanly.
- [Kit `Popup` focus trap vs. dnd-kit keyboard sensor] → Keyboard dragging uses Space, arrows and Escape. Escape could also close the `Popup` during a drag. Mitigation: an `isDraggingRef` is set in `onDragStart` and cleared on the next tick after `onDragEnd`/`onDragCancel`. While it is set, the popup's `onClose` (Escape, outside click, ×) is ignored, whichever listener sees the Escape first. The footer Close action is not guarded, because it can't be reached mid-drag. Covered by a test.
- [Half-filled starters still show in the row and are saved] → This matches today's behaviour by decision. The TECH_DEBT item stays open.
- [i18n keys are English sentences] → Renaming copy (`PromptToSendInChat`) changes the key; other locales fall back to the key until they're translated. This is the same as existing practice.

## Migration Plan

No data migration. Install the dnd-kit packages, then ship as a normal frontend release. Rollback is a revert plus `npm uninstall`. The saved `conversation_starters` shape and order semantics are unchanged, so both versions read each other's data.

## Open Questions

- Final copy for the drag announcements and `ReorderStarter`. Proposed:
  - "Press Space to pick up a starter, use the arrow keys to move it, Space to drop, Escape to cancel."
  - "Picked up starter {{position}} of {{total}}."
  - "Starter moved to position {{position}} of {{total}}."
  - "Starter dropped at position {{position}} of {{total}}."
  - "Reordering cancelled."
  - "Reorder starter {{name}}".
- Whether the Add-ons row should cap the list height for many starters. Assumed no cap, matching the mock.
