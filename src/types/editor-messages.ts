import type { ToolsetCredentialsLevel } from '@/types/dial-entities';

export enum InboundMessageType {
  TriggerSave = 'TRIGGER_SAVE',
  TriggerAutoSave = 'TRIGGER_AUTO_SAVE',
  Reset = 'RESET',
  ToolsetLoginComplete = 'quickapps/TOOLSET_LOGIN_COMPLETE',
}

export interface ToolsetLoginCompletePayload {
  toolsetId: string;
  credentialsLevel: ToolsetCredentialsLevel;
  success: boolean;
}

export enum OutboundMessageType {
  Ready = 'READY',
  DirtyState = 'DIRTY_STATE',
  SaveSuccess = 'SAVE_SUCCESS',
  SaveError = 'SAVE_ERROR',
  AutoSaveComplete = 'AUTO_SAVE_COMPLETE',
  HeightChange = 'HEIGHT_CHANGE',
}

export type InboundMessage =
  | { type: InboundMessageType.TriggerSave }
  | {
      type: InboundMessageType.TriggerAutoSave;
      payload?: { ignoreDirty?: boolean };
    }
  | { type: InboundMessageType.Reset }
  | { type: InboundMessageType.ToolsetLoginComplete; payload: ToolsetLoginCompletePayload };
