'use client';

import React, {
  createContext,
  useContext,
  useEffect,
  useReducer,
} from 'react';

import type { DialModel, DialToolset, ModelsMap, ToolsetsMap } from '@/types/dial-entities';
import { fetchDialModels, fetchDialToolsets } from '@/utils/dialClient';

import { useAppContext } from './AppContext';

interface DataState {
  models: DialModel[];
  modelsMap: ModelsMap;
  toolsets: DialToolset[];
  toolsetsMap: ToolsetsMap;
  files: string[];
  status: 'idle' | 'loading' | 'ready' | 'error';
  error?: string;
}

type DataAction =
  | { type: 'LOADING' }
  | { type: 'MODELS_LOADED'; payload: DialModel[] }
  | { type: 'TOOLSETS_LOADED'; payload: DialToolset[] }
  | { type: 'FILES_LOADED'; payload: string[] }
  | { type: 'READY' }
  | { type: 'ERROR'; payload: string };

const initialState: DataState = {
  models: [],
  modelsMap: {},
  toolsets: [],
  toolsetsMap: {},
  files: [],
  status: 'idle',
};

function reducer(state: DataState, action: DataAction): DataState {
  switch (action.type) {
    case 'LOADING':
      return { ...state, status: 'loading' };
    case 'MODELS_LOADED': {
      const modelsMap = Object.fromEntries(
        action.payload.map((m) => [m.id, m]),
      );
      return { ...state, models: action.payload, modelsMap };
    }
    case 'TOOLSETS_LOADED': {
      const toolsetsMap = Object.fromEntries(
        action.payload.map((t) => [t.id, t]),
      );
      return { ...state, toolsets: action.payload, toolsetsMap };
    }
    case 'FILES_LOADED':
      return { ...state, files: action.payload };
    case 'READY':
      return { ...state, status: 'ready' };
    case 'ERROR':
      return { ...state, status: 'error', error: action.payload };
    default:
      return state;
  }
}

const DataContext = createContext<DataState>(initialState);

export function DataContextProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const { token, dialApiHost } = useAppContext();

  useEffect(() => {
    dispatch({ type: 'LOADING' });
    Promise.all([
      fetchDialModels(token, dialApiHost),
      fetchDialToolsets(token, dialApiHost),
    ])
      .then(([models, toolsets]) => {
        dispatch({ type: 'MODELS_LOADED', payload: models });
        dispatch({ type: 'TOOLSETS_LOADED', payload: toolsets });
        dispatch({ type: 'READY' });
      })
      .catch((err: unknown) => {
        dispatch({
          type: 'ERROR',
          payload: err instanceof Error ? err.message : 'Failed to load data',
        });
      });
  }, [token, dialApiHost]);

  return <DataContext.Provider value={state}>{children}</DataContext.Provider>;
}

export function useDataContext(): DataState {
  return useContext(DataContext);
}
