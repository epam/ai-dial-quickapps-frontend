## Context

The Configuration column (`ModelConfigurationSection.tsx:43-104`) currently renders three things:

- an `h2` "Configuration",
- a `DialFormItem label="Model"` that wraps `ModelField`,
- Temperature and Process files.

`ModelField` (`src/components/Orchestrator/ModelField.tsx`) owns the picker state (`isOpen`, `search`, `activeTab`) and renders two things:

- the collapsed card: icon, name, a `Version:` prefix with an inline `DialSelect` or text, and a `DialLinkButton` "Change";
- the `DialPopup` picker.

The target design has a `DEFAULT MODEL` caption with a `✎ Change` pill on the end side of the caption row. Below it is a raised card showing the icon tile, an accent `MODEL` label, the name, and the plain version.

## Goals / Non-Goals

**Goals:**

- Introduce a reusable `SectionRow` header (caption, action slot, description).
- Restyle the selected-model card and move **Change** into the header.
- Keep `model` field semantics, the picker, and the loading, error and read-only states unchanged.

**Non-Goals:**

- Model options and Settings blocks.
- Changes to the picker popup.

## Decisions

### D1. `ModelField` renders the whole Default model block

`ModelField` already owns `isOpen`/`handleOpen` and the disabled/loading logic that gates **Change**. Having it render `<SectionRow title={t(DefaultModel)} action={<ChangeButton/>}>` keeps all of that local. No state is lifted, and the component needs no `forwardRef` or imperative handle.

`ModelConfigurationSection` drops the `DialFormItem label="Model"` wrapper and renders `ModelField` directly inside the `Controller`.

- _Alternative:_ lift `isOpen` into `ModelConfigurationSection` and pass `onOpen` down. Rejected because it spreads the picker state across two files for no benefit.

### D2. `SectionRow` API (`src/components/common/SectionRow/SectionRow.tsx`)

`SectionRow` replaces the header markup that `AddOnRow` already had (title, end-side action, description, content). It is the one shared row component: `AddOnRow` becomes a thin wrapper that passes its Add button as `action`, and `ModelField` passes **Change**. The two looks differ only in typography, selected by `variant: SectionRowVariant` (`Row` for Add-ons rows, `Caption` for Configuration blocks; enum in `src/types/section-row.ts`).

```ts
export interface SectionRowProps {
  title: string;
  action?: ReactNode;
  description?: string;
  variant?: SectionRowVariant;
  className?: string;
  children?: ReactNode;
}
```

- The section uses `useId()` for the heading id and renders `<section aria-labelledby={id}>`.
- The header row is `flex items-center justify-between gap-2`.
- The title is an `h3`. In the `Caption` variant (Configuration blocks, under the `h2` "Configuration") it uses `dial-caption-lead-semi-text text-secondary`, which is already uppercase with letter spacing; in the `Row` variant (Add-ons) it keeps `dial-small-semi-text text-primary`.
- `action` goes in a `shrink-0` wrapper and is rendered only when provided.
- `description` is a `p` (`dial-tiny-text` for `Caption`, `dial-small-text` for `Row`, both `text-secondary`), rendered only when provided.
- Children go in a content wrapper (`relative` for `Row`, so selectors can position their popovers).
- No collapsible behaviour and no `aria-expanded`.
- The component is presentational, with no memoisation needs. Callers pass a stable `action` element. This is not critical, because the section re-renders with its parent anyway.

### D3. Change button: ui-kit 2.0 `Button`

`DialLinkButton` is flagged by the ui-kit MCP as 1.0, superseded by `LinkButton`/`Button`. The mockup shows a small pill with a pencil icon and an accent outline, so the button uses:

`<Button appearance={ButtonAppearance.Outlined} variant={ButtonVariant.Primary} size={ElementSize.Small} iconBefore={<IconPencil size={16}/>} label={t(Change)} />`

- The exact variant/appearance pair is checked visually against the mockup during implementation. Fall back to `Secondary` if `Primary` outlined is too strong.
- The read-only tooltip uses `tooltipProps` with the existing `tooltip` string, when present. The outer `title={tooltip}` stays on the block for the card.
- `IconPencil` comes from `@tabler/icons-react`. It is symmetric, so it gets no `rtl:` mirroring.
- Rule: it is disabled when `disabled || isModelInfoLoading`, unchanged from today.

### D4. Card layout: ui-kit `EntityIdentity`

The identity row is the new kit 2.0 `EntityIdentity`, moved from `ai-dial-chat/libs/chat-shared/src/components/EntityHeader`. In the kit it is built on `Avatar`, `EllipsisTooltip` and `Highlight`, with type colours as Tailwind visual tokens and no inline styles.

```tsx
<EntityIdentity
  item={{
    type: getModelEntityType(selectedModel.type),
    name: displayName,
    version: selectedModel.version,
    iconUrl: resolvedIconUrl,
  }}
  labels={{ type: t(getModelTypeI18nKey(selectedModel.type)) }}
  hasFeaturedTag={false}
  iconSize={44}
  headingLevel={4}
  nameClassName="dial-body-semi-text"
/>
```

- `iconUrl` goes through the same `resolveIconUrl` that `ModelIcon` uses today, so theme-relative icon paths keep working.
- Container: `rounded-[16px] border bg-layer-raised p-3`, composed with `mergeClasses` instead of `classNames` in the touched JSX:
  - `border-error` when there is an error, otherwise `border-tertiary`;
  - `opacity-50` when disabled.
- There is no `Version:` prefix, because the mockup shows the bare version.
- Loading state: the existing skeletons (a 44px circle plus text lines, `SKELETON_COLOR`), shown in place of `EntityIdentity`.
- Unknown id: `EntityIdentity` is not used. The raw id is rendered as `dial-body-semi-text text-secondary`, with no label and no version.

### D5. Type mapping lives in utils

Per the module-boundary rule, the component file gets no helpers. Both helpers go in `src/utils/application.ts`, the existing home of entity helpers:

- `getModelEntityType(type)`: `'application'` maps to `EntityType.Agent`, everything else to `EntityType.Model`.
- `getModelTypeI18nKey(type)`: `'application'` maps to `QuickAppEditorI18nKeys.Agent`, everything else to `QuickAppEditorI18nKeys.Model`.

Both use a `switch`.

### D6. Removing the inline version select

The following become dead code and are deleted: `cardVersionOptions`, `hasVersions`, the inline `DialSelect`, and the `VersionPrefix` usage in the collapsed card.

- `selectedGroup` is still needed if referenced elsewhere. Otherwise it is removed as well.
- `VERSION_SELECT_CLASS` and `VersionPrefix` stay, because `ModelCard` in the popup still uses them.

### D7. i18n

Add the following to the `QuickAppEditorI18nKeys` enum in `src/constants/i18n.ts` and to `src/i18n/locales/quick-app-editor.json`:

- `DefaultModel = 'Default model'`
- `Agent = 'Agent'`

The `Model` and `Change` keys are reused. Only the `en` locale is registered (`src/i18n/index.ts`), so there is one JSON file to update.

### D8. RTL

- The header uses flex with `justify-between`, so it flips naturally.
- The card uses flex row and `gap-*`, with no physical margins.
- All text is `text-start` by default.
- No icon needs mirroring.
- `title`/tooltip behaviour is direction-agnostic.

## Risks / Trade-offs

- **Removing the inline version switch adds one click to change version** → this is accepted per the user decision. The picker cards keep the per-entity version selector.
- **`ModelField` grows a header responsibility** → it stays cohesive, because it is the Default model block. The file is already 454 lines, but extracting the popup is out of scope (follow-up).
- **Dependency on an unreleased kit component** → implementation of task group 2 waits for the ui-kit release with `EntityIdentity`. Until then it can be developed against a local kit build (`npm link` or `file:`), but it must not be merged that way.
- **The kit `EntityIdentity` uses `Avatar` initials colours, not chat's sunken badge** → this is a small visual difference from the chat catalog. It is acceptable because it matches the mockup (a "DC" tile on a colour).
- **Button variant mismatch with the design** → this is resolved during implementation via the visual check in D3. It has no behavioural impact.

## Migration Plan

Presentation only. The change ships in one PR and is reverted by reverting it.

## Open Questions

- None blocking. Follow-ups:
  - split the `ModelField` popup into its own component.
