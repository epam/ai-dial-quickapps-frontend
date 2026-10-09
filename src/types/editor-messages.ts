import type {
  ToolsetAuthStatus,
  ToolsetAuthType,
  ToolsetCredentialsLevel,
} from '@/types/dial-entities';

export enum InboundMessageType {
  TriggerSave = 'TRIGGER_SAVE',
  TriggerAutoSave = 'TRIGGER_AUTO_SAVE',
  Reset = 'RESET',
  ToolsetLoginResult = 'TOOLSET_LOGIN_RESULT',
  ToolsetLogoutResult = 'TOOLSET_LOGOUT_RESULT',
}

interface ToolsetCredentials {
  authenticationType: ToolsetAuthType;
  userStatus?: ToolsetAuthStatus;
  globalStatus?: ToolsetAuthStatus;
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

/** One non-primary locale's translated text for a General-step field. */
export interface HostLocaleTextEntry {
  language: string;
  name?: string;
  description?: string;
}

/**
 * General-step fields the host (ai-dial-chat) owns, sent with TRIGGER_SAVE so
 * this editor's single save can persist the current values instead of racing
 * a second host-side write. `display_version` is persisted as chat-api's
 * `version`; when it is missing or blank, the stored version is left
 * untouched. Absent when the trigger is a Preview, or when the app was
 * created in this same editor session (host already wrote initial values via
 * create-application).
 *
 * `name` and `description` carry only the `primaryLocale` value; translations
 * for every other locale arrive separately in `locales`. Use
 * `buildLocalizedText` (`@/utils/get-localized-text`) to recombine these into
 * the `LocalizedText` dictionary DIAL Core expects — never write `name`/
 * `description` straight to Core, or every other locale's translation is lost.
 */
export interface TriggerSaveGeneralPayload {
  name: string;
  description?: string;
  locales?: HostLocaleTextEntry[];
  primaryLocale?: string;
  iconUrl?: string;
  topics?: string[];
  display_version?: string;
}

/** The `detail` of the window-level trigger-save event the form listens for. */
export interface TriggerSaveEventDetail {
  isAutoSave?: boolean;
  ignoreDirty?: boolean;
  general?: TriggerSaveGeneralPayload;
}

export enum OutboundMessageType {
  Ready = 'READY',
  DirtyState = 'DIRTY_STATE',
  SaveSuccess = 'SAVE_SUCCESS',
  SaveError = 'SAVE_ERROR',
  AutoSaveComplete = 'AUTO_SAVE_COMPLETE',
  HeightChange = 'HEIGHT_CHANGE',
  RequestApplicationCredentials = 'REQUEST_APPLICATION_CREDENTIALS',
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
