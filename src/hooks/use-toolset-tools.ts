import { useCallback, useEffect, useState } from 'react';

import { ToolsStatus } from '@/types/toolset-tools';
import { fetchToolsetToolNames } from '@/utils/dial-client';

export interface UseToolsetToolsResult {
  status: ToolsStatus;
  names: string[];
  retry: () => void;
}

interface ToolsState {
  /** The request this result belongs to — `${toolsetId}#${attempt}`. */
  requestKey: string;
  status: ToolsStatus.Ready | ToolsStatus.Error;
  names: string[];
}

const NO_NAMES: string[] = [];

/**
 * Loads the names of a toolset's tools once `isEnabled` turns on (the Tools
 * tab was opened). Without a toolset id or while disabled nothing is
 * requested. A response for a previous toolset or attempt is dropped, and
 * leaving aborts the request.
 */
export const useToolsetTools = (toolsetId?: string, isEnabled = false): UseToolsetToolsResult => {
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<ToolsState | null>(null);

  const requestKey = toolsetId == null || !isEnabled ? null : `${toolsetId}#${attempt}`;

  useEffect(() => {
    if (requestKey == null || toolsetId == null) return undefined;

    let isCancelled = false;
    const controller = new AbortController();

    const load = async () => {
      try {
        const names = await fetchToolsetToolNames(toolsetId, controller.signal);
        if (!isCancelled) setResult({ requestKey, status: ToolsStatus.Ready, names });
      } catch {
        if (!isCancelled) setResult({ requestKey, status: ToolsStatus.Error, names: NO_NAMES });
      }
    };

    void load();

    return () => {
      isCancelled = true;
      controller.abort();
    };
    // `requestKey` already encodes `toolsetId`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestKey]);

  const retry = useCallback(() => setAttempt((value) => value + 1), []);

  if (requestKey == null) return { status: ToolsStatus.Idle, names: NO_NAMES, retry };
  if (result?.requestKey !== requestKey) {
    return { status: ToolsStatus.Loading, names: NO_NAMES, retry };
  }
  return { status: result.status, names: result.names, retry };
};
