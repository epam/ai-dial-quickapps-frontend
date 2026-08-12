'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
} from 'react';

import type {
  DialModel,
  DialPrompt,
  DialToolset,
  ModelsMap,
  PromptsMap,
  ToolsetsMap,
} from '@/types/dial-entities';
import { InboundMessageType, ToolsetAuthResultPayload } from '@/types/editor-messages';
import { applyToolsetLoginResult } from '@/utils/apply-toolset-login-result';
import {
  fetchDialMcpAgents,
  fetchDialModels,
  fetchDialPrompts,
  fetchDialToolsets,
} from '@/utils/dialClient';
import { fetchFavoriteIds } from '@/utils/user-config';

import { useAppContext } from './AppContext';

interface DataState {
  models: DialModel[];
  modelsMap: ModelsMap;
  toolsets: DialToolset[];
  toolsetsMap: ToolsetsMap;
  /**
   * MCP-capable agents, fetched separately via the `mcp` deployment
   * interface. Kept out of `models`/`modelsMap` so the model selector
   * (which only wants chat-interface deployments) is unaffected — only the
   * Agents & Toolsets picker consumes this.
   */
  mcpAgents: DialModel[];
  mcpAgentsMap: ModelsMap;
  prompts: DialPrompt[];
  promptsMap: PromptsMap;
  promptsVersion: number;
  files: string[];
  favoriteIds: Set<string>;
  favoritesError?: string;
  status: 'idle' | 'loading' | 'ready' | 'error';
  error?: string;
}

type DataAction =
  | { type: 'LOADING' }
  | { type: 'MODELS_LOADED'; payload: DialModel[] }
  | { type: 'TOOLSETS_LOADED'; payload: DialToolset[] }
  | { type: 'MCP_AGENTS_LOADED'; payload: DialModel[] }
  | { type: 'TOOLSET_LOGIN_RESULT_APPLIED'; payload: ToolsetAuthResultPayload }
  | { type: 'PROMPTS_LOADED'; payload: DialPrompt[] }
  | { type: 'FILES_LOADED'; payload: string[] }
  | { type: 'FAVORITES_LOADED'; payload: { ids: Set<string>; error?: string } }
  | { type: 'READY' }
  | { type: 'ERROR'; payload: string };

const initialState: DataState = {
  models: [],
  modelsMap: {},
  toolsets: [],
  toolsetsMap: {},
  mcpAgents: [],
  mcpAgentsMap: {},
  prompts: [],
  promptsMap: {},
  promptsVersion: 0,
  files: [],
  favoriteIds: new Set(),
  status: 'idle',
};

function reducer(state: DataState, action: DataAction): DataState {
  switch (action.type) {
    case 'LOADING':
      return { ...state, status: 'loading' };
    case 'MODELS_LOADED': {
      const modelsMap = Object.fromEntries(action.payload.map((m) => [m.id, m]));
      return { ...state, models: action.payload, modelsMap };
    }
    case 'TOOLSETS_LOADED': {
      const toolsetsMap = Object.fromEntries(action.payload.map((t) => [t.id, t]));
      return { ...state, toolsets: action.payload, toolsetsMap };
    }
    case 'MCP_AGENTS_LOADED': {
      const mcpAgentsMap = Object.fromEntries(action.payload.map((a) => [a.id, a]));
      return { ...state, mcpAgents: action.payload, mcpAgentsMap };
    }
    case 'TOOLSET_LOGIN_RESULT_APPLIED': {
      const existing = state.toolsetsMap[action.payload.toolsetId];
      // Unrelated logins elsewhere in the host app are expected to arrive
      // here too — silently ignore anything not in the current config.
      if (!existing) return state;

      const updated = applyToolsetLoginResult(existing, action.payload);
      const toolsets = state.toolsets.map((t) => (t.id === updated.id ? updated : t));
      return {
        ...state,
        toolsets,
        toolsetsMap: { ...state.toolsetsMap, [updated.id]: updated },
      };
    }
    case 'PROMPTS_LOADED': {
      const promptsMap = Object.fromEntries(action.payload.map((p) => [p.id, p]));
      return {
        ...state,
        prompts: action.payload,
        promptsMap,
        promptsVersion: state.promptsVersion + 1,
      };
    }
    case 'FILES_LOADED':
      return { ...state, files: action.payload };
    case 'FAVORITES_LOADED':
      return { ...state, favoriteIds: action.payload.ids, favoritesError: action.payload.error };
    case 'READY':
      return { ...state, status: 'ready' };
    case 'ERROR':
      return { ...state, status: 'error', error: action.payload };
    default:
      return state;
  }
}

interface DataContextValue extends DataState {
  /** `models`, stamped with `isUserFavorite`/`isStarred` from `favoriteIds`. */
  modelsWithFavorites: DialModel[];
  /** `toolsets`, stamped with `isUserFavorite`/`isStarred` from `favoriteIds`. */
  toolsetsWithFavorites: DialToolset[];
  /** `mcpAgents`, stamped with `isUserFavorite`/`isStarred` from `favoriteIds`. */
  mcpAgentsWithFavorites: DialModel[];
  refreshPrompts: () => Promise<void>;
  refreshToolsets: () => Promise<void>;
  refreshAll: () => void;
}

const DataContext = createContext<DataContextValue>({
  ...initialState,
  modelsWithFavorites: [],
  toolsetsWithFavorites: [],
  mcpAgentsWithFavorites: [],
  refreshPrompts: async () => undefined,
  refreshToolsets: async () => undefined,
  refreshAll: () => undefined,
});

export function DataContextProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const { isReady, settings } = useAppContext();

  const loadAll = useCallback(() => {
    dispatch({ type: 'LOADING' });
    const favorites = fetchFavoriteIds()
      .then((ids) => ({ ids }))
      .catch((err: unknown) => {
        // A genuinely-empty config is already resolved to an empty set inside
        // fetchFavoriteIds (404 case). Anything that lands here is a real
        // failure (network/auth/parse) — report it distinctly instead of
        // silently collapsing it into "no favorites yet".
        const message = err instanceof Error ? err.message : 'Failed to load favorites';
        console.error('[DataContext] failed to load favorites:', message);
        return { ids: new Set<string>(), error: message };
      });
    Promise.all([
      fetchDialModels(),
      fetchDialToolsets(),
      fetchDialMcpAgents(),
      fetchDialPrompts(),
      favorites,
    ])
      .then(([modelsRaw, toolsets, mcpAgentsRaw, prompts, favoritesPayload]) => {
        // The `mcp` deployment interface also returns entries that are
        // already present as chat models/applications — for those, fold the
        // mcp flag into the existing chat-interface entry (so it's still
        // configurable for MCP transport) instead of discarding it, then
        // drop the now-redundant mcp-interface copy so the picker doesn't
        // show duplicates. Entries also present as toolsets are dropped
        // outright, since toolsets are shown from `fetchDialToolsets`.
        const mcpIds = new Set(mcpAgentsRaw.map((a) => a.id));
        const models = modelsRaw.map((m) =>
          mcpIds.has(m.id) ? { ...m, mcp: true, features: { ...m.features, mcp: true } } : m,
        );
        const existingIds = new Set([
          ...models.map((m) => m.id),
          ...toolsets.map((t) => t.id),
        ]);
        const mcpAgents = mcpAgentsRaw.filter((agent) => !existingIds.has(agent.id));

        dispatch({ type: 'MODELS_LOADED', payload: models });
        dispatch({ type: 'TOOLSETS_LOADED', payload: toolsets });
        dispatch({ type: 'MCP_AGENTS_LOADED', payload: mcpAgents });
        dispatch({ type: 'PROMPTS_LOADED', payload: prompts });
        dispatch({ type: 'FAVORITES_LOADED', payload: favoritesPayload });
        dispatch({ type: 'READY' });
      })
      .catch((err: unknown) => {
        dispatch({
          type: 'ERROR',
          payload: err instanceof Error ? err.message : 'Failed to load data',
        });
      });
  }, []);

  useEffect(() => {
    if (!isReady) return;
    loadAll();
  }, [isReady, loadAll]);

  // The host can push TOOLSET_LOGIN_RESULT proactively — e.g. a user signs
  // into a toolset via the host's own chat-level sign-in dialog — with no
  // preceding REQUEST_TOOLSET_LOGIN from this editor. Apply it as a
  // targeted, incremental status update keyed off toolsetId alone; a
  // toolsetId outside the current config belongs to an unrelated login
  // elsewhere in the host and is ignored by the reducer.
  useEffect(() => {
    const allowedOrigin = settings.allowedOrigin;

    const handleMessage = (event: MessageEvent) => {
      if (allowedOrigin && allowedOrigin !== '*' && event.origin !== allowedOrigin) return;

      const msg = event.data as { type?: string } & Partial<ToolsetAuthResultPayload>;
      if (msg?.type !== InboundMessageType.ToolsetLoginResult) return;
      if (!msg.success || !msg.toolsetId) return;

      dispatch({ type: 'TOOLSET_LOGIN_RESULT_APPLIED', payload: msg as ToolsetAuthResultPayload });
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [settings.allowedOrigin]);

  const refreshPrompts = async () => {
    const prompts = await fetchDialPrompts();
    dispatch({ type: 'PROMPTS_LOADED', payload: prompts });
  };

  const refreshToolsets = async () => {
    const toolsets = await fetchDialToolsets();
    dispatch({ type: 'TOOLSETS_LOADED', payload: toolsets });
  };

  const modelsWithFavorites = useMemo(
    () =>
      state.models.map((m) => ({
        ...m,
        isUserFavorite: state.favoriteIds.has(m.id),
        isStarred: state.favoriteIds.has(m.id),
      })),
    [state.models, state.favoriteIds],
  );

  const toolsetsWithFavorites = useMemo(
    () =>
      state.toolsets.map((t) => ({
        ...t,
        isUserFavorite: state.favoriteIds.has(t.id),
        isStarred: state.favoriteIds.has(t.id),
      })),
    [state.toolsets, state.favoriteIds],
  );

  const mcpAgentsWithFavorites = useMemo(
    () =>
      state.mcpAgents.map((a) => ({
        ...a,
        isUserFavorite: state.favoriteIds.has(a.id),
        isStarred: state.favoriteIds.has(a.id),
      })),
    [state.mcpAgents, state.favoriteIds],
  );

  return (
    <DataContext.Provider
      value={{
        ...state,
        modelsWithFavorites,
        toolsetsWithFavorites,
        mcpAgentsWithFavorites,
        refreshPrompts,
        refreshToolsets,
        refreshAll: loadAll,
      }}
    >
      {children}
    </DataContext.Provider>
  );
}

export function useDataContext(): DataContextValue {
  return useContext(DataContext);
}
