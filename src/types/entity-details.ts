import type {
  AboutTabProps,
  ApiTabProps,
  CatalogDetailsTab,
  ItemDetailsTexts,
  ToolsLabels,
} from '@epam/ai-dial-catalog';
import type { CatalogEntityType } from '@epam/ai-dial-chat-shared';
import type {
  DeploymentLimitsLabels,
  EntityDetailsLabels,
  PromptOverviewLabels,
  SkillOverviewLabels,
} from '@epam/ai-dial-chat-hooks/catalog';

/** Load state of an add-on's catalog details (Overview, Pricing, Limits, Tools…). */
export enum DetailsStatus {
  /** Nothing to load — the entity is not in the catalog. */
  Idle = 'idle',
  Loading = 'loading',
  Ready = 'ready',
  Error = 'error',
}

/** The tabs a details popup can show — every catalog tab. */
export type AddOnDetailsTab = CatalogDetailsTab;

/** Texts the catalog tab components render, in the details popup shell. */
export interface CatalogTabsLabels {
  tabs: Record<AddOnDetailsTab, string>;
  yes: string;
  no: string;
  tools: Partial<ToolsLabels>;
  pricesSection: string;
  characterPricesSection: string;
  usageLimitsSection: string;
  loading: string;
  failed: string;
  retry: string;
  markdown: CatalogMarkdownLabels;
  contentFiles: CatalogContentFileLabels;
  connect: CatalogConnectLabels;
  /** The catalog `DetailsHeader`'s credentials action and personal API-key popover texts. */
  header: ItemDetailsTexts;
  /** The header's type caption per entity type. */
  entityTypeLabels: Partial<Record<CatalogEntityType, string>>;
}

/** Labels of the catalog Connect tab (`ApiTab`). */
export type CatalogConnectLabels = Pick<
  ApiTabProps,
  | 'resourceSectionLabel'
  | 'endpointSectionLabel'
  | 'snippetSectionLabel'
  | 'modelIdLabel'
  | 'endpointLabel'
  | 'requestExampleLabel'
  | 'responseSchemaLabel'
  | 'copyAriaLabel'
  | 'copiedStatusLabel'
>;

/** Labels of the catalog Markdown renderer; the catalog does not export the type itself. */
export type CatalogMarkdownLabels = NonNullable<AboutTabProps['markdownLabels']>;

/** Labels of the skill package file selector in the catalog `ContentTab`. */
export interface CatalogContentFileLabels {
  selector: string;
  count: (count: number) => string;
  loading: string;
  unsupported: string;
  error: string;
}

/** Texts the catalog mappers build Overview and Limits from, in `useCatalogItemDetails`. */
export interface CatalogMapperLabels {
  entityDetails: EntityDetailsLabels;
  deploymentLimits: DeploymentLimitsLabels;
  skillOverview: SkillOverviewLabels;
  promptOverview: PromptOverviewLabels;
}
