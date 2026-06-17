'use client';
import { Suspense, useCallback, useEffect, useRef, useState } from 'react';

import { AppContextProvider, type AppState } from '@/context/AppContext';
import { DataContextProvider } from '@/context/DataContext';
import { buildQuickApp2Config, getQuickApp2FormData } from '@/form/quickApp2Form';
import type { QuickApp2Form as QuickApp2FormType } from '@/form/quickApp2Form';
import { QuickApp2Config } from '@/types/quick-apps';
import { saveDialApp } from '@/utils/dialClient';
import type { DialApp, AppSettings } from '@/types/dial-entities';
import { QuickApp2Form } from '@/components/QuickApp2Form/QuickApp2Form';
import { useDataContext } from '@/context/DataContext';

const ALLOWED_ORIGIN = process.env.NEXT_PUBLIC_ALLOWED_ORIGIN ?? '*';

type InboundMessage =
  | { type: 'INIT'; payload: { app: DialApp; token: string; dialApiHost: string; settings: AppSettings } }
  | { type: 'TRIGGER_SAVE' }
  | { type: 'TRIGGER_AUTO_SAVE'; payload?: { ignoreDirty?: boolean } }
  | { type: 'RESET' };

function postToParent(msg: object) {
  window.parent.postMessage(msg, ALLOWED_ORIGIN === '*' ? '*' : ALLOWED_ORIGIN);
}

function isAllowedOrigin(origin: string): boolean {
  return ALLOWED_ORIGIN === '*' || origin === ALLOWED_ORIGIN;
}

interface EditorInnerProps {
  appState: AppState;
  onSave: (data: QuickApp2FormType, isAutoSave?: boolean) => Promise<void>;
  onDirtyChange: (isDirty: boolean) => void;
  resetKey: number;
}

function EditorInner({ appState, onSave, onDirtyChange, resetKey }: EditorInnerProps) {
  const { modelsMap, toolsetsMap, models } = useDataContext();

  const allEntitiesMap = { ...modelsMap, ...toolsetsMap };
  const toolSupportingModelIds = models.filter((m) => m.features?.tools).map((m) => m.id);
  const availableModelIds = models.map((m) => m.id);

  const handleSave = useCallback(
    async (data: QuickApp2FormType) => {
      await onSave(data, false);
    },
    [onSave],
  );

  return (
    <AppContextProvider value={appState}>
      <QuickApp2Form
        key={resetKey}
        onSave={handleSave}
      />
    </AppContextProvider>
  );
}

export default function EditorPage() {
  const [appState, setAppState] = useState<AppState | null>(null);
  const [resetKey, setResetKey] = useState(0);
  const isDirtyRef = useRef(false);
  const pendingSaveRef = useRef<((data: QuickApp2FormType, isAutoSave?: boolean) => void) | null>(null);

  useEffect(() => {
    postToParent({ type: 'READY' });

    const handleMessage = (event: MessageEvent) => {
      if (!isAllowedOrigin(event.origin)) return;
      const msg = event.data as InboundMessage;
      if (!msg?.type) return;

      switch (msg.type) {
        case 'INIT': {
          setAppState({
            token: msg.payload.token,
            dialApiHost: msg.payload.dialApiHost,
            app: msg.payload.app,
            settings: msg.payload.settings,
          });
          break;
        }
        case 'TRIGGER_SAVE':
        case 'TRIGGER_AUTO_SAVE': {
          const isAutoSave = msg.type === 'TRIGGER_AUTO_SAVE';
          if (pendingSaveRef.current) {
            // Form will call onSave when triggered; we signal via a custom event
            window.dispatchEvent(
              new CustomEvent('dial-editor-trigger-save', { detail: { isAutoSave } }),
            );
          }
          break;
        }
        case 'RESET': {
          setResetKey((k) => k + 1);
          break;
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // ResizeObserver for height changes
  const formRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = formRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      postToParent({ type: 'HEIGHT_CHANGE', payload: { height: el.scrollHeight } });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [appState]);

  const handleSave = useCallback(
    async (data: QuickApp2FormType, isAutoSave = false) => {
      if (!appState) return;
      const existingConfig = appState.app.applicationProperties as QuickApp2Config | undefined;
      const allEntitiesMap = {} as Record<string, { id: string; name?: string; type?: string }>;
      try {
        const newConfig = buildQuickApp2Config({ data, allEntitiesMap, existingConfig });
        const updatedApp = await saveDialApp(
          appState.token,
          appState.dialApiHost,
          appState.app.id,
          newConfig,
        );
        if (isAutoSave) {
          postToParent({ type: 'AUTO_SAVE_COMPLETE' });
        } else {
          postToParent({ type: 'SAVE_SUCCESS', payload: { updatedApp } });
        }
      } catch (err) {
        const error = err instanceof Error ? err.message : 'Save failed';
        postToParent({ type: 'SAVE_ERROR', payload: { error } });
      }
    },
    [appState],
  );

  const handleDirtyChange = useCallback((isDirty: boolean) => {
    if (isDirtyRef.current !== isDirty) {
      isDirtyRef.current = isDirty;
      postToParent({ type: 'DIRTY_STATE', payload: { isDirty } });
    }
  }, []);

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
