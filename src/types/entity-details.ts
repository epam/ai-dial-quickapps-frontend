import type { CatalogDetailsTab, ToolsLabels } from '@epam/ai-dial-catalog';
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

/** The tabs a details popup can show — every catalog tab but Connect. */
export type AddOnDetailsTab = Exclude<CatalogDetailsTab, CatalogDetailsTab.Api>;

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
}

/** Texts the catalog mappers build Overview and Limits from, in `useCatalogItemDetails`. */
export interface CatalogMapperLabels {
  entityDetails: EntityDetailsLabels;
  deploymentLimits: DeploymentLimitsLabels;
  skillOverview: SkillOverviewLabels;
  promptOverview: PromptOverviewLabels;
}
