# Proposal

## Why

Advanced users need to view and edit a QuickApp's configuration as raw JSON: to inspect exactly what is saved, paste a configuration from another app, or change something faster than the form allows. The redesigned editor (Figma, issue #161) reserves an **Edit JSON** link at the bottom-end of the Configuration column for this; it is not implemented yet. See issue #204.

## What Changes

- Add an **Edit JSON** link button (`</>` icon) pinned to the bottom-end corner of the Configuration column, below a thin divider.
- Clicking it opens a modal popup with a syntax-highlighting JSON code editor (ui-kit `DialJsonEditor`; Monaco is already self-hosted by `src/monaco-setup.ts`), filled with the full configuration exactly as a save would write it: nothing hidden, nothing added beyond what the form itself writes. Metadata (name, description, version, avatar, tags) is not part of it.
- The popup's **Save** button is enabled only for valid JSON. Saving writes the values into the editor form state (Instruction, Add-ons and Configuration show them) and keeps every key the form has no field for separately (`extraConfig`); nothing reaches chat-api until the editor's own Save, which writes everything changed in the form and in the JSON. **Cancel**, close and Escape discard the draft.
- One config model for the whole editor: the backend config is split into form values + extras on load and on popup Save, and composed back on save. As a result a normal save, with no Edit JSON, no longer drops keys the form does not own (top-level keys, nested `deployment` / `system_prompt` keys, `deployment.parameters` other than `temperature`, extra keys on starters / skills / contexts).
- The popup follows light/dark theme and RTL.

## Capabilities

### New Capabilities
- `application_json-editor`: the Edit JSON entry point, the popup, the JSON document shape, validity rules and how an applied document updates the form.

### Modified Capabilities
- `application_editor-layout`: the Configuration column gains the pinned Edit JSON footer.
- `application_advanced-settings`: "Values persist through the existing application save" keeps the other `deployment.parameters` keys (`top_p`, `seed`, …) and the loaded `parameters` while the model is not loaded; today the whole `parameters` object is replaced or dropped.
- `application_editing`: "Application properties written on save" also keeps top-level keys of the loaded `application_properties` that the editor does not own (today they are dropped on every save, with or without Edit JSON). This makes the JSON shown in the popup match what is stored.

## Impact

- New: `src/components/EditJson/` (link + popup), `src/utils/` helpers to build and parse the JSON document, i18n keys + enum members in `src/constants/translation-keys.ts` / `src/i18n/locales/en.json`.
- Touched: `src/components/QuickApp2Form/QuickApp2Form.tsx` (builds the document, applies it via `setValues`), `src/components/Orchestrator/ModelConfigurationSection/ModelConfigurationSection.tsx` (footer slot), reuse of `buildQuickApp2Config` / `getQuickApp2FormData` from `src/form/quickApp2Form.ts`.
- No new chat-api request, no host (`postMessage`) change, no new dependency. The code editor is lazy-loaded so the initial bundle does not grow.
- i18n: new strings (link, title, error texts); Save/Cancel reuse `ButtonsI18nKeys`. RTL: logical utilities only; the `</>` icon is symmetric and not mirrored; the JSON text stays LTR (code).
- Backward compat: additive; nothing is saved differently. Rollback: remove the link and component.

## Alternatives considered

- **Side panel instead of modal** (issue open question): rejected; a modal matches the other editor popups (Advanced Settings, conversation starters) and gives the editor room.
- **Edit raw `applicationProperties` and bypass the form**: rejected; the form owns dirty/validation/save, and a second source of truth would break "the UI respects the JSON".
- **Special-case each key the form does not model** (temperature, parameters, top level): rejected in favour of one split / compose mapping with explicit "applies only when" rules; see design.md.
- **Confirm on close with unsaved edits** (issue open question): not in v1. Consistent with the other popups, Cancel discards the local draft.

## Assumptions / notes

- **Accepted behaviour change outside the popup:** a plain save now keeps stored keys the editor never wrote instead of dropping them (see What Changes). Accepted by the change owner; it is independent of the popup and can be reverted with the `buildQuickApp2Config` edit.
- Validity is JSON syntax plus the editor's own form rules. Loading the backend application schema for schema validation and autocomplete is the next iteration, not this change.
