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
import { fetchDialModels, fetchDialPrompts, fetchDialToolsets } from '@/utils/dialClient';
import { fetchFavoriteIds } from '@/utils/user-config';

import { useAppContext } from './AppContext';

interface DataState {
  models: DialModel[];
  modelsMap: ModelsMap;
  toolsets: DialToolset[];
  toolsetsMap: ToolsetsMap;
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
  refreshPrompts: () => Promise<void>;
  refreshToolsets: () => Promise<void>;
  refreshAll: () => void;
}

const DataContext = createContext<DataContextValue>({
  ...initialState,
  modelsWithFavorites: [],
  toolsetsWithFavorites: [],
  refreshPrompts: async () => undefined,
  refreshToolsets: async () => undefined,
  refreshAll: () => undefined,
});

export function DataContextProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const { isReady } = useAppContext();

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
    Promise.all([fetchDialModels(), fetchDialToolsets(), fetchDialPrompts(), favorites])
      .then(([models, toolsets, prompts, favoritesPayload]) => {
        dispatch({ type: 'MODELS_LOADED', payload: models });
        dispatch({ type: 'TOOLSETS_LOADED', payload: toolsets });
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

  return (
    <DataContext.Provider
      value={{
        ...state,
        modelsWithFavorites,
        toolsetsWithFavorites,
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
