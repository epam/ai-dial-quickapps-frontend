"use client";

import React, { createContext, useContext, useEffect, useReducer } from "react";

import type {
  DialModel,
  DialPrompt,
  DialToolset,
  ModelsMap,
  PromptsMap,
  ToolsetsMap,
} from "@/types/dial-entities";
import {
  fetchDialModels,
  fetchDialPrompts,
  fetchDialToolsets,
} from "@/utils/dialClient";

import { useAppContext } from "./AppContext";

interface DataState {
  models: DialModel[];
  modelsMap: ModelsMap;
  toolsets: DialToolset[];
  toolsetsMap: ToolsetsMap;
  prompts: DialPrompt[];
  promptsMap: PromptsMap;
  files: string[];
  status: "idle" | "loading" | "ready" | "error";
  error?: string;
}

type DataAction =
  | { type: "LOADING" }
  | { type: "MODELS_LOADED"; payload: DialModel[] }
  | { type: "TOOLSETS_LOADED"; payload: DialToolset[] }
  | { type: "PROMPTS_LOADED"; payload: DialPrompt[] }
  | { type: "FILES_LOADED"; payload: string[] }
  | { type: "READY" }
  | { type: "ERROR"; payload: string };

const initialState: DataState = {
  models: [],
  modelsMap: {},
  toolsets: [],
  toolsetsMap: {},
  prompts: [],
  promptsMap: {},
  files: [],
  status: "idle",
};

function reducer(state: DataState, action: DataAction): DataState {
  switch (action.type) {
    case "LOADING":
      return { ...state, status: "loading" };
    case "MODELS_LOADED": {
      const modelsMap = Object.fromEntries(
        action.payload.map((m) => [m.id, m]),
      );
      return { ...state, models: action.payload, modelsMap };
    }
    case "TOOLSETS_LOADED": {
      const toolsetsMap = Object.fromEntries(
        action.payload.map((t) => [t.id, t]),
      );
      return { ...state, toolsets: action.payload, toolsetsMap };
    }
    case "PROMPTS_LOADED": {
      const promptsMap = Object.fromEntries(
        action.payload.map((p) => [p.id, p]),
      );
      return { ...state, prompts: action.payload, promptsMap };
    }
    case "FILES_LOADED":
      return { ...state, files: action.payload };
    case "READY":
      return { ...state, status: "ready" };
    case "ERROR":
      return { ...state, status: "error", error: action.payload };
    default:
      return state;
  }
}

interface DataContextValue extends DataState {
  refreshPrompts: () => Promise<void>;
  refreshToolsets: () => Promise<void>;
}

const DataContext = createContext<DataContextValue>({
  ...initialState,
  refreshPrompts: async () => undefined,
  refreshToolsets: async () => undefined,
});

export function DataContextProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const { isReady } = useAppContext();

  useEffect(() => {
    if (!isReady) return;
    dispatch({ type: "LOADING" });
    Promise.all([fetchDialModels(), fetchDialToolsets(), fetchDialPrompts()])
      .then(([models, toolsets, prompts]) => {
        dispatch({ type: "MODELS_LOADED", payload: models });
        dispatch({ type: "TOOLSETS_LOADED", payload: toolsets });
        dispatch({ type: "PROMPTS_LOADED", payload: prompts });
        dispatch({ type: "READY" });
      })
      .catch((err: unknown) => {
        dispatch({
          type: "ERROR",
          payload: err instanceof Error ? err.message : "Failed to load data",
        });
      });
  }, [isReady]);

  const refreshPrompts = async () => {
    const prompts = await fetchDialPrompts();
    dispatch({ type: "PROMPTS_LOADED", payload: prompts });
  };

  const refreshToolsets = async () => {
    const toolsets = await fetchDialToolsets();
    dispatch({ type: "TOOLSETS_LOADED", payload: toolsets });
  };

  return (
    <DataContext.Provider value={{ ...state, refreshPrompts, refreshToolsets }}>
      {children}
    </DataContext.Provider>
  );
}

export function useDataContext(): DataContextValue {
  return useContext(DataContext);
}
