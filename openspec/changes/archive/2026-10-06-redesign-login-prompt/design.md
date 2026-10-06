## Context

`App.tsx` renders `<LoginScreen provider={provider} />` as its last branch ([App.tsx:130](../../../src/App.tsx)). That branch is reached when the session is unauthenticated, a provider was requested, and that provider is configured. Before this change, the component, then called `LoginPrompt` and renamed to `LoginScreen` ([LoginScreen.tsx](../../../src/components/LoginScreen/LoginScreen.tsx)) during implementation, rendered a hardcoded paragraph and a 1.0 `DialNeutralButton`, wired to `useAuth(provider)` ([useAuth.ts](../../../src/hooks/useAuth.ts)). The hook exposes `openLoginWindow` and `isWindowOpen`, and it already handles popup polling, auto-close and a blocked popup (it resets `isWindowOpen` when `window.open` returns `null`).

The design (screenshot attached to the change request) shows a centred group on the app background. From top to bottom:

1. a ~32px round badge with a thin border, holding a small lock glyph
2. a semibold title
3. a secondary-colour description
4. a compact, pill-shaped primary-tinted button: "Log in" plus an external-link icon

## Goals / Non-Goals

**Goals:**

- Match the design using 2.0 UI kit primitives and the theme tokens.
- Move every string in the prompt to i18n (`common` namespace).
- Keep the behaviour of `useAuth` and the props of `LoginScreen` the same, so `App.tsx` doesn't change.

**Non-Goals:**

- Restyling `ForbiddenPage`, `AuthError` or `LoadingScreen`, or moving their strings to i18n. This is a follow-up (see tasks §4).
- Any change to the auth flow, the chat-api calls, or host messaging.

## Decisions

1. **Compose the layout in `LoginScreen` instead of using `NoDataContent`.** The 2.0 `NoDataContent` has a title, a description and an icon, but no action slot. Its icon defaults to an empty-state illustration, and its semantics are "the list is empty". A plain flex column (`flex h-screen flex-col items-center justify-center`, matching `ForbiddenPage`'s existing shell) is fewer moving parts and keeps the button inside the group.
   - Rejected: wrapping `NoDataContent` and adding the button after it. The spacing would be uneven, and the result reads as a misused empty state.

2. **Use the 2.0 `NeutralButton` with `iconAfter`.** It is exported by `@epam/ai-dial-ui-kit@0.14.2`. It is the 2.0 `Button` with `variant={ButtonVariant.Neutral}` and the default solid appearance (`dial-kit-neutral-solid-button`). That gives the `bg-control-accent-alpha` light-blue fill, the accent text colour and the pill radius from the design, with no style overrides in the app. Icons use the kit's `DIAL_ICON_SIZE` and `DIAL_KIT_ICON_STROKE` constants.
   - *Updated during implementation:* the planned `Primary` + `Outlined` pairing doesn't exist in 0.14.2's `variantClassMap`. `Primary` only defines `Solid`, `Ghost` and `Link`, and `Secondary` has no styles at all.
   - Rejected: primary ghost with accent-alpha Tailwind overrides. This was the first version, and it overrode kit styles.
   - Rejected: plain `GhostButton`. It has no fill, unlike the design.
   - Rejected: keeping the 1.0 `DialNeutralButton`. It's the old generation, and its styling doesn't match the design.

3. **The lock badge is a styled `span`, not a UI kit component.** It is `IconLock` (`size={DIAL_ICON_SIZE.LG}`, `stroke={DIAL_KIT_ICON_STROKE}`) inside an `aria-hidden` `span` with `flex size-14 items-center justify-center rounded-full border border-secondary text-secondary`. No UI kit primitive covers a static icon badge, and `IconButton` would wrongly make it interactive.

4. **i18n keys go in the `common` namespace.** The prompt is not part of the editor form, and `common` already holds the shared auth-adjacent strings (`LoggedInToolset`, `ToolsetSignInFailed`). New `CommonI18nKeys` members:

   | Member | Value |
   |---|---|
   | `LoginScreenTitle` | `'Log in to configure your QuickApp'` |
   | `LoginScreenDescription` | `'Set up instructions, add-ons and settings.'` |
   | `LoginScreenAction` | `'Log in'` |
   | `LoginScreenWindowOpen` | `'Log-in window is open…'` |

   Each one also gets a matching entry in `common.json`, where key equals value, following the repo's convention.

5. **Semantics.**
   - The title is an `<h1>`, because the prompt is the whole page.
   - The description is a `<p>`.
   - The button is a native `<button>` rendered by `NeutralButton`.
   - Both icons get `aria-hidden`, so the button's accessible name is just the label.
   - Memoisation: the component stays wrapped in `React.memo`, as today. `openLoginWindow` is already a `useCallback` inside `useAuth`, so no new memoisation is needed.

6. **RTL.**
   - The column is centred and the text uses `text-center`, so neither depends on direction.
   - `IconExternalLink` gets `className="rtl:scale-x-[-1]"`, because its arrow is directional.
   - `IconLock` is symmetric and is not mirrored.
   - The gap between label and icon comes from the button's `iconAfter` layout, so no physical margins are added.

## States

| Condition | Rendered |
|---|---|
| Idle | Badge, title, description, enabled "Log in" button |
| Popup open (`isWindowOpen`) | Same layout. The button is disabled, with the label "Log-in window is open…" |
| Popup blocked | `useAuth` resets `isWindowOpen`, so the screen returns to Idle |
| Loading / provider missing / not configured | Not this component. `App.tsx` already renders `LoadingScreen` or `AuthError` for these cases |

## Risks / Trade-offs

- [The neutral solid button has a transparent border, while the screenshot seems to show a faint accent border] → Accepted in favour of using the kit component unmodified. Confirm against Figma before merging.
- [The copy changes from "Sign in" to "Log in"] → This is intentional, to match the design and the toolset login wording. No tests or e2e selectors in this repo reference the old text (checked with grep).
- [Only English locale files exist] → The keys are added to `common.json`. Future locales pick them up through the normal "adding a new locale" process.

## Migration Plan

This is a presentation-only change and needs no migration. To roll back, revert the commit.

## Open Questions

- Confirm the button's look, size and spacing against Figma (Decision 2).
