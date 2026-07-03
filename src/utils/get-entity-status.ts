import { ApplicationStatus, ToolsetAuthStatus, ToolsetAuthType } from "@/types/dial-entities";

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
