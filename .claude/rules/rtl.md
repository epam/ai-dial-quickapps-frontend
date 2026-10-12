---
alwaysApply: true
applyTo: '**'
---

# RTL and Arabic language support

All UI must support Arabic (`ar`) and any other right-to-left locale. The active language drives `document.documentElement.dir` — `rtl` or `ltr` — which Tailwind's `rtl:` / `ltr:` variants and CSS logical properties key off.

## Direction attribute

The `<html>` element's `dir` and `lang` attributes must be set dynamically — in this Vite SPA, from `src/components/I18nProvider/I18nProvider.tsx` (mounted in `src/main.tsx`), which sets `dir` from i18next's `i18n.dir(language)` (it already knows the RTL languages, such as Arabic `ar`, Hebrew `he`, Persian `fa`, Urdu `ur`) and follows every language change. Never hardcode `dir`; `index.html`'s `lang="en"` is only the pre-mount default that `I18nProvider` overwrites.

Today only English ships (`lng: 'en'` in `src/i18n/index.ts`, nothing switches the language), so `dir` is always `ltr` in production. The rules below still apply to every file, so the UI is ready when an RTL locale is added; tests exercise RTL by setting `document.documentElement.dir = 'rtl'`. See the `i18n` spec.

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

Locale files are one per namespace, not one per language: `src/i18n/locales/common.json` and `src/i18n/locales/quick-app-editor.json` hold the English text (each key is its own English text).

1. Add the language's files for both namespaces, `common` and `quickAppEditor`, with every key of the English files.
2. Register them under `resources.<lang>` in `src/i18n/index.ts`.
3. Decide how the active language is chosen (from the host, the URL or the browser) — nothing selects it today, and there is no language selector UI. That is a `host-integration` / `i18n` spec change.
4. Nothing to add for an RTL language: `I18nProvider` takes the direction from `i18n.dir()`.
