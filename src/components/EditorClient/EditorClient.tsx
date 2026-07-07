"use client";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";

import { AppContextProvider, type AppState } from "@/context/AppContext";
import { DataContextProvider } from "@/context/DataContext";
import { buildQuickApp2Config } from "@/form/quickApp2Form";
import type { QuickApp2Form as QuickApp2FormType } from "@/form/quickApp2Form";
import { QuickApp2Config } from "@/types/quick-apps";
import {
  decodeDialPath,
  fetchAppSettings,
  fetchDialApp,
  saveDialApp,
} from "@/utils/dialClient";
import {
  QuickApp2Form,
  type QuickApp2AllEntitiesMap,
} from "@/components/QuickApp2Form";
import {
  AUTO_SAVE_INTERVAL_MS,
  DIAL_EDITOR_TRIGGER_SAVE_EVENT,
} from "@/constants/editor";
import { DEFAULT_QUICK_APPS_SCHEMA_2_ID } from "@/constants/quick-apps";
import {
  InboundMessage,
  InboundMessageType,
  OutboundMessageType,
} from "@/types/editor-messages";

const ALLOWED_ORIGIN = process.env.NEXT_PUBLIC_ALLOWED_ORIGIN ?? "*";

const postToParent = (msg: object) => {
  window.parent.postMessage(msg, ALLOWED_ORIGIN === "*" ? "*" : ALLOWED_ORIGIN);
};

const isAllowedOrigin = (origin: string): boolean =>
  ALLOWED_ORIGIN === "*" || origin === ALLOWED_ORIGIN;

const dispatchTriggerSave = (detail: {
  isAutoSave: boolean;
  ignoreDirty?: boolean;
}) => {
  window.dispatchEvent(
    new CustomEvent(DIAL_EDITOR_TRIGGER_SAVE_EVENT, { detail }),
  );
};

interface EditorInnerProps {
  appState: AppState;
  onSave: (
    data: QuickApp2FormType,
    allEntitiesMap: QuickApp2AllEntitiesMap,
    isAutoSave?: boolean,
  ) => Promise<void>;
  onDirtyChange: (isDirty: boolean) => void;
  resetKey: number;
}

const EditorInner = ({
  appState,
  onSave,
  onDirtyChange,
  resetKey,
}: EditorInnerProps) => {
  const handleSave = useCallback(
    async (
      data: QuickApp2FormType,
      allEntitiesMap: QuickApp2AllEntitiesMap,
      isAutoSave = false,
    ) => {
      await onSave(data, allEntitiesMap, isAutoSave);
    },
    [onSave],
  );

  return (
    <div className="bg-layer-2">
      <AppContextProvider value={appState}>
        <QuickApp2Form
          key={resetKey}
          onSave={handleSave}
          onDirtyChange={onDirtyChange}
        />
      </AppContextProvider>
    </div>
  );
};

export default function EditorClient() {
  const [appState, setAppState] = useState<AppState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [resetKey, setResetKey] = useState(0);
  const [hasSavedOnce, setHasSavedOnce] = useState(false);
  const isDirtyRef = useRef(false);
  const isInitializedRef = useRef(false);
  const hasSavedOnceRef = useRef(false);

  useEffect(() => {
    hasSavedOnceRef.current = hasSavedOnce;
  }, [hasSavedOnce]);

  useEffect(() => {
    postToParent({ type: OutboundMessageType.Ready });

    let cancelled = false;
    const rawAppId = new URLSearchParams(window.location.search).get("id");
    const appId = rawAppId ? decodeDialPath(rawAppId) : null;
    if (appId && !isInitializedRef.current) {
      isInitializedRef.current = true;
      Promise.all([fetchDialApp(appId), fetchAppSettings()])
        .then(([app, settings]) => {
          if (cancelled) return;
          setAppState({
            app: app ?? {
              id: appId,
              name: "",
              applicationTypeSchemaId: DEFAULT_QUICK_APPS_SCHEMA_2_ID,
            },
            settings,
            isReady: true,
          });
          setHasSavedOnce(!!app);
        })
        .catch((err: unknown) => {
          isInitializedRef.current = false;
          if (!cancelled)
            setError(
              err instanceof Error ? err.message : "Initialization failed",
            );
        });
    }

    const handleMessage = (event: MessageEvent) => {
      if (!isAllowedOrigin(event.origin)) return;
      const msg = event.data as InboundMessage;
      if (!msg?.type) return;

      switch (msg.type) {
        case InboundMessageType.TriggerSave:
        case InboundMessageType.TriggerAutoSave: {
          const isAutoSave = msg.type === InboundMessageType.TriggerAutoSave;
          if (isAutoSave && !hasSavedOnceRef.current) break;
          dispatchTriggerSave({
            isAutoSave,
            ignoreDirty: isAutoSave ? msg.payload?.ignoreDirty : undefined,
          });
          break;
        }
        case InboundMessageType.Reset: {
          setResetKey((k) => k + 1);
          break;
        }
      }
    };

    window.addEventListener("message", handleMessage);
    return () => {
      cancelled = true;
      window.removeEventListener("message", handleMessage);
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
      postToParent({
        type: OutboundMessageType.HeightChange,
        payload: { height: el.scrollHeight },
      });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [appState]);

  const handleSave = useCallback(
    async (
      data: QuickApp2FormType,
      allEntitiesMap: QuickApp2AllEntitiesMap,
      isAutoSave = false,
    ) => {
      if (!appState) return;
      const existingConfig = appState.app.applicationProperties as
        | QuickApp2Config
        | undefined;
      try {
        const newConfig = buildQuickApp2Config({
          data,
          allEntitiesMap,
          existingConfig,
        });
        const appWithFormValues = {
          ...appState.app,
          inputAttachmentTypes: data.inputAttachmentTypes,
          maxInputAttachments: data.maxInputAttachments,
        };
        const updatedApp = await saveDialApp(appWithFormValues, newConfig);
        setHasSavedOnce(true);
        if (isAutoSave) {
          postToParent({ type: OutboundMessageType.AutoSaveComplete });
        } else {
          postToParent({
            type: OutboundMessageType.SaveSuccess,
            payload: { updatedApp },
          });
        }
      } catch (err) {
        const error = err instanceof Error ? err.message : "Save failed";
        postToParent({
          type: OutboundMessageType.SaveError,
          payload: { error },
        });
      }
    },
    [appState],
  );

  const handleDirtyChange = useCallback((isDirty: boolean) => {
    if (isDirtyRef.current !== isDirty) {
      isDirtyRef.current = isDirty;
      postToParent({
        type: OutboundMessageType.DirtyState,
        payload: { isDirty },
      });
    }
  }, []);

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center text-red-500">
        {error}
      </div>
    );
  }

  if (!appState) {
    return (
      <div className="flex h-screen items-center justify-center text-secondary">
        Waiting for initialization…
      </div>
    );
  }

  return (
    <AppContextProvider value={appState}>
      <DataContextProvider>
        <div ref={formRef}>
          <Suspense>
            <EditorInner
              appState={appState}
              onSave={handleSave}
              onDirtyChange={handleDirtyChange}
              resetKey={resetKey}
            />
          </Suspense>
        </div>
      </DataContextProvider>
    </AppContextProvider>
  );
}
