import type { TFunction } from 'i18next';
import { isApplicationId, isToolsetId } from '@/utils/api';
import {
  ApplicationStatus,
  type DialSkill,
  ToolsetAuthStatus,
  ToolsetAuthType,
} from '@/types/dial-entities';
import { ApplicationEditorI18nKeys } from '@/constants/translation-keys';
import {
  type EntityStatusMessage,
  EntityStatusKind,
  EntityStatusSeverity,
} from '@/types/entity-status';

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

const NO_STATUS: EntityStatus = {
  isMissingDeploymentId: false,
  isNotFoundInCatalog: false,
  isError: false,
  isLoggedOut: false,
  isUndeployed: false,
  isDeploying: false,
  isUndeploying: false,
  isRedeploying: false,
};

/*
 * `isCatalogReady` is required: before the catalog has loaded (or after it
 * failed to), the maps are empty and a missing entity says nothing about
 * whether it is really unavailable.
 */
export const getEntityStatus = (
  entity: EntityStatusFields | undefined,
  id: string | undefined,
  isCatalogReady: boolean,
): EntityStatus => {
  if (!entity) {
    if (!isCatalogReady) {
      return NO_STATUS;
    }
    const isNotFoundInCatalog = isApplicationId(id) || isToolsetId(id);
    return {
      ...NO_STATUS,
      isMissingDeploymentId: !isNotFoundInCatalog,
      isNotFoundInCatalog,
      isError: isNotFoundInCatalog,
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

// Every attached skill id is a real reference, so a missing one is unavailable once skills have loaded.
export const getSkillStatus = (
  skill: DialSkill | undefined,
  isCatalogReady: boolean,
): EntityStatus => {
  const isNotFoundInCatalog = isCatalogReady && skill == null;
  return { ...NO_STATUS, isNotFoundInCatalog, isError: isNotFoundInCatalog };
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
): EntityStatusMessage | undefined => {
  if (!status) {
    return undefined;
  }

  if (status.isNotFoundInCatalog) {
    return {
      text: t(ApplicationEditorI18nKeys.AddOnsUnavailableRemovalRequired, {
        entityType: entityTypeLabel ?? '',
      }),
      severity: EntityStatusSeverity.Error,
    };
  }

  if (status.isLoggedOut) {
    return {
      text: t(ApplicationEditorI18nKeys.AddOnsLoggedOutToolset),
      severity: EntityStatusSeverity.Info,
    };
  }

  const kind = getActiveStatusKind(status);
  const messageKey = kind && STATUS_MESSAGE_KEY_BY_KIND.get(kind);
  return messageKey ? { text: t(messageKey), severity: EntityStatusSeverity.Info } : undefined;
};
