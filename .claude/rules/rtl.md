---
alwaysApply: true
applyTo: '**'
---

# RTL and Arabic language support

All UI must support Arabic (`ar`) and any other right-to-left locale. The active language drives `document.documentElement.dir` — `rtl` or `ltr` — which Tailwind's `rtl:` / `ltr:` variants and CSS logical properties key off.

## Direction attribute

The `<html>` element's `dir` and `lang` attributes must be set dynamically — in this Vite SPA, from `src/i18n/config.ts` (imported for its side effects by `src/main.tsx`), the same file as ai-dial-chat's. It sets `lang` to `i18n.resolvedLanguage` and `dir` to `rtl` when that language's base code is in `RTL_LANGUAGES` (`ar`, `he`, `fa`, `ur`), on start-up and on every language change. Because it uses the *resolved* language, a detected RTL language without resources stays `ltr`. Never hardcode `dir`; `index.html`'s `lang="en"` is only the default until the config module runs.

Today only English ships (`en.json` is the only locale; the detector reads localStorage then the browser, and anything without resources falls back to `en`), so `dir` is always `ltr` in production. The rules below still apply to every file, so the UI is ready when an RTL locale is added; tests exercise RTL by setting `document.documentElement.dir = 'rtl'`. See the `i18n` spec.

## Tailwind: logical over physical

Use **logical** direction utilities everywhere text or element direction should follow the writing direction. Never use physical-direction utilities for this purpose.

| Physical (forbidden for directional use) | Logical (required)            |
| ---------------------------------------- | ----------------------------- |
| `ml-*` / `mr-*`                          | `ms-*` / `me-*`               |
| `pl-*` / `pr-*`                          | `ps-*` / `pe-*`               |
| `text-left` / `text-right`               | `text-start` / `text-end`     |
| `left-*` / `right-*`                     | `start-*` / `end-*`           |
| `border-l-*` / `border-r-*`              | `border-s-*` / `border-e-*`   |
| `rounded-l-*` / `rounded-r-*`            | `rounded-s-*` / `rounded-e-*` |

In `.css` files use CSS logical properties: `margin-inline-start/end`, `padding-inline-start/end`, `inset-inline-start/end`, `border-inline-start/end`.

**Physical classes are allowed** only for elements that must NOT flip: symmetric overlays spanning the full width (`inset-x-0`), decorative elements, or anything explicitly pinned to a physical screen edge with an `rtl:` counterpart alongside.

## Directional icons

Icons with inherent left/right meaning (back/forward arrows, chevrons used for navigation or expand/collapse) must be mirrored in RTL:

```tsx
<IconChevronRight className="rtl:scale-x-[-1]" />
```

Symmetric icons (×, +, ⚙, ↑, ↓) must NOT be flipped.

## Centering tricks

`left-1/2 -translate-x-1/2` centers an absolutely-positioned element and is direction-agnostic — leave it as-is.

## Adding a new locale

Same steps as ai-dial-chat. Locale files are one per language in the default `translation` namespace: `src/i18n/locales/en.json` holds the English text under semantic keys.

1. Add `src/i18n/locales/<lang>.json` with every key of `en.json`.
2. Register it under `resources.<lang>.translation` in `src/i18n/config.ts`.
3. There is no language selector in QuickApps (chat has `SUPPORTED_LANGUAGES`); the language comes from the detector (localStorage `i18nextLng`, then the browser). Taking it from the host is a `host-integration` / `i18n` spec change.
4. If the language is right-to-left, add its code to `RTL_LANGUAGES` in `src/i18n/config.ts` (`ar`, `he`, `fa`, `ur` are already there).
