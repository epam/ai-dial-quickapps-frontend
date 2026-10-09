import { Suspense, useCallback, useEffect, useRef, useState } from 'react';

import { AppContextProvider, type AppState } from '@/context/AppContext';
import { useTranslation } from '@/hooks/use-translation';
import type { MaybeLocalizedText } from '@/types/dial-entities';
import { Translation } from '@/types/translation';
import ForbiddenPage from '@/components/ForbiddenPage/ForbiddenPage';
import FullScreenSpinner from '@/components/FullScreenSpinner/FullScreenSpinner';
import { DataContextProvider } from '@/context/DataContext';
import { buildQuickApp2Config } from '@/form/quickApp2Form';
import type { QuickApp2Form as QuickApp2FormType } from '@/form/quickApp2Form';
import { QuickApp2Config } from '@/types/quick-apps';
import { isOriginAllowed, postToHost } from '@/utils/allowed-origins';
import { ForbiddenError } from '@/utils/forbidden-error';
import { decodeDialPath, fetchAppSettings, fetchDialApp, saveDialApp } from '@/utils/dial-client';
import { buildLocalizedText } from '@/utils/get-localized-text';
import { hasQuickAppChanges, type StoredGeneralFields } from '@/utils/has-quick-app-changes';
import { QuickApp2Form, type QuickApp2AllEntitiesMap } from '@/components/QuickApp2Form';
import { AUTO_SAVE_INTERVAL_MS } from '@/constants/editor';
import {
  InboundMessage,
  InboundMessageType,
  OutboundMessageType,
  TriggerSaveGeneralPayload,
} from '@/types/editor-messages';
import { dispatchTriggerSave } from '@/utils/dispatch-trigger-save';

interface EditorInnerProps {
  appState: AppState;
  onSave: (
    data: QuickApp2FormType,
    allEntitiesMap: QuickApp2AllEntitiesMap,
    isAutoSave?: boolean,
    general?: TriggerSaveGeneralPayload,
  ) => Promise<void>;
  onDirtyChange: (isDirty: boolean) => void;
  onModelReady?: () => void;
  resetKey: number;
}

const EditorInner = ({
  appState,
  onSave,
  onDirtyChange,
  onModelReady,
  resetKey,
}: EditorInnerProps) => {
  const handleSave = useCallback(
    async (
      data: QuickApp2FormType,
      allEntitiesMap: QuickApp2AllEntitiesMap,
      isAutoSave = false,
      general?: TriggerSaveGeneralPayload,
    ) => {
      await onSave(data, allEntitiesMap, isAutoSave, general);
    },
    [onSave],
  );

  return (
    <div className="bg-layer-base">
      <AppContextProvider value={appState}>
        <QuickApp2Form
          key={resetKey}
          onSave={handleSave}
          onDirtyChange={onDirtyChange}
          onModelReady={onModelReady}
        />
      </AppContextProvider>
    </div>
  );
};

interface EditorClientProps {
  /**
   * Called once a model has been resolved in the form (the saved model's
   * details loaded, or the default assigned) — the point at which a
   * TriggerSave would produce a correct save.
   */
  onReadyToSave?: () => void;
}

const EditorClient = ({ onReadyToSave }: EditorClientProps) => {
  const { language } = useTranslation(Translation.Common);
  const [appState, setAppState] = useState<AppState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isForbidden, setIsForbidden] = useState(false);
  const [resetKey, setResetKey] = useState(0);
  const [hasSavedOnce, setHasSavedOnce] = useState(false);
  const isDirtyRef = useRef(false);
  const isInitializedRef = useRef(false);
  const hasSavedOnceRef = useRef(false);
  // Empty until settings load — treated as "any origin", so READY reaches the host before then.
  const allowedOriginsRef = useRef<string[]>([]);

  useEffect(() => {
    hasSavedOnceRef.current = hasSavedOnce;
  }, [hasSavedOnce]);

  useEffect(() => {
    postToHost({ type: OutboundMessageType.Ready }, allowedOriginsRef.current);

    let cancelled = false;
    const rawAppId = new URLSearchParams(window.location.search).get('id');
    const appId = rawAppId ? decodeDialPath(rawAppId) : null;
    const initialize = async (id: string) => {
      try {
        const [app, settings] = await Promise.all([fetchDialApp(id), fetchAppSettings()]);
        if (cancelled) return;
        allowedOriginsRef.current = settings.allowedOrigins ?? [];
        setAppState({
          app: app ?? { id, name: '' },
          settings,
          isReady: true,
        });
        setHasSavedOnce(!!app);
      } catch (err: unknown) {
        isInitializedRef.current = false;
        if (cancelled) return;
        if (err instanceof ForbiddenError) {
          setIsForbidden(true);
          return;
        }
        setError(err instanceof Error ? err.message : 'Initialization failed');
      }
    };

    if (appId && !isInitializedRef.current) {
      isInitializedRef.current = true;
      void initialize(appId);
    }

    const handleMessage = (event: MessageEvent) => {
      if (!isOriginAllowed(event.origin, allowedOriginsRef.current)) return;
      const msg = event.data as InboundMessage;
      if (!msg?.type) return;

      switch (msg.type) {
        case InboundMessageType.TriggerSave:
        case InboundMessageType.TriggerAutoSave: {
          const isAutoSave = msg.type === InboundMessageType.TriggerAutoSave;
          if (isAutoSave && !hasSavedOnceRef.current) break;
          const generalFromHost = isAutoSave ? undefined : msg.general;
          dispatchTriggerSave({
            isAutoSave,
            shouldIgnoreDirty: isAutoSave ? msg.payload?.ignoreDirty : undefined,
            general: generalFromHost,
          });
          break;
        }
        case InboundMessageType.Reset: {
          setResetKey((k) => k + 1);
          break;
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => {
      cancelled = true;
      isInitializedRef.current = false;
      window.removeEventListener('message', handleMessage);
    };
  }, []);

  useEffect(() => {
    if (!appState || !hasSavedOnce) return;

    const intervalId = window.setInterval(() => {
      dispatchTriggerSave({ isAutoSave: true });
    }, AUTO_SAVE_INTERVAL_MS);

    return () => window.clearInterval(intervalId);
  }, [appState, hasSavedOnce]);

  const formRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = formRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      postToHost(
        {
          type: OutboundMessageType.HeightChange,
          payload: { height: el.scrollHeight },
        },
        allowedOriginsRef.current,
      );
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [appState]);

  const handleSave = useCallback(
    async (
      data: QuickApp2FormType,
      allEntitiesMap: QuickApp2AllEntitiesMap,
      isAutoSave = false,
      general?: TriggerSaveGeneralPayload,
    ) => {
      if (!appState) return;
      const existingConfig = appState.app.applicationProperties as QuickApp2Config | undefined;
      try {
        const newConfig = buildQuickApp2Config({
          data,
          allEntitiesMap,
          existingConfig,
          language,
        });
        const appWithFormValues = {
          ...appState.app,
          inputAttachmentTypes: data.inputAttachmentTypes,
          maxInputAttachments: data.maxInputAttachments,
        };
        const rawForSave = (appState.app._rawForSave as Record<string, unknown>) ?? {};
        const generalForSave = {
          name: (rawForSave.displayName as MaybeLocalizedText) ?? appState.app.name,
          description: rawForSave.description as MaybeLocalizedText,
          iconUrl: rawForSave.iconUrl as string | undefined,
          topics: rawForSave.topics as string[] | undefined,
        };
        // The load-time display_version is only a diff baseline: carrying it into
        // the save would let a `general`-less save (auto-save) revert a version
        // the host changed earlier in this session.
        const storedGeneral: StoredGeneralFields = {
          ...generalForSave,
          display_version: rawForSave.displayVersion as string | undefined,
        };
        // `general.name`/`general.description` only carry the primary-locale
        // text — recombine them with `general.locales` into the full
        // LocalizedText dictionary for diffing purposes (hasQuickAppChanges).
        // `locales`/`primaryLocale` are also carried through unmodified for
        // saveDialApp, which sends them to chat-api's own locales/primaryLocale
        // fields directly — no recombination needed on that side.
        const normalizedGeneral: StoredGeneralFields | undefined = general
          ? {
              name: buildLocalizedText(
                general.name,
                general.primaryLocale,
                general.locales,
                'name',
              ),
              description: buildLocalizedText(
                general.description,
                general.primaryLocale,
                general.locales,
                'description',
              ),
              iconUrl: general.iconUrl,
              topics: general.topics,
              display_version: general.display_version,
              locales: general.locales,
              primaryLocale: general.primaryLocale,
            }
          : undefined;
        const effectiveGeneral = normalizedGeneral
          ? { ...generalForSave, ...normalizedGeneral }
          : generalForSave;
        const { hasChanges } = hasQuickAppChanges(
          existingConfig,
          newConfig,
          normalizedGeneral,
          storedGeneral,
        );
        const updatedApp = await saveDialApp(appWithFormValues, newConfig, effectiveGeneral);
        setHasSavedOnce(true);
        if (isAutoSave) {
          postToHost({ type: OutboundMessageType.AutoSaveComplete }, allowedOriginsRef.current);
        } else {
          postToHost(
            {
              type: OutboundMessageType.SaveSuccess,
              payload: { updatedApp },
              hasChanges,
            },
            allowedOriginsRef.current,
          );
        }
      } catch (err) {
        const error = err instanceof Error ? err.message : 'Save failed';
        postToHost(
          {
            type: OutboundMessageType.SaveError,
            payload: { error },
          },
          allowedOriginsRef.current,
        );
      }
    },
    [appState, language],
  );

  const handleDirtyChange = useCallback((isDirty: boolean) => {
    if (isDirtyRef.current !== isDirty) {
      isDirtyRef.current = isDirty;
      postToHost(
        {
          type: OutboundMessageType.DirtyState,
          payload: { isDirty },
        },
        allowedOriginsRef.current,
      );
    }
  }, []);

  if (isForbidden) {
    return <ForbiddenPage />;
  }

  if (error) {
    return <div className="flex h-screen items-center justify-center text-error">{error}</div>;
  }

  if (!appState) {
    return <FullScreenSpinner />;
  }

  return (
    <AppContextProvider value={appState}>
      <DataContextProvider>
        <div className="h-full overflow-y-auto">
          <div ref={formRef}>
            <Suspense>
              <EditorInner
                appState={appState}
                onSave={handleSave}
                onDirtyChange={handleDirtyChange}
                onModelReady={onReadyToSave}
                resetKey={resetKey}
              />
            </Suspense>
          </div>
        </div>
      </DataContextProvider>
    </AppContextProvider>
  );
};

export default EditorClient;
