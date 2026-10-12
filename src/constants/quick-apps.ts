import {
  AttachmentStrategyType,
  DialAppTransportType,
  type OrchestratorAttachmentStrategy,
  type RepresentationToolingFeature,
  type WebFetchFeature,
} from '@/types/quick-apps';

export enum AddOnsModalQueryParams {
  // Host-facing deep-link name; kept as-is so existing host URLs keep working.
  Modal = 'agentsAndToolsetsModal',
}

/**
 * The transport an MCP-capable agent uses when none is saved: what save writes and what the
 * agent's Settings tab shows checked.
 */
export const DEFAULT_AGENT_TRANSPORT = DialAppTransportType.MCP;

export const ORCHESTRATOR_ATTACHMENT_STRATEGY_VALUE: OrchestratorAttachmentStrategy = {
  type: AttachmentStrategyType.LazyOnDemand,
};

export const REPRESENTATION_TOOLING_FEATURE_VALUE: RepresentationToolingFeature = {
  add_attachment: true,
};

export const WEB_FETCH_FEATURE_VALUE: WebFetchFeature = {
  enabled: true,
};

/** Orchestrator temperature range and step, shared by the Advanced Settings slider and its value input. */
export const MIN_TEMPERATURE = 0;
export const MAX_TEMPERATURE = 1;
export const TEMPERATURE_STEP = 0.1;
