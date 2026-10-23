import {
  AppsEditorMessages,
  type AppsEditorCredentialsRequestMessage,
  type AppsEditorDirtyMessage,
  type AppsEditorSaveErrorMessage,
  type AppsEditorSaveSuccessMessage,
  type AppsEditorToolsetRequestMessage,
  type AppsEditorToolsetResultMessage,
  type AppsEditorTriggerSaveMessage,
  type AppsEditorValidityMessage,
} from '@epam/ai-dial-visualizer-connector';

import type {
  ToolsetAuthStatus,
  ToolsetAuthType,
  ToolsetCredentialsLevel,
} from '@/types/dial-entities';

export enum AdminInboundMessageType {
  TriggerAutoSave = 'TRIGGER_AUTO_SAVE',
  Reset = 'RESET',
}

export const InboundMessageType = {
  ...AdminInboundMessageType,
  TriggerSave: AppsEditorMessages.TriggerSave,
  ToolsetLoginResult: AppsEditorMessages.ToolsetLoginResult,
  ToolsetLogoutResult: AppsEditorMessages.ToolsetLogoutResult,
} as const;

export interface ToolsetCredentials {
  authenticationType: ToolsetAuthType;
  userStatus?: ToolsetAuthStatus;
  globalStatus?: ToolsetAuthStatus;
  isPublic?: boolean;
  isManageableByAdmin?: boolean;
  apiKeyHeader?: string;
}

export interface ToolsetAuthResultPayload extends Omit<
  AppsEditorToolsetResultMessage<ToolsetCredentials>,
  'type' | 'credentialsLevel'
> {
  credentialsLevel?: ToolsetCredentialsLevel;
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
  shouldIgnoreDirty?: boolean;
  general?: TriggerSaveGeneralPayload;
}

export enum AdminOutboundMessageType {
  Ready = 'READY',
  AutoSaveComplete = 'AUTO_SAVE_COMPLETE',
  HeightChange = 'HEIGHT_CHANGE',
}

export const OutboundMessageType = {
  ...AdminOutboundMessageType,
  DirtyState: AppsEditorMessages.DirtyState,
  ValidityState: AppsEditorMessages.ValidityState,
  SaveSuccess: AppsEditorMessages.SaveSuccess,
  SaveError: AppsEditorMessages.SaveError,
  RequestApplicationCredentials: AppsEditorMessages.RequestApplicationCredentials,
  RequestToolsetLogin: AppsEditorMessages.RequestToolsetLogin,
  RequestToolsetLogout: AppsEditorMessages.RequestToolsetLogout,
} as const;

export type InboundMessage =
  | AppsEditorTriggerSaveMessage<TriggerSaveGeneralPayload>
  | {
      type: AdminInboundMessageType.TriggerAutoSave;
      payload?: { ignoreDirty?: boolean };
    }
  | { type: AdminInboundMessageType.Reset }
  | ({ type: AppsEditorToolsetResultMessage['type'] } & ToolsetAuthResultPayload);

/** Shared editor messages plus the existing Admin envelopes and extensions. */
export type EditorOutboundMessage =
  | AppsEditorDirtyMessage
  | AppsEditorValidityMessage
  | AppsEditorToolsetRequestMessage
  | AppsEditorCredentialsRequestMessage
  | (AppsEditorSaveSuccessMessage & { payload: { updatedApp: unknown } })
  | {
      type: AppsEditorSaveErrorMessage['type'];
      payload: Pick<AppsEditorSaveErrorMessage, 'error'>;
    }
  | { type: AdminOutboundMessageType.Ready | AdminOutboundMessageType.AutoSaveComplete }
  | { type: AdminOutboundMessageType.HeightChange; payload: { height: number } };
