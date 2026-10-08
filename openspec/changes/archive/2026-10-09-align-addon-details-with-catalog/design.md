# Design

## Context

- Catalog reference: `ai-dial-chat/libs/catalog/src/components/Details/DetailsPanel.tsx` (details view) and `Header/Header.tsx`. The header is `EntityHeader` (`iconSize 52`, name `dial-body-semi-text`, `FolderPath` footer with `dial-tiny-text` / `dial-tiny-semi-text`) inside `flex flex-col gap-3 px-6 py-4`; the action row is `flex flex-wrap items-center gap-2 ps-[60px]`. Content is a `flex flex-col gap-4` column; panels other than Overview get `px-6`. Loading is `<Skeleton showTitle={false} paragraph={{ rows: 1, width: '72px' }} active />` in a `role="status"` element.
- `DetailsPanel`, `Header` and `CredentialsBanner` are not exported by `@epam/ai-dial-catalog`; `AboutTab`, `ContentTab`, `OverviewTab`, `PricingTab`, `LimitsTab`, `ToolsTab` are. `EntityHeader` is exported by `@epam/ai-dial-chat-shared`; `FolderPath`, `Skeleton`, `EntityIdentity` by the ui-kit.
- `useCatalogItemDetails` already returns `onLoadContentFile(fileId)` (text of a file in the open skill's package); skill details already carry `promptContent.files` and `selectedFileId`.

## Decisions

1. **Identity block — superseded by `adopt-catalog-details-header`.** The header is now the catalog `DetailsHeader`, with the type caption translated through `texts.entityTypeLabels` (epam/ai-dial-chat#9343). The first iteration used the ui-kit `EntityIdentity` configured as the catalog's: `EntityHeader` renders `item.type` verbatim through `EntityTypeLabel`, which would break the localisation requirement. `EntityIdentity` has the same parts plus `labels.type`. Settings: `iconSize={52}`, `nameClassName="dial-body-semi-text"`, `footer={<FolderPath segments={folder} labelClassName="dial-tiny-text" leafClassName="dial-tiny-semi-text" ariaLabel={…} />}`. The badge overlay box grows to 52 px.

2. **Action row** moves into the header column, `ps-[60px]`, rendered only when there are actions (as the catalog's `hasActionRowContent`).

3. **Body** becomes a `flex flex-col gap-4` column: banner, tab row (with the skeleton), error row, panel. The extra `pb-4`/`pt-4` paddings go.

4. **Content file selection** lives in `useContentFileSelection(item, onLoadContentFile)` (`src/hooks/use-content-file-selection.ts`), a reduced port of `DetailsPanel`'s logic: `pickedFile` (id + Markdown preview or `null` for failed), loading flag, expanded folder ids (all folders, reset per item), selector open state, a generation counter that drops stale responses. Choosing the base file clears the pick without a request. Only Markdown/text previews are produced (no image/binary previews: `onLoadContentFilePreview` is not used).

5. **i18n** (`quickAppEditor`): `FolderPathAriaLabel`, `Markdown*` (5), `ContentFile*` (5: selector aria label, count with `{{count}}`, loading, unsupported, error). Added to `useCatalogDetailsLabels` under `tabs.markdown` and `tabs.contentFiles`.

## Risks / Trade-offs

- [`EntityIdentity` and `EntityHeader` may drift visually] → both come from the same design; differences, if any, are the kit's to fix.
- [Large non-Markdown files] → shown as text via the Markdown renderer, as `DetailsPanel` does without `onLoadContentFilePreview`.
