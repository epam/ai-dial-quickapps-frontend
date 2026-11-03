## ADDED Requirements

### Requirement: Add skill popup scroll to top

The Add skill popup SHALL offer the "Scroll to top" control of `@epam/ai-dial-catalog`'s picker
(`AddOnCatalogModal`) once its list rows are scrolled down by at least the list's visible height. The control
sits over the list's bottom inline-end corner, and SHALL NOT be shown while the list is closer to
its top than that, or while the loading, error or empty state replaces the list. Activating it SHALL
return the list to its first row and move focus to the popup's search field.

The control's accessible name and tooltip SHALL be `CatalogI18nKeys.ScrollToTop` ("Scroll to
top"), passed as `labels.scrollToTop` by `useCatalogPickerSharedProps`
(`src/hooks/use-catalog-picker-shared-props.ts`).

#### Scenario: Control appears after one screen

- **GIVEN** the Add skill popup is open with more rows than fit in the list
- **WHEN** the user scrolls the list down by less than its visible height
- **THEN** no "Scroll to top" control SHALL be shown
- **WHEN** the user scrolls further, to at least its visible height
- **THEN** the "Scroll to top" control SHALL appear at the list's bottom inline-end corner

#### Scenario: Back to the top and search

- **GIVEN** the "Scroll to top" control is shown
- **WHEN** the user activates it
- **THEN** the list SHALL scroll back to its first row
- **AND** focus SHALL move to the search field

#### Scenario: Translated name

- **WHEN** the control is shown
- **THEN** its accessible name SHALL be the `catalog.scrollToTop` string
