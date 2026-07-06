export enum SkillValidationStatus {
  Unknown = "unknown",
  Validating = "validating",
  Valid = "valid",
  Invalid = "invalid",
}

export interface SkillValidationState {
  status: SkillValidationStatus;
  message?: string;
}

export enum AgentSkillsModalView {
  List = "list",
  Create = "create",
  Edit = "edit",
}
