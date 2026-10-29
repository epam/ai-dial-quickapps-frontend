import { Suspense, useCallback, useEffect, useRef, useState } from 'react';

import { AppContextProvider, type AppState } from '@/context/AppContext';
import { useTranslation } from 'react-i18next';
import type { AppSettings, MaybeLocalizedText } from '@/types/dial-entities';
import ForbiddenPage from '@/components/ForbiddenPage/ForbiddenPage';
import FullScreenSpinner from '@/components/FullScreenSpinner/FullScreenSpinner';
import { DataContextProvider } from '@/context/DataContext';
import { buildQuickApp2Config } from '@/form/build-quick-app-config';
import type { QuickApp2Form as QuickApp2FormType } from '@/types/quick-app-form';
import { QuickApp2Config } from '@/types/quick-apps';
import { postEditorMessage } from '@/utils/post-editor-message';
import { readHostEditorMessage } from '@/utils/read-host-editor-message';
import { ForbiddenError } from '@/utils/forbidden-error';
import { decodeDialPath, fetchDialApp, saveDialApp } from '@/utils/dial-client';
import { getChatApiErrorMessage } from '@/utils/chat-api-error';
import { buildLocalizedText } from '@/utils/get-localized-text';
import { hasQuickAppChanges, type StoredGeneralFields } from '@/utils/has-quick-app-changes';
import {
  QuickApp2Form,
  type QuickApp2AllEntitiesMap,
} from '@/components/QuickApp2Form/QuickApp2Form';
import { AUTO_SAVE_INTERVAL_MS } from '@/constants/editor';
import { AppsEditorI18nKeys } from '@/constants/translation-keys';
import {
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
  ) => Promise<boolean>;
  onDirtyChange: (isDirty: boolean) => void;
  onValidationError: (messages: string[]) => void;
  onValidityChange: (isValid: boolean) => void;
  onModelReady?: () => void;
  resetKey: number;
}

const EditorInner = ({
  appState,
  onSave,
  onDirtyChange,
  onValidationError,
  onValidityChange,
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
      return onSave(data, allEntitiesMap, isAutoSave, general);
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
          onValidationError={onValidationError}
          onValidityChange={onValidityChange}
          onModelReady={onModelReady}
        />
      </AppContextProvider>
    </div>
  );
};

interface EditorClientProps {
  /**
   * Runtime settings, loaded once by the root route for the signed-in user.
   * Read once at initialization; the editor never requests them itself.
   */
  settings: AppSettings;
  /**
   * Called once a model has been resolved in the form (the saved model's
   * details loaded, or the default assigned) — the point at which a
   * TriggerSave would produce a correct save.
   */
  onReadyToSave?: () => void;
}

const EditorClient = ({ settings, onReadyToSave }: EditorClientProps) => {
  const { t, i18n } = useTranslation();
  const language = i18n.resolvedLanguage ?? i18n.language;
  const [appState, setAppState] = useState<AppState | null>(null);
  const [hasLoadError, setHasLoadError] = useState(false);
  const [isForbidden, setIsForbidden] = useState(false);
  const [resetKey, setResetKey] = useState(0);
  const [hasSavedOnce, setHasSavedOnce] = useState(false);
  const isDirtyRef = useRef(false);
  const isValidRef = useRef(true);
  const isInitializedRef = useRef(false);
  const hasSavedOnceRef = useRef(false);
  // The settings are read once per initialization (app-configuration spec).
  const settingsRef = useRef(settings);
  const allowedOriginsRef = useRef<string[]>(settings.allowedOrigins ?? []);

  useEffect(() => {
    hasSavedOnceRef.current = hasSavedOnce;
  }, [hasSavedOnce]);

  useEffect(() => {
    postEditorMessage({ type: OutboundMessageType.Ready }, allowedOriginsRef.current);

    let cancelled = false;
    const rawAppId = new URLSearchParams(window.location.search).get('id');
    const appId = rawAppId ? decodeDialPath(rawAppId) : null;
    const initialize = async (id: string) => {
      try {
        const app = await fetchDialApp(id);
        if (cancelled) return;
        setAppState({
          app: app ?? { id, name: '' },
          settings: settingsRef.current,
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
        setHasLoadError(true);
      }
    };

    if (appId && !isInitializedRef.current) {
      isInitializedRef.current = true;
      void initialize(appId);
    }

    const handleMessage = (event: MessageEvent) => {
      const msg = readHostEditorMessage(event, allowedOriginsRef.current);
      if (!msg) return;

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
      postEditorMessage(
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
      if (!appState) return false;
      const existingConfig = appState.app.applicationProperties as QuickApp2Config | undefined;
      try {
        const newConfig = buildQuickApp2Config({
          data,
          allEntitiesMap,
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
        // What was just stored is the baseline for the next save, hasChanges and Reset.
        // Built from the request: it is already in the editor's shape (decoded URLs,
        // `_rawForSave`), and the General fields are recombined as chat-api stores them.
        const savedApp = {
          ...appWithFormValues,
          applicationProperties: newConfig,
          _rawForSave: {
            displayName: effectiveGeneral.name,
            description: effectiveGeneral.description,
            iconUrl: effectiveGeneral.iconUrl,
            topics: effectiveGeneral.topics,
            displayVersion: general?.display_version?.trim() || rawForSave.displayVersion,
          },
        };
        setAppState((current) => (current ? { ...current, app: savedApp } : current));
        setHasSavedOnce(true);
        if (isAutoSave) {
          postEditorMessage(
            { type: OutboundMessageType.AutoSaveComplete },
            allowedOriginsRef.current,
          );
        } else {
          postEditorMessage(
            {
              type: OutboundMessageType.SaveSuccess,
              payload: { updatedApp },
              hasChanges,
            },
            allowedOriginsRef.current,
          );
        }
        return true;
      } catch (err) {
        // chat-api's own reason when it gave one, else the host's translated save failure.
        const error = (await getChatApiErrorMessage(err)) ?? t(AppsEditorI18nKeys.ErrorSaveFailed);
        postEditorMessage(
          {
            type: OutboundMessageType.SaveError,
            payload: { error },
          },
          allowedOriginsRef.current,
        );
        return false;
      }
    },
    [appState, language, t],
  );

  const handleDirtyChange = useCallback((isDirty: boolean) => {
    if (isDirtyRef.current !== isDirty) {
      isDirtyRef.current = isDirty;
      postEditorMessage(
        {
          type: OutboundMessageType.DirtyState,
          payload: { isDirty },
        },
        allowedOriginsRef.current,
      );
    }
  }, []);

  const handleValidityChange = useCallback((isValid: boolean) => {
    if (isValidRef.current !== isValid) {
      isValidRef.current = isValid;
      postEditorMessage(
        {
          type: OutboundMessageType.ValidityState,
          payload: { isValid },
        },
        allowedOriginsRef.current,
      );
    }
  }, []);

  // Tells the host a manual save was rejected before any request, so its Save doesn't wait for a timeout.
  const handleValidationError = useCallback((messages: string[]) => {
    postEditorMessage(
      {
        type: OutboundMessageType.SaveError,
        payload: { error: messages.join('; ') },
      },
      allowedOriginsRef.current,
    );
  }, []);

  if (isForbidden) {
    return <ForbiddenPage />;
  }

  if (hasLoadError) {
    return (
      <div className="flex h-screen items-center justify-center text-error">
        {t(AppsEditorI18nKeys.SchemaFormLoadFailed)}
      </div>
    );
  }

  if (!appState) {
    return <FullScreenSpinner />;
  }

  return (
    <AppContextProvider value={appState}>
      <DataContextProvider>
        {/* `relative` keeps the UI kit's visually hidden (`sr-only`, absolute) inputs inside the
            scroller; otherwise they escape it, stretch the document past the iframe and focusing
            one — every Switch tap — scrolls the whole editor (Issue #260). */}
        <div className="relative h-full overflow-y-auto">
          <div ref={formRef}>
            <Suspense>
              <EditorInner
                appState={appState}
                onSave={handleSave}
                onDirtyChange={handleDirtyChange}
                onValidationError={handleValidationError}
                onValidityChange={handleValidityChange}
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
