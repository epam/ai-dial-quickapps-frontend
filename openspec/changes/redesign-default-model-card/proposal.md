## Why

The new Configuration-column design groups the right column into titled blocks: an uppercase caption, an optional action on the end side, and an optional description. Examples are `DEFAULT MODEL [Change]`, `MODEL OPTIONS [+ Add]` and `SETTINGS [Advanced]`. Today the model selector is a `DialFormItem` labelled "Model" that wraps a sunken card. That card holds its own `Change` link and an inline version `DialSelect`. It does not match the target design (`src/components/Orchestrator/ModelField.tsx:295-363`).

This change ships the first block, Default model. It also introduces the shared section header that the later blocks (Model options, Settings) will reuse, so those blocks don't each reinvent the header with absolute positioning. Absolute positioning is what Add-ons does today (`src/components/common/SkillsSelector/SkillsSelector.tsx:60-73`, `addButtonClassName="!top-[-56px]"`).

## What Changes

- Add a shared, presentational `ConfigurationSection` component in `src/components/common/`. It renders:
  - an uppercase caption heading,
  - an optional end-aligned action slot,
  - an optional secondary description,
  - its children.
- Replace the "Model" `DialFormItem` in `ModelConfigurationSection` with a `ConfigurationSection` titled **Default model**.
  - The section header's action slot holds a **Change** button with a pencil icon.
  - The button opens the existing model picker popup.
- Render the selected-model card with the ui-kit 2.0 **`EntityIdentity`**. This is chat's `EntityHeader` from `ai-dial-chat`'s `libs/chat-shared`, moved into the kit under a new name, so chat and quickapps share one implementation. It shows:
  - the icon, as a square `Avatar` with an initials fallback,
  - an uppercase type label coloured by type: **Model** in blue, **Agent** in green, matching the chat catalog,
  - the model name,
  - the version as plain secondary text next to the name.

  Labels are passed translated through `labels.type`.

- Bump `@epam/ai-dial-ui-kit` to the first release that exports `EntityIdentity` and `EntityType`.
- **Remove** the inline version `DialSelect` from the card. A different version is still chosen through the picker popup, whose cards keep their version selector.
- Keep these behaviours unchanged:
  - the loading skeleton,
  - the validation-error border and message,
  - the read-only/shared disabled state and tooltip,
  - the picker popup (search, Favorites/Catalog tabs, retry),
  - the `model` form value.
- Not breaking: there are no form-schema, persistence or API changes.

## Non-goals

- The **Model options** list (additional models). It needs a new form field and an `application_properties` mapping, so it is a separate change.
- The **Settings** block (Attachments toggle, Create sub-agents, Advanced link).
- Moving Temperature or Process files into new blocks. They stay as they are below Default model.
- Migrating the existing Add-ons rows onto `ConfigurationSection`. This is recorded as a follow-up.
- Switching `ai-dial-chat` from its local `EntityHeader` to the kit `EntityIdentity`. That belongs to the chat team.

## Alternatives considered

1. **Baseline: restyle `ModelField` in place.** The `Change` button would stay inside the card. This was rejected because the design puts the action in the section header, and the next two blocks would need the same header again.
2. **Extend `FormCollapsibleSection` with an action slot.** This was rejected because that component is a collapsible disclosure (`src/components/common/FormCollapsibleSection.tsx`) and the new blocks are always open. Mixing both would add a mode flag and `aria-expanded` noise.
3. **Pick: a new non-collapsible `ConfigurationSection`, with `ModelField` exposing its open handler to the header.** This adds one small component and moves no state between contexts.

## Acceptance criteria

- The Configuration column shows the **DEFAULT MODEL** caption. The **Change** action sits on the end side of that caption, and the selected-model card sits below it, matching the mockup.
- The card shows the icon, the translated uppercase type label, the name and the plain-text version. It has no version dropdown.
- **Change** opens the existing picker. Selecting a model or version updates `model` exactly as before.
- In the read-only/shared state, **Change** is disabled and shows the shared tooltip. While model info is loading, the skeleton shows and **Change** is disabled.
- A validation error on `model` still shows the error border and message.
- The layout mirrors correctly under `dir="rtl"`.
- Updated tests pass, and `npm run lint` and `npm run typecheck` are clean.

## Rollback / compatibility

The change is presentation-only. It has no data, schema or API impact, so reverting the commit restores the previous card.

## Capabilities

### New Capabilities

- `orchestrator_model-selection`: how the Default model block presents the selected orchestrator model and how the picker is opened. This is the spec-id proposed in `docs/TECH_DEBT.md` under "Orchestrator / model selection".

### Modified Capabilities

- `application_editor-layout`: in the requirement "Configuration contains existing model controls", the model selector is now presented as the **Default model** block instead of a "Model" form item. Its value and conditional behaviour are unchanged.

## Impact

- **Code:**
  - `src/components/Orchestrator/ModelField.tsx`
  - `src/components/Orchestrator/ModelConfigurationSection/ModelConfigurationSection.tsx` and its test
  - new `src/components/common/ConfigurationSection/`
  - `src/constants/i18n.ts`
  - `src/i18n/locales/quick-app-editor.json`
- **i18n:** new `quickAppEditor` keys `DefaultModel` ("Default model") and `Agent` ("Agent"). In the DIAL catalog an `application` deployment is called an Agent. The model type label and the **Change** button reuse the existing `quickAppEditor` keys `Model` and `Change`. Uppercasing is done in CSS (`uppercase`), not in the strings.
- **RTL:** the header uses logical/flex alignment (`justify-between`, `ms-*`/`me-*`, `text-start`). The pencil icon is symmetric and must not be mirrored.
- **Dependency:** this change needs the ui-kit release that adds `EntityIdentity` (ui-kit branch `feat/entity-identity`), followed by a `package.json` bump. The **Change** button uses the 2.0 `Button` already in `^0.14.0`.
- **Cross-cutting:** none. There are no auth, host-integration or chat-api changes.
