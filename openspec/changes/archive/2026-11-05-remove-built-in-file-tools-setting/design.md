# Design

## Context

`fileTools` is a boolean form field loaded from `features.dial_files` (absent → `true`) and saved as
`{}` / `null` (`src/form/quick-app-form-data.ts:116`, `src/form/build-quick-app-config.ts:157`).
`features.dial_files` is also listed in `FORM_OWNED_PATHS` (`src/utils/quick-app-extra-config.ts:31`),
so it is stripped from the extra config and re-created from the form on every save. The Edit JSON
popup is built from the same split. See proposal.md for the motivation.

## Goals / Non-Goals

**Goals:**
- No `fileTools` anywhere in the form, popup, types, schema or i18n.
- Never write `features.dial_files`; never alter a stored one.

**Non-Goals:**
- No new UI to manage file tools (Edit JSON remains the escape hatch).
- No migration of stored values; no change to `QuickApp2Config.features.dial_files` typing.

## Decisions

1. **Remove `features.dial_files` from `FORM_OWNED_PATHS`** so it flows through the existing extra
   config passthrough (`features: { ...extraFeatures, ... }`). Alternative: special-case the builder
   to copy the loaded value — rejected, it duplicates what the extra-config mechanism already does
   and would diverge from what Edit JSON shows. A consequence is that `dial_files` now appears in
   Edit JSON as an extra, and a user edit there is saved as typed.
2. **Delete the `dial_files` line from the builder** instead of writing `undefined`, so the key is
   absent in the request body for new apps. An explicit `null` would tell the backend to disable
   the tools, which is not the intent.
3. **Delete the i18n keys**, not deprecate them: the keys have no other consumer, and the repo's
   "no duplicate/unused keys" convention applies.
4. **Spec overlap:** the in-flight change `keep-translations-on-save-without-general` also modifies
   `application_editing` ("Save request"). This change modifies only "Application properties
   written on save", so the deltas do not collide. The illustrative request example in "Save
   request" still shows `"dial_files": null`; fix it in the main spec after that change archives.

## Risks / Trade-offs

- [Apps that relied on the old default `{}` lose nothing: stored values are untouched. New apps get
  the backend default (all tools per #710), which is the intent] → no mitigation needed.
- [Backend without PR #710 gives new apps no file tools] → release order noted in the proposal.
- [Edit JSON now exposes `dial_files`] → acceptable; it is the only way to change it and matches
  other extras.
