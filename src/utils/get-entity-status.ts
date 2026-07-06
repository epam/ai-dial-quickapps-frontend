import { ApplicationStatus, ToolsetAuthStatus, ToolsetAuthType } from "@/types/dial-entities";
import { CommonI18nKeys } from "@/constants/i18n";

export interface EntityStatusFields {
  functionStatus?: ApplicationStatus;
  authSettings?: {
    authenticationType?: ToolsetAuthType;
    authStatus?: ToolsetAuthStatus;
  };
}

export interface EntityStatus {
  isInvalid: boolean;
  isError: boolean;
  isLoggedOut: boolean;
  isUndeployed: boolean;
  isDeploying: boolean;
  isUndeploying: boolean;
  isRedeploying: boolean;
}

export const getEntityStatus = (
  entity?: EntityStatusFields,
): EntityStatus => {
  if (!entity) {
    return {
      isInvalid: true,
      isError: true,
      isLoggedOut: false,
      isUndeployed: false,
      isDeploying: false,
      isUndeploying: false,
      isRedeploying: false,
    };
  }

  const authSettings = entity.authSettings;
  const isLoggedOut =
    !!authSettings &&
    authSettings.authenticationType !== ToolsetAuthType.None &&
    authSettings.authStatus !== ToolsetAuthStatus.SignedIn;

  const functionStatus = entity.functionStatus;
  const isDeploying = functionStatus === ApplicationStatus.Deploying;
  const isUndeploying = functionStatus === ApplicationStatus.Undeploying;
  const isRedeploying = functionStatus === ApplicationStatus.Redeploying;
  const isUndeployed =
    !!functionStatus &&
    functionStatus !== ApplicationStatus.Deployed &&
    functionStatus !== ApplicationStatus.Redeployed &&
    !isDeploying &&
    !isUndeploying &&
    !isRedeploying;

  return {
    isInvalid: false,
    isError: isLoggedOut || isUndeployed,
    isLoggedOut,
    isUndeployed,
    isDeploying,
    isUndeploying,
    isRedeploying,
  };
};

// Transient lifecycle states a deployable entity can be in, in priority
// order: the first one that's true wins.
export enum EntityStatusKind {
  Deploying = "DEPLOYING",
  Undeploying = "UNDEPLOYING",
  Redeploying = "REDEPLOYING",
  Undeployed = "UNDEPLOYED",
}

const getActiveStatusKind = (
  status: EntityStatus,
): EntityStatusKind | undefined => {
  if (status.isDeploying) {
    return EntityStatusKind.Deploying;
  }
  if (status.isUndeploying) {
    return EntityStatusKind.Undeploying;
  }
  if (status.isRedeploying) {
    return EntityStatusKind.Redeploying;
  }
  if (status.isUndeployed) {
    return EntityStatusKind.Undeployed;
  }
  return undefined;
};

// Deploying/undeploying an app isn't an action available from this
// selector, so these never suggest clicking — they just report the status.
const STATUS_MESSAGE_KEY_BY_KIND = new Map<EntityStatusKind, CommonI18nKeys>([
  [EntityStatusKind.Deploying, CommonI18nKeys.DeployingApp],
  [EntityStatusKind.Undeploying, CommonI18nKeys.UndeployingApp],
  [EntityStatusKind.Redeploying, CommonI18nKeys.RedeployingApp],
  [EntityStatusKind.Undeployed, CommonI18nKeys.UndeployedApp],
]);

export const getEntityStatusMessage = (
  status: EntityStatus | undefined,
  isReadonly: boolean | undefined,
  t: (key: string) => string,
): string | undefined => {
  if (!status) {
    return undefined;
  }

  if (status.isLoggedOut) {
    // Clicking the chip opens the sign-in popup directly (no scroll target
    // exists in this simplified selector), so always use the "click on" copy.
    return isReadonly
      ? t(CommonI18nKeys.LoggedOutToolset)
      : t(CommonI18nKeys.LoggedOutToolsetClickOn);
  }

  const kind = getActiveStatusKind(status);
  const messageKey = kind && STATUS_MESSAGE_KEY_BY_KIND.get(kind);
  return messageKey ? t(messageKey) : undefined;
};
