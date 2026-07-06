---
globs: '**/*.tsx'
applyTo: '**/*.tsx'
alwaysApply: false
---

# JSX / TSX conventions

## 'use client' directive

Add `'use client'` at the top of any file that uses browser APIs, React state/effects, event handlers, or interactivity. Server Components (pure data/layout with no interactivity) must not have it. When in doubt, mark it as a Client Component.

## Component declaration

Declare components as arrow-function constants with an explicit `FC` type:

```tsx
import { FC, memo } from 'react';

interface MyComponentProps {
  label: string;
}

const MyComponent: FC<MyComponentProps> = ({ label }) => {
  return <span>{label}</span>;
};

export default memo(MyComponent);
```

- Always use `{ComponentName}Props` as the props interface name.
- Always export the component as a memoized default export: `export default memo(ComponentName)`.
- Do not use `function` declarations for React components.

## Tailwind over inline style

Always prefer Tailwind utility classes over the `style` prop. Use `style` only for dynamic computed values (e.g. pixel measurements from JS, CSS custom properties set by user data) that cannot be expressed as static Tailwind classes.

## Conditional class composition

Compose conditional class strings with `classNames` from the `classnames` package — not template-literal concatenation:

```tsx
import classNames from 'classnames';

// Correct
<div className={classNames('base-class', isActive && 'active', { disabled: isDisabled })} />

// Wrong
<div className={`base-class ${isActive ? 'active' : ''}`} />
```

## Component-first development

**Always prefer UI kit components over raw HTML elements.** Before reaching for `<button>`, `<input>`, `<select>`, or other HTML primitives:

1. Check if a suitable `Dial*` component exists using the MCP tools (`searchEntity`, `getEntityDetails`).
2. Use raw HTML only as a last resort, and only when no UI kit component meets the requirements.

## Semantic HTML

Use semantic HTML elements (`button`, `nav`, `main`, `section`, `label`) before reaching for `div`/`span`.

## Prop passthrough with rest spread

When a wrapper component passes most of its props unchanged to an inner component, destructure only the props the wrapper itself uses and spread the rest:

```tsx
// Correct
const Outer: FC<OuterProps> = ({ wrapperOnly, derived: raw, ...innerProps }) => (
  <Inner {...innerProps} derived={transform(raw)} />
);

// Wrong — every prop listed explicitly
const Outer: FC<OuterProps> = ({ wrapperOnly, foo, bar, baz }) => (
  <Inner foo={foo} bar={bar} baz={baz} />
);
```

## aria-label values go through i18n

All `aria-label` values must use the `useTranslation` hook with a key from the appropriate namespace. Never hardcode English strings as `aria-label` values.
