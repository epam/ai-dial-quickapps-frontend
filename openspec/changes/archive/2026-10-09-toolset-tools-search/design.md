## Context

The search state, filter, count and empty state all live in the catalog's `ToolsTab`. This app passes its strings through `labels.tools`, as it already does for the grid column headings.

## Decisions

- **Placeholder "Search tools...":** matches this app's other search fields (`Search toolsets...`, `Search agents...`), rather than the catalog's generic `Search...`.
- **Count key `{{count}} tools`, with `count` passed as a string:** follows the Content tab's `{{count}} files`. Like that key, it has no plural forms.
