import { describe, expect, it, vi } from 'vitest';
import type { TFunction } from 'i18next';

import { ApplicationEditorI18nKeys } from '@/constants/translation-keys';
import {
  ApplicationStatus,
  ToolsetAuthStatus,
  ToolsetAuthType,
} from '@/types/dial-entities';
import {
  getEntityStatus,
  getEntityStatusMessage,
  type EntityStatus,
} from '@/utils/get-entity-status';

const createStatus = (overrides: Partial<EntityStatus> = {}): EntityStatus => ({
  isMissingDeploymentId: false,
  isNotFoundInCatalog: false,
  isError: false,
  isLoggedOut: false,
  isUndeployed: false,
  isDeploying: false,
  isUndeploying: false,
  isRedeploying: false,
  ...overrides,
});

describe('getEntityStatus', () => {
  it.each([
    ['applications/app', false, true],
    ['toolsets/public/tool', false, true],
    ['custom-name', true, false],
    [undefined, true, false],
  ])('classifies a missing entity with id %s', (id, isMissingDeploymentId, isNotFoundInCatalog) => {
    expect(getEntityStatus(undefined, id)).toEqual({
      isMissingDeploymentId,
      isNotFoundInCatalog,
      isError: isNotFoundInCatalog,
      isLoggedOut: false,
      isUndeployed: false,
      isDeploying: false,
      isUndeploying: false,
      isRedeploying: false,
    });
  });

  it.each([
    [undefined, undefined, false],
    [ToolsetAuthType.None, undefined, false],
    [ToolsetAuthType.OAuth, ToolsetAuthStatus.SignedIn, false],
    [ToolsetAuthType.ApiKey, ToolsetAuthStatus.SignedOut, true],
    [ToolsetAuthType.OAuth, ToolsetAuthStatus.Failed, true],
  ])(
    'classifies authentication type %s and status %s',
    (authenticationType, authStatus, isLoggedOut) => {
      const status = getEntityStatus({
        authSettings:
          authenticationType == null
            ? undefined
            : { authenticationType, authStatus },
      });

      expect(status.isLoggedOut).toBe(isLoggedOut);
      expect(status.isError).toBe(isLoggedOut);
    },
  );

  it.each([
    [undefined, false, false, false, false, false],
    [ApplicationStatus.Deployed, false, false, false, false, false],
    [ApplicationStatus.Redeployed, false, false, false, false, false],
    [ApplicationStatus.Deploying, false, false, true, false, false],
    [ApplicationStatus.Undeploying, false, false, false, true, false],
    [ApplicationStatus.Redeploying, false, false, false, false, true],
    [ApplicationStatus.Undeployed, true, true, false, false, false],
    [ApplicationStatus.Failed, true, true, false, false, false],
  ])(
    'classifies function status %s',
    (
      functionStatus,
      isUndeployed,
      isError,
      isDeploying,
      isUndeploying,
      isRedeploying,
    ) => {
      const status = getEntityStatus({ functionStatus });

      expect(status.isUndeployed).toBe(isUndeployed);
      expect(status.isDeploying).toBe(isDeploying);
      expect(status.isUndeploying).toBe(isUndeploying);
      expect(status.isRedeploying).toBe(isRedeploying);
      expect(status.isError).toBe(isError);
    },
  );
});

describe('getEntityStatusMessage', () => {
  const t = vi.fn((key: string) => key) as unknown as TFunction & ReturnType<typeof vi.fn>;

  it('returns undefined when status is absent or has no active state', () => {
    expect(getEntityStatusMessage(undefined, t)).toBeUndefined();
    expect(getEntityStatusMessage(createStatus(), t)).toBeUndefined();
  });

  it('returns a removal message for a missing catalog entity', () => {
    expect(
      getEntityStatusMessage(
        createStatus({ isNotFoundInCatalog: true }),
        t,
        'toolset',
      ),
    ).toBe(ApplicationEditorI18nKeys.AddOnsUnavailableRemovalRequired);
    expect(t).toHaveBeenLastCalledWith(ApplicationEditorI18nKeys.AddOnsUnavailableRemovalRequired, {
      entityType: 'toolset',
    });

    expect(
      getEntityStatusMessage(createStatus({ isNotFoundInCatalog: true }), t),
    ).toBe(ApplicationEditorI18nKeys.AddOnsUnavailableRemovalRequired);
    expect(t).toHaveBeenLastCalledWith(ApplicationEditorI18nKeys.AddOnsUnavailableRemovalRequired, {
      entityType: '',
    });
  });

  it('returns the appropriate logged-out message', () => {
    expect(getEntityStatusMessage(createStatus({ isLoggedOut: true }), t)).toBe(
      ApplicationEditorI18nKeys.AddOnsLoggedOutToolset,
    );
  });

  it.each([
    ["isDeploying", 'AddOnsDeployingApp'],
    ["isUndeploying", 'AddOnsUndeployingApp'],
    ["isRedeploying", 'AddOnsRedeployingApp'],
    ["isUndeployed", 'AddOnsUndeployedApp'],
  ])('returns the message for %s', (statusKey, messageKey) => {
    expect(
      getEntityStatusMessage(createStatus({ [statusKey]: true }), t),
    ).toBe(ApplicationEditorI18nKeys[messageKey as keyof typeof ApplicationEditorI18nKeys]);
  });

  it('prioritizes catalog and lifecycle states', () => {
    expect(
      getEntityStatusMessage(
        createStatus({ isNotFoundInCatalog: true, isDeploying: true }),
        t,
      ),
    ).toBe(ApplicationEditorI18nKeys.AddOnsUnavailableRemovalRequired);
    expect(
      getEntityStatusMessage(
        createStatus({ isLoggedOut: true, isDeploying: true }),
        t,
      ),
    ).toBe(ApplicationEditorI18nKeys.AddOnsLoggedOutToolset);
  });
});
