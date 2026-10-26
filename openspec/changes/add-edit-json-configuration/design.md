# Design

## Context

- The editor's state is `useQuickApp2Form` (`src/hooks/use-quick-app2-form.ts`), owned by `QuickApp2Form.tsx`. Popups (`AdvancedSettingsPopup`, conversation starters) edit a local draft and call `setValues` on Save. Edit JSON follows the same shape.
- Two functions in `src/form/quickApp2Form.ts` already map between the backend config and the form: `getQuickApp2FormData` (config → form values) and `buildQuickApp2Config` (form values → config; it also reads the loaded `existingConfig` to carry some keys over). `EditorClient.tsx` `handleSave` adds `inputAttachmentTypes` / `maxInputAttachments` at the app level, outside `QuickApp2Config`.
- Today the carry-over is partial: `orchestrator` and `features` extras survive a save, but top-level extras, most of `deployment`, and `deployment.parameters` other than `temperature` do not (see the deltas for `application_editing` and `application_advanced-settings`).
- `QuickApp2Schema` (zod) validates the form. `src/monaco-setup.ts` self-hosts Monaco with the JSON worker, so ui-kit `DialJsonEditor` works under the CSP. `DialJsonEditor` (1.0, no 2.0 replacement) is exported lazily as `LazyDialJsonEditor` and takes `value`, `currentTheme`, `onChange`, `onValidateJSON`, `options`.

## Goals / Non-Goals

**Goals:** one config model for the whole editor — the backend config is split into form values and "extras" (everything the form does not own), and composed back on save; the Edit JSON popup shows exactly what a save would write and writes a valid edit back through that same split; no extra requests or dependencies.

**Non-Goals:** editing metadata; loading the backend application schema for validation or autocomplete (next iteration); confirmation on closing with unsaved JSON; any host/`postMessage` change.

## Decisions

1. **Split / compose is the single mapping.** Keep the two functions' names and add one concept: `extraConfig`, the config with every form-owned leaf removed.
   - `getQuickApp2FormData(app, …)` = **split**: returns the form values and `extraConfig` (stored on the form values as a form-only field).
   - `buildQuickApp2Config({ data, … })` = **compose**: starts from `data.extraConfig`, deep-merges the form-owned values on top (form wins), and no longer reads `existingConfig`. Load, save, "open JSON" and "save JSON" all go through this pair, so there are no special cases per key and the stored config reaches a save through one path only.
   - `QuickApp2Schema` gains `extraConfig: z.record(z.string(), z.unknown()).optional()` (otherwise zod strips it from `submit()` data). It is never sent to chat-api on its own, takes part in `isDirty` through the normal values comparison, and needs no change in `hasQuickAppChanges` (it diffs every top-level key of the built config against the stored one).
   - *Alternative:* keep `existingConfig` as the base and add `extraConfig` only for what the popup types — rejected: two bases, and a copy could drift.
2. **Form-owned leaves** (removed from `extraConfig`, written from the form): `orchestrator.deployment.deployment_id`, `orchestrator.deployment.parameters.temperature`, `orchestrator.system_prompt.content` / `.type`, `contexts` and `skills` items the form owns, `tool_sets`, `conversation_starters` (`intro_text`, `chat_message_input_disabled`, `auto_submit`, and the `title` / `text` of each starter), `features.timestamp` / `.dial_files` / `.representation_tooling` / `.web_fetch`, `input_attachment_types`, `max_input_attachments`. Everything else is an extra and is kept at its stored position and value, at any depth: for example top-level `tool_defaults`, `hooks`, `starters`; `orchestrator.max_iterations`, `propagate_stages`, `tool_discovery`, `deployment.name`, `system_prompt.variables`; `deployment.parameters.top_p` / `seed` / …; `features.stage_display` / `file_loading` / …. `orchestrator.attachment_strategy` is not removed: it stays an extra and the form overrides it only for a model that accepts attachments (decision 4). `contexts` and `skills` stay whole in `extraConfig` and their items are matched by `url` on compose. Nothing is added from schema defaults for a property that has no form field.
3. **Extras inside arrays.** The form keeps only part of some array items, so their extras are carried by item identity: a starter carries its own `extra` object (title / text stay form fields); `skills` and `contexts` entries the form does not own (for example a skill of another `type`) are kept verbatim in `extraConfig` and re-appended after the form's entries; extra keys on an owned skill or context are kept by its `url`. Add-on entries already carry their whole tool object (`AddOnEntry.tool`), so unknown keys inside toolsets already round-trip.
4. **Applicability rules, not special cases.** Some form-owned keys apply only while a condition holds. One rule shape covers them: *applies → write from the form; does not apply and the condition is known → the rule's fallback; condition not known yet (selected model not loaded) → leave the stored value untouched.*

   | Key | Applies when | Fallback when it does not apply |
   | --- | --- | --- |
   | `deployment.parameters.temperature` | selected model supports temperature | remove the key (`parameters` is omitted if nothing else is left) |
   | `orchestrator.attachment_strategy` | selected model accepts attachments | keep the stored value (as today) |
   | code interpreter tool set, `features.web_fetch`, `features.representation_tooling` | the matching host setting is on | write off (`null` / no tool set), as on load today |

   Temperature keeps its form behaviour (default `0.5`, written for temperature-capable models), so the JSON shows `0.5` when none is stored for such a model — exactly what a save writes. *Alternative:* make temperature optional in the form — rejected, it changes what new apps save.
5. **The JSON document is the composed config.** `buildEditJsonDocument(values, ctx)` (`src/utils/edit-json.ts`) = `buildQuickApp2Config` output + `input_attachment_types` / `max_input_attachments`, pretty-printed with 2 spaces. It is what a save would write: nothing hidden, nothing added beyond the form's own defaults (timestamp / file tools on, temperature `0.5`, …).
6. **Saving the popup** is `parseEditJsonDocument(text, ctx)` → `{ isValid: true, values } | { isValid: false, errors }`: `JSON.parse` → root must be a plain object → a small zod schema for the document shape (types of `orchestrator`, `tool_sets`, `skills`, `contexts`, … so the split cannot throw) → split with `getQuickApp2FormData` (fresh starter ids; `toolSupportingModelIds` / `availableModelIds` from the current form) → `QuickApp2Schema.safeParse`. The popup's Save button is enabled only when that result is valid; Cancel / close / Escape discard. Saving the popup calls `setValues(values, { shouldValidate: true })` (values include the new `extraConfig`, which replaces the old one, so a deleted extra is gone), forces host-disabled features off (as `syncExternalState` does on load) and resets `isMaxAttachmentsSeededRef`. A document that would be saved as the current configuration (compared as parsed JSON, key order ignored) changes nothing, so saving it unchanged leaves the form clean; starters keep their ids when unchanged. Nothing is sent to chat-api until the editor's own Save. *Alternative:* a new reducer action — rejected, `SET_VALUES` fits. Monaco's own diagnostics (`onValidateJSON`) only draw markers; they are not the gate.
7. **Components** under `src/components/EditJson/`: `EditJsonLink` (ui-kit link-appearance `Button` + `IconCode`) and `EditJsonPopup` (ui-kit `Popup`, mobile fullscreen classes like `AdvancedSettingsPopup`, remounted per open so the draft is seeded once; footer Cancel + Save). The footer slot is in `ModelConfigurationSection` (divider + end-aligned link, `mt-auto`). `QuickApp2Form` builds the document when the popup opens (not on every render) and handles `onSave`. The editor is loaded with `LazyDialJsonEditor` in `Suspense` (spinner fallback) so Monaco stays out of the initial chunk; theme from `ThemeContext`; editor wrapper `dir="ltr"`. Validation is derived (`useMemo` over the draft text); errors are rendered in a `role="alert"` list.
8. **i18n:** `ApplicationEditorI18nKeys.EditJson`, `EditJsonTitle`, `EditJsonEditorLabel`, `EditJsonSyntaxError` (interpolated message), `EditJsonRootMustBeObject`, `EditJsonInvalidStructure`; Save / Cancel reuse `ButtonsI18nKeys` (check existing members first; add if absent). Enum members and `en.json` keys land together.
9. **RTL:** footer uses logical alignment (`justify-end`, `ms-*` / `me-*`); popup text follows `dir`; Monaco container forced `ltr`; `IconCode` is symmetric, not mirrored.

## Risks / Trade-offs

- [JSON → form → JSON is not an identity: add-ons are re-sorted by name, deployment tools merge into one default tool set, starter ids are regenerated, form defaults fill missing keys] → "shown" is defined as "what a save would write"; a round-trip test checks `compose(split(config))` is stable after one pass.
- [Stored keys that older saves dropped (top level, `deployment.name`, `parameters` other than `temperature`, non-form skill/context types) are now kept] → intended; a save can write keys the editor never wrote. Covered by the `application_editing` and `application_advanced-settings` deltas and tests in task 1.1.
- [Without the backend schema, validity is syntax + our form rules; chat-api may still reject a value on save] → the existing save error message path shows it; schema validation is the next iteration.
- [Monaco is heavy] → lazy chunk with a spinner.
- [Large documents re-validated per keystroke] → cheap synchronous work; revisit if profiling shows jank.
- [Last write wins if another user changes the app while the popup is open] → same as today's save; accepted.

## Migration Plan

Additive UI plus a wider carry-over on save; no data migration. Rollback: remove the link and popup; the carry-over change is independent and can be reverted with the `buildQuickApp2Config` edit.
