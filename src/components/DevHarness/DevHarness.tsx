'use client';
import { FC, memo, useEffect, useRef, useState } from 'react';

import { useThemeContext } from '@/context/ThemeContext';

import { DEFAULT_QUICK_APPS_SCHEMA_2_ID } from '@/constants/quick-apps';
import type { DialApp, AppSettings } from '@/types/dial-entities';
import type { QuickApp2Config } from '@/types/quick-apps';

const MOCK_APP_CONFIG: QuickApp2Config = {
  orchestrator: {
    deployment: {
      deployment_id: 'gpt-4o',
      parameters: { temperature: 0.5 },
    },
    system_prompt: {
      type: 'custom',
      variables: {},
      content: 'You are a helpful assistant.',
    },
  },
  contexts: [],
  tool_sets: [],
  conversation_starters: { starters: [] },
};

const MOCK_APP: DialApp = {
  id: 'applications/mock-quick-app',
  name: 'Mock QuickApp2',
  applicationTypeSchemaId: DEFAULT_QUICK_APPS_SCHEMA_2_ID,
  applicationProperties: MOCK_APP_CONFIG,
};

const MOCK_SETTINGS: AppSettings = {
  isPublishingEnabled: true,
  isCodeInterpreterEnabled: true,
};

interface LogEntry {
  direction: 'in' | 'out';
  type: string;
  payload?: unknown;
  ts: number;
}

interface DevHarnessProps {
  defaultDialApiHost: string;
  defaultToken: string;
}

const DevHarness: FC<DevHarnessProps> = ({ defaultDialApiHost, defaultToken }) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [token, setToken] = useState(defaultToken || 'dev-token');
  const [dialApiHost, setDialApiHost] = useState(defaultDialApiHost);
  const [isInitialized, setIsInitialized] = useState(false);
  const [log, setLog] = useState<LogEntry[]>([]);
  const logSeqRef = useRef(0);
  const [theme, setThemeParam] = useState<string>(() =>
    typeof window !== 'undefined'
      ? (new URLSearchParams(window.location.search).get('theme') ?? 'light')
      : 'light',
  );

  const { setTheme } = useThemeContext();

  const changeTheme = (id: string) => {
    setThemeParam(id);
    setTheme(id);
    const url = new URL(window.location.href);
    url.searchParams.set('theme', id);
    window.history.replaceState(null, '', url.toString());
  };

  const editorSrc = `/editor?theme=${theme}`;

  const addLog = (direction: 'in' | 'out', type: string, payload?: unknown) => {
    const id = logSeqRef.current++;
    setLog((prev) => [{ direction, type, payload, ts: id }, ...prev].slice(0, 50));
  };

  const sendInit = () => {
    iframeRef.current?.contentWindow?.postMessage(
      {
        type: 'INIT',
        payload: {
          app: MOCK_APP,
          token,
          dialApiHost,
          settings: MOCK_SETTINGS,
        },
      },
      '*',
    );
    addLog('out', 'INIT', { token: token ? '***' : '(empty)', dialApiHost });
    setIsInitialized(true);
  };

  const sendMessage = (type: string, payload?: unknown) => {
    iframeRef.current?.contentWindow?.postMessage(payload != null ? { type, payload } : { type }, '*');
    addLog('out', type, payload);
  };

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (!event.data?.type) return;
      addLog('in', event.data.type, event.data.payload);
      if (event.data.type === 'READY') {
        sendInit();
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  // sendInit is defined inline and captures token/dialApiHost at call time — intentionally
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, dialApiHost]);

  return (
    <div className="flex h-screen flex-col bg-gray-50 font-mono text-sm text-gray-900">
      <header className="flex items-center gap-4 border-b border-gray-200 bg-white px-4 py-2">
        <span className="font-semibold">QuickApp2 Dev Harness</span>
        <span className="rounded bg-yellow-100 px-2 py-0.5 text-xs text-yellow-800">DEV ONLY</span>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Config panel */}
        <aside className="flex w-64 flex-col gap-4 border-e border-gray-200 bg-white p-4 text-xs">
          <div className="flex flex-col gap-1">
            <label className="font-semibold text-gray-600">Token</label>
            <input
              className="rounded border border-gray-300 px-2 py-1"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="Bearer token"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="font-semibold text-gray-600">Theme</label>
            <select
              className="rounded border border-gray-300 px-2 py-1"
              value={theme}
              onChange={(e) => changeTheme(e.target.value)}
            >
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="font-semibold text-gray-600">DIAL API Host</label>
            <input
              className="rounded border border-gray-300 px-2 py-1"
              value={dialApiHost}
              onChange={(e) => setDialApiHost(e.target.value)}
            />
          </div>

          <button
            className="rounded bg-blue-600 px-3 py-1.5 text-white hover:bg-blue-700"
            onClick={sendInit}
          >
            Send INIT
          </button>

          <hr className="border-gray-200" />

          <span className="font-semibold text-gray-600">Controls</span>
          <button
            className="rounded border border-gray-300 px-3 py-1 hover:bg-gray-50 disabled:opacity-40"
            disabled={!isInitialized}
            onClick={() => sendMessage('TRIGGER_SAVE')}
          >
            Trigger Save
          </button>
          <button
            className="rounded border border-gray-300 px-3 py-1 hover:bg-gray-50 disabled:opacity-40"
            disabled={!isInitialized}
            onClick={() => sendMessage('TRIGGER_AUTO_SAVE', { ignoreDirty: false })}
          >
            Trigger Auto Save
          </button>
          <button
            className="rounded border border-gray-300 px-3 py-1 hover:bg-gray-50 disabled:opacity-40"
            disabled={!isInitialized}
            onClick={() => sendMessage('RESET')}
          >
            Reset
          </button>

          <hr className="border-gray-200" />

          <div className="flex items-center justify-between">
            <span className="font-semibold text-gray-600">Message log</span>
            <button className="text-gray-400 hover:text-gray-700" onClick={() => setLog([])}>
              clear
            </button>
          </div>
          <div className="flex flex-1 flex-col gap-1 overflow-y-auto">
            {log.map((entry) => (
              <div
                key={entry.ts}
                className={`rounded px-2 py-1 ${entry.direction === 'in' ? 'bg-green-50 text-green-800' : 'bg-blue-50 text-blue-800'}`}
              >
                <span className="font-semibold">{entry.direction === 'in' ? '← ' : '→ '}</span>
                {entry.type}
              </div>
            ))}
          </div>
        </aside>

        {/* Editor iframe */}
        <main className="flex flex-1 flex-col overflow-hidden">
          <iframe
            ref={iframeRef}
            src={editorSrc}
            className="flex-1 border-0"
            title="QuickApp2 Editor"
          />
        </main>
      </div>
    </div>
  );
};

export default memo(DevHarness);
