import {
  AttachmentStrategyType,
  type OrchestratorAttachmentStrategy,
  type RepresentationToolingFeature,
  type WebFetchFeature,
} from '@/types/quick-apps';

export enum AddOnsModalQueryParams {
  // Host-facing deep-link name; kept as-is so existing host URLs keep working.
  Modal = 'agentsAndToolsetsModal',
}

export const ORCHESTRATOR_ATTACHMENT_STRATEGY_VALUE: OrchestratorAttachmentStrategy = {
  type: AttachmentStrategyType.LazyOnDemand,
};

export const REPRESENTATION_TOOLING_FEATURE_VALUE: RepresentationToolingFeature = {
  add_attachment: true,
};

export const WEB_FETCH_FEATURE_VALUE: WebFetchFeature = {
  enabled: true,
};
