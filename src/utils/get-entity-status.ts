import type { TFunction } from 'i18next';
import { isApplicationId, isToolsetId } from '@/utils/api';
import { ApplicationStatus, ToolsetAuthStatus, ToolsetAuthType } from '@/types/dial-entities';
import { ApplicationEditorI18nKeys } from '@/constants/translation-keys';
import { EntityStatusKind } from '@/types/entity-status';

interface EntityStatusFields {
  functionStatus?: ApplicationStatus;
  authSettings?: {
    authenticationType?: ToolsetAuthType;
    authStatus?: ToolsetAuthStatus;
  };
}

export interface EntityStatus {
  // Entity was added via JSON with only a `name`, no `deployment_id` —
  // it can't be resolved against the catalog, but that's expected, not an error.
  isMissingDeploymentId: boolean;
  // Entity has a real deployment/toolset id, but that id doesn't match
  // anything in the available toolsets/agents/models list — it needs removal.
  isNotFoundInCatalog: boolean;
  isError: boolean;
  isLoggedOut: boolean;
  isUndeployed: boolean;
  isDeploying: boolean;
  isUndeploying: boolean;
  isRedeploying: boolean;
}

export const getEntityStatus = (entity?: EntityStatusFields, id?: string): EntityStatus => {
  if (!entity) {
    const isNotFoundInCatalog = isApplicationId(id) || isToolsetId(id);
    return {
      isMissingDeploymentId: !isNotFoundInCatalog,
      isNotFoundInCatalog,
      isError: isNotFoundInCatalog,
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
    isMissingDeploymentId: false,
    isNotFoundInCatalog: false,
    isError: isLoggedOut || isUndeployed,
    isLoggedOut,
    isUndeployed,
    isDeploying,
    isUndeploying,
    isRedeploying,
  };
};

const getActiveStatusKind = (status: EntityStatus): EntityStatusKind | undefined => {
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
const STATUS_MESSAGE_KEY_BY_KIND = new Map<EntityStatusKind, ApplicationEditorI18nKeys>([
  [EntityStatusKind.Deploying, ApplicationEditorI18nKeys.AddOnsDeployingApp],
  [EntityStatusKind.Undeploying, ApplicationEditorI18nKeys.AddOnsUndeployingApp],
  [EntityStatusKind.Redeploying, ApplicationEditorI18nKeys.AddOnsRedeployingApp],
  [EntityStatusKind.Undeployed, ApplicationEditorI18nKeys.AddOnsUndeployedApp],
]);

export const getEntityStatusMessage = (
  status: EntityStatus | undefined,
  t: TFunction,
  entityTypeLabel?: string,
): string | undefined => {
  if (!status) {
    return undefined;
  }

  if (status.isNotFoundInCatalog) {
    return t(ApplicationEditorI18nKeys.AddOnsUnavailableRemovalRequired, {
      entityType: entityTypeLabel ?? '',
    });
  }

  if (status.isLoggedOut) {
    return t(ApplicationEditorI18nKeys.AddOnsLoggedOutToolset);
  }

  const kind = getActiveStatusKind(status);
  const messageKey = kind && STATUS_MESSAGE_KEY_BY_KIND.get(kind);
  return messageKey ? t(messageKey) : undefined;
};
