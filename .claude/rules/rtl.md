---
alwaysApply: true
applyTo: '**'
---

# RTL and Arabic language support

All UI must support Arabic (`ar`) and any other right-to-left locale. The active language drives `document.documentElement.dir` — `rtl` or `ltr` — which Tailwind's `rtl:` / `ltr:` variants and CSS logical properties key off.

## Direction attribute

The `<html>` element's `dir` attribute must be set dynamically in `src/app/layout.tsx`. When the active language is RTL (Arabic `ar`, Hebrew `he`, Persian `fa`, Urdu `ur`), set `dir="rtl"`; otherwise `dir="ltr"`. Never hardcode `dir` or `lang` as static HTML attributes.

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

1. Create `src/i18n/locales/<lang>.json` (copy keys from existing locale files for each namespace: `marketplace`, `common`, `settings`, `chat`).
2. Register the locale in `src/i18n/index.ts`.
3. Add the locale to the language selector UI.
4. If the locale is RTL, add its language code to the RTL language list in the dir-switching logic in `src/app/layout.tsx`.
