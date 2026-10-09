import type {
  AboutTabProps,
  ApiTabProps,
  CatalogDetailsTab,
  ItemDetailsTexts,
  ToolsLabels,
} from '@epam/ai-dial-catalog';
import type {
  DeploymentLimitsLabels,
  EntityDetailsLabels,
  PromptOverviewLabels,
  SkillOverviewLabels,
} from '@epam/ai-dial-chat-hooks/catalog';
import type { ReactNode } from 'react';

/** Load state of an add-on's catalog details (Overview, Pricing, Limits, Tools…). */
export enum DetailsStatus {
  /** Nothing to load — the entity is not in the catalog. */
  Idle = 'idle',
  Loading = 'loading',
  Ready = 'ready',
  Error = 'error',
}

/** This app's own details tabs, shown after the catalog tabs. */
export enum AppDetailsTab {
  Settings = 'settings',
}

/** The tabs a details popup can show — every catalog tab, then this app's own. */
export type AddOnDetailsTab = CatalogDetailsTab | AppDetailsTab;

/** An app-owned details tab, with its label already translated. */
export interface AddOnAppTab {
  id: AppDetailsTab;
  label: string;
  content: ReactNode;
}

/** Texts the catalog tab components render, in the details popup shell. */
export interface CatalogTabsLabels {
  tabs: Record<CatalogDetailsTab, string>;
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
  /** The catalog `DetailsHeader`'s texts: type captions, credentials action and API-key popover. */
  header: ItemDetailsTexts;
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
