import {
  ToolsetLoginBodyDtoAuthenticationTypeEnum,
  ToolsetLoginBodyDtoCredentialsLevelEnum,
  ToolsetLogoutBodyDtoAuthenticationTypeEnum,
} from '@epam/ai-dial-chat-api-client';
import { useCallback, useEffect, useRef } from 'react';

import { useAppContext } from '@/context/AppContext';
import { useDataContext } from '@/context/DataContext';
import { type DialToolset, ToolsetAuthStatus, ToolsetAuthType } from '@/types/dial-entities';
import {
  InboundMessageType,
  OutboundMessageType,
  type ToolsetAuthResultPayload,
} from '@/types/editor-messages';
import { isOriginAllowed, postToHost } from '@/utils/allowed-origins';
import { isPublicToolsetId } from '@/utils/api';
import { toolsetsApi } from '@/utils/chat-api-client';
import { encodeDialPath } from '@/utils/dial-client';

/** Public toolsets are signed in per-user, private ones per-workspace — mirrors dial-client.ts's mapAuthSettings. */
const credentialsLevelFor = (toolsetId: string): ToolsetLoginBodyDtoCredentialsLevelEnum =>
  isPublicToolsetId(toolsetId)
    ? ToolsetLoginBodyDtoCredentialsLevelEnum.User
    : ToolsetLoginBodyDtoCredentialsLevelEnum.Global;

/** A host round trip waiting for its result message. */
interface PendingHostRequest {
  type: InboundMessageType.ToolsetLoginResult | InboundMessageType.ToolsetLogoutResult;
  resolve: () => void;
}

export interface UseToolsetCredentialsResult {
  /** Signs in: OAuth through the host, or with the given API key. Resolves once done, also on failure. */
  onLogin: (params: { apiKey?: string }) => Promise<void>;
  /** Signs out: OAuth through the host, or deletes the API key. Resolves once done, also on failure. */
  onLogout: () => Promise<void>;
}

/**
 * Backs the catalog `DetailsHeader` credentials action for one toolset with
 * this app's sign-in flows. OAuth goes through the host
 * (REQUEST_TOOLSET_LOGIN / LOGOUT, answered by TOOLSET_LOGIN_RESULT /
 * LOGOUT_RESULT), since its callback lives in the host app; the returned
 * promise settles when the host answers. API keys are sent to chat-api
 * directly. The promises never reject: the catalog header fires OAuth login
 * without awaiting it and its API-key popover has no error state, so a
 * failure just leaves the status as it was.
 * The credentials level is decided from the toolset id, as before.
 */
export const useToolsetCredentials = (toolset?: DialToolset): UseToolsetCredentialsResult => {
  const { settings } = useAppContext();
  const { applyToolsetAuthResult, refreshToolsets } = useDataContext();
  const pendingRef = useRef<PendingHostRequest | null>(null);

  // Called unconditionally by the popup; without a toolset nothing is ever requested.
  const toolsetId = toolset?.id ?? '';
  const isOAuth = toolset?.authSettings?.authenticationType === ToolsetAuthType.OAuth;

  useEffect(() => {
    if (!isOAuth) return undefined;

    const handleMessage = (event: MessageEvent) => {
      if (!isOriginAllowed(event.origin, settings.allowedOrigins)) return;

      const msg = event.data as { type?: string } & Partial<ToolsetAuthResultPayload>;
      const pending = pendingRef.current;
      if (pending == null || msg?.type !== pending.type || msg.toolsetId !== toolsetId) return;
      pendingRef.current = null;

      if (msg.success) {
        // Trust the host's own report of the fresh auth status instead of
        // re-fetching the toolsets, which can lag right after a login.
        applyToolsetAuthResult(
          msg as ToolsetAuthResultPayload,
          pending.type === InboundMessageType.ToolsetLoginResult
            ? ToolsetAuthStatus.SignedIn
            : ToolsetAuthStatus.SignedOut,
        );
      }
      pending.resolve();
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [isOAuth, settings.allowedOrigins, toolsetId, applyToolsetAuthResult]);

  const requestFromHost = useCallback(
    (
      outbound: OutboundMessageType.RequestToolsetLogin | OutboundMessageType.RequestToolsetLogout,
      inbound: PendingHostRequest['type'],
    ) =>
      new Promise<void>((resolve) => {
        pendingRef.current = { type: inbound, resolve };
        postToHost({ type: outbound, toolsetId }, settings.allowedOrigins);
      }),
    [settings.allowedOrigins, toolsetId],
  );

  const callApi = useCallback(
    async (request: () => Promise<unknown>) => {
      try {
        await request();
        await refreshToolsets();
      } catch {
        // A failed request leaves the status as it was; the action stays as it is.
      }
    },
    [refreshToolsets],
  );

  const onLogin = useCallback(
    async ({ apiKey }: { apiKey?: string }) => {
      if (isOAuth) {
        await requestFromHost(
          OutboundMessageType.RequestToolsetLogin,
          InboundMessageType.ToolsetLoginResult,
        );
        return;
      }
      await callApi(() =>
        toolsetsApi.loginToolset({
          toolsetName: encodeDialPath(toolsetId),
          toolsetLoginBodyDto: {
            url: toolsetId,
            credentialsLevel: credentialsLevelFor(toolsetId),
            authenticationType: ToolsetLoginBodyDtoAuthenticationTypeEnum.ApiKey,
            apiKey,
          },
        }),
      );
    },
    [callApi, isOAuth, requestFromHost, toolsetId],
  );

  const onLogout = useCallback(async () => {
    if (isOAuth) {
      await requestFromHost(
        OutboundMessageType.RequestToolsetLogout,
        InboundMessageType.ToolsetLogoutResult,
      );
      return;
    }
    await callApi(() =>
      toolsetsApi.logoutToolset({
        toolsetName: encodeDialPath(toolsetId),
        toolsetLogoutBodyDto: {
          url: toolsetId,
          credentialsLevel: credentialsLevelFor(toolsetId),
          authenticationType: ToolsetLogoutBodyDtoAuthenticationTypeEnum.ApiKey,
        },
      }),
    );
  }, [callApi, isOAuth, requestFromHost, toolsetId]);

  return { onLogin, onLogout };
};
