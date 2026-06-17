'use client';

import React, { createContext, useContext } from 'react';

import type { AppSettings, DialApp } from '@/types/dial-entities';

export interface AppState {
  app: DialApp;
  settings: AppSettings;
  isReady: boolean;
}

const AppContext = createContext<AppState | null>(null);

export const AppContextProvider = AppContext.Provider;

export function useAppContext(): AppState {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppContext must be used inside AppContextProvider');
  return ctx;
}
