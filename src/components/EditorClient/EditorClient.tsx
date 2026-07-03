"use client";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";

import { AppContextProvider, type AppState } from "@/context/AppContext";
import { DataContextProvider } from "@/context/DataContext";
import { buildQuickApp2Config } from "@/form/quickApp2Form";
import type { QuickApp2Form as QuickApp2FormType } from "@/form/quickApp2Form";
import { QuickApp2Config } from "@/types/quick-apps";
import { fetchDialApp, saveDialApp } from "@/utils/dialClient";
import { QuickApp2Form } from "@/components/QuickApp2Form/QuickApp2Form";
import { DEFAULT_QUICK_APPS_SCHEMA_2_ID } from "@/constants/quick-apps";

const ALLOWED_ORIGIN = process.env.NEXT_PUBLIC_ALLOWED_ORIGIN ?? "*";

type InboundMessage =
  | { type: "TRIGGER_SAVE" }
  | { type: "TRIGGER_AUTO_SAVE"; payload?: { ignoreDirty?: boolean } }
  | { type: "RESET" };

const postToParent = (msg: object) => {
  window.parent.postMessage(msg, ALLOWED_ORIGIN === "*" ? "*" : ALLOWED_ORIGIN);
};

const isAllowedOrigin = (origin: string): boolean =>
  ALLOWED_ORIGIN === "*" || origin === ALLOWED_ORIGIN;

interface EditorInnerProps {
  appState: AppState;
  onSave: (data: QuickApp2FormType, isAutoSave?: boolean) => Promise<void>;
  onDirtyChange: (isDirty: boolean) => void;
  resetKey: number;
}

const EditorInner = ({ appState, onSave, resetKey }: EditorInnerProps) => {
  const handleSave = useCallback(
    async (data: QuickApp2FormType) => {
      await onSave(data, false);
    },
    [onSave],
  );

  return (
    <div className="bg-layer-2">
      <AppContextProvider value={appState}>
        <QuickApp2Form key={resetKey} onSave={handleSave} />
      </AppContextProvider>
    </div>
  );
};

export default function EditorClient() {
  const [appState, setAppState] = useState<AppState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [resetKey, setResetKey] = useState(0);
  const isDirtyRef = useRef(false);
  const isInitializedRef = useRef(false);

  useEffect(() => {
    postToParent({ type: "READY" });

    let cancelled = false;
    const appId = new URLSearchParams(window.location.search).get("id");
    if (appId && !isInitializedRef.current) {
      isInitializedRef.current = true;
      fetchDialApp(appId)
        .then((app) => {
          if (cancelled) return;
          setAppState({
            app: app ?? {
              id: appId,
              name: "",
              applicationTypeSchemaId: DEFAULT_QUICK_APPS_SCHEMA_2_ID,
            },
            settings: {},
            isReady: true,
          });
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
        case "TRIGGER_SAVE":
        case "TRIGGER_AUTO_SAVE": {
          const isAutoSave = msg.type === "TRIGGER_AUTO_SAVE";
          window.dispatchEvent(
            new CustomEvent("dial-editor-trigger-save", {
              detail: { isAutoSave },
            }),
          );
          break;
        }
        case "RESET": {
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

  const formRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = formRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      postToParent({
        type: "HEIGHT_CHANGE",
        payload: { height: el.scrollHeight },
      });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [appState]);

  const handleSave = useCallback(
    async (data: QuickApp2FormType, isAutoSave = false) => {
      if (!appState) return;
      const existingConfig = appState.app.applicationProperties as
        | QuickApp2Config
        | undefined;
      const allEntitiesMap = {} as Record<
        string,
        { id: string; name?: string; type?: string }
      >;
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
        if (isAutoSave) {
          postToParent({ type: "AUTO_SAVE_COMPLETE" });
        } else {
          postToParent({ type: "SAVE_SUCCESS", payload: { updatedApp } });
        }
      } catch (err) {
        const error = err instanceof Error ? err.message : "Save failed";
        postToParent({ type: "SAVE_ERROR", payload: { error } });
      }
    },
    [appState],
  );

  const handleDirtyChange = useCallback((isDirty: boolean) => {
    if (isDirtyRef.current !== isDirty) {
      isDirtyRef.current = isDirty;
      postToParent({ type: "DIRTY_STATE", payload: { isDirty } });
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
