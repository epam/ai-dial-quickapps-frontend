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

/**
 * General-step fields the host (ai-dial-chat) owns, sent with TRIGGER_SAVE so
 * this editor's single save can persist the current values instead of racing
 * a second host-side write. Never includes `version` — that stays untouched
 * by this payload. Absent when the trigger is a Preview, or when the app was
 * created in this same editor session (host already wrote initial values via
 * create-application).
 */
export interface TriggerSaveGeneralPayload {
  name: string;
  description?: string;
  iconUrl?: string;
  topics?: string[];
  intro?: string;
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
  | { type: InboundMessageType.TriggerSave; general?: TriggerSaveGeneralPayload }
  | {
      type: InboundMessageType.TriggerAutoSave;
      payload?: { ignoreDirty?: boolean };
    }
  | { type: InboundMessageType.Reset }
  | ({ type: InboundMessageType.ToolsetLoginResult } & ToolsetAuthResultPayload)
  | ({ type: InboundMessageType.ToolsetLogoutResult } & ToolsetAuthResultPayload);
