# Design

## Context

Attachment types is a ui-kit `AutocompleteTagInput` fed by `ATTACHMENT_TYPE_SUGGESTIONS` (`src/constants/attachment-types.ts`). Free text is already accepted without validation, and the `application_user-attachments` spec already requires saved values such as `image/*` to round-trip unchanged. The default max comes from the single constant `DEFAULT_MAX_INPUT_ATTACHMENTS`, used by the form loader (`quick-app-form-data.ts`) and the Attachments switch handler (`QuickApp2Form.tsx`). The schema does not supply these two values.

## Goals / Non-Goals

**Goals:**
- Make wildcard groups discoverable as suggestions.
- Change the default max with a single constant change.

**Non-Goals:**
- Validating the format of typed values.
- Reading the max default from the application type schema.
- Restricting suggestions to the selected model's `inputAttachmentTypes`.
- De-duplicating a group against concrete types it covers (e.g. `image/*` with `image/png`).

## Decisions

- **Groups first.** Group suggestions precede the concrete types, so typing a prefix such as `image/` shows the group at the top. Alternative: append them last. Rejected because the list shows at most 5 matches, so a trailing group would never appear for a prefix that has 5 or more concrete types.
- **Three groups, from existing types only.** `image`, `text`, `application` are the prefixes with several types in `MIMEType` / `ATTACHMENT_TYPE_SUGGESTIONS`. `chemical/` has a single type (`chemical/x-pdb`), so a group would add nothing; no prefix is introduced that the code does not already declare. Names are untranslated identifiers (`ANY-IMAGE`, ...), like the existing file-format names, so no i18n keys are added.
- **Constants only.** Groups are added as suggestion data next to the existing list, built the same way. No new component or schema rule.
- **Model interaction unchanged.** `supportsAttachments` (`build-quick-app-config.ts`) and `isProcessLargeFilesAvailable` only test that the model has any `inputAttachmentTypes`, so wildcards in the app's own types do not affect them.
- **Default 10 via the constant.** `DEFAULT_MAX_INPUT_ATTACHMENTS = 10`. The seeded-then-dropped logic compares against the constant, so it needs no change.

## Risks / Trade-offs

- Overlapping tags (`image/*` plus `image/png`) are allowed and saved as typed → harmless for the host; deduplication is out of scope.
- A user-saved `1` was previously indistinguishable from the seed on switch-off. With default `10` that case now keeps the user's `1` → acceptable, and the spec scenario is updated to use `10`.
