# Spec Delta

## REMOVED Requirements

### Requirement: Attachments controls are read-only aware, accessible and direction-aware

**Reason**: The editor has no read-only mode, so the read-only scenarios and wording of this requirement no longer apply. OpenSpec cannot drop a scenario from a MODIFIED block, so the requirement is re-added under a renamed title.
**Migration**: See the renamed requirement in the ADDED section below; its behaviour is otherwise unchanged.

## ADDED Requirements

### Requirement: Attachments controls are accessible and direction-aware

The switch SHALL use `ApplicationEditorI18nKeys.AttachmentsTitle` as its accessible name.

The text input SHALL follow the ARIA combobox pattern:

- `role="combobox"`, named by its visible label, with `aria-autocomplete="list"`;
- `aria-expanded` reflects whether the list is shown;
- `aria-controls` points to the suggestion list (`role="listbox"`);
- `aria-activedescendant` points to the highlighted suggestion (`role="option"`, `aria-selected` on the highlighted one).

The tags SHALL be a list named `ApplicationEditorI18nKeys.AttachmentsTypesLabel`. Each remove control SHALL be named `ApplicationEditorI18nKeys.AttachmentsRemoveType` ("Remove {{type}}").

Keyboard focus SHALL reach the switch and then the text input. Suggestions SHALL NOT take focus.

The row SHALL use logical layout so the switch sits at the trailing edge in RTL. The suggestion name and MIME type SHALL sit at the leading and trailing edges of the active direction. The switch and the tag-remove × SHALL NOT be mirrored.

The section component SHALL be wrapped in `React.memo`, and its derived suggestion list and handlers SHALL be memoised (`useMemo` / `useCallback`) so unrelated form updates do not re-render it.

#### Scenario: Right-to-left document

- **WHEN** the document direction is `rtl` (as when an RTL locale is active — none ships yet, see `i18n`)
- **THEN** the switch SHALL be at the left (trailing) edge of the row and the title at the right (leading) edge
- **AND** each suggestion SHALL show its name on the right and its MIME type on the left
- **AND** no icon SHALL be mirrored
