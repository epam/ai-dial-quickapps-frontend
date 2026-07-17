import type { ToolsetCredentialsLevel } from '@/types/dial-entities';

export enum InboundMessageType {
  TriggerSave = 'TRIGGER_SAVE',
  TriggerAutoSave = 'TRIGGER_AUTO_SAVE',
  Reset = 'RESET',
  ToolsetLoginResult = 'TOOLSET_LOGIN_RESULT',
}

export interface ToolsetLoginResultPayload {
  toolsetId: string;
  success: boolean;
  credentialsLevel?: ToolsetCredentialsLevel;
  reason?: string;
}

export enum OutboundMessageType {
  Ready = 'READY',
  DirtyState = 'DIRTY_STATE',
  SaveSuccess = 'SAVE_SUCCESS',
  SaveError = 'SAVE_ERROR',
  AutoSaveComplete = 'AUTO_SAVE_COMPLETE',
  HeightChange = 'HEIGHT_CHANGE',
  RequestToolsetLogin = 'REQUEST_TOOLSET_LOGIN',
}

export type InboundMessage =
  | { type: InboundMessageType.TriggerSave }
  | {
      type: InboundMessageType.TriggerAutoSave;
      payload?: { ignoreDirty?: boolean };
    }
  | { type: InboundMessageType.Reset }
  | ({ type: InboundMessageType.ToolsetLoginResult } & ToolsetLoginResultPayload);
