import type { ToolsetCredentialsLevel } from '@/types/dial-entities';

export enum InboundMessageType {
  TriggerSave = 'TRIGGER_SAVE',
  TriggerAutoSave = 'TRIGGER_AUTO_SAVE',
  Reset = 'RESET',
  ToolsetLoginResult = 'TOOLSET_LOGIN_RESULT',
  ToolsetLogoutResult = 'TOOLSET_LOGOUT_RESULT',
}

export interface ToolsetCredentials {
  authenticationType: 'NONE' | 'API_KEY' | 'OAUTH';
  userStatus?: 'SIGNED_IN' | 'SIGNED_OUT' | 'FAILED';
  globalStatus?: 'SIGNED_IN' | 'SIGNED_OUT' | 'FAILED';
  isPublic?: boolean;
  isManageableByAdmin?: boolean;
  apiKeyHeader?: string;
}

export interface ToolsetAuthResultPayload {
  toolsetId: string;
  success: boolean;
  credentialsLevel?: ToolsetCredentialsLevel;
  reason?: string;
  credentials?: ToolsetCredentials;
}

export enum OutboundMessageType {
  Ready = 'READY',
  DirtyState = 'DIRTY_STATE',
  SaveSuccess = 'SAVE_SUCCESS',
  SaveError = 'SAVE_ERROR',
  AutoSaveComplete = 'AUTO_SAVE_COMPLETE',
  HeightChange = 'HEIGHT_CHANGE',
  RequestToolsetLogin = 'REQUEST_TOOLSET_LOGIN',
  RequestToolsetLogout = 'REQUEST_TOOLSET_LOGOUT',
}

export type InboundMessage =
  | { type: InboundMessageType.TriggerSave }
  | {
      type: InboundMessageType.TriggerAutoSave;
      payload?: { ignoreDirty?: boolean };
    }
  | { type: InboundMessageType.Reset }
  | ({ type: InboundMessageType.ToolsetLoginResult } & ToolsetAuthResultPayload)
  | ({ type: InboundMessageType.ToolsetLogoutResult } & ToolsetAuthResultPayload);
