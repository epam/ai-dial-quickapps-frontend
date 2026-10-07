import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useToolsetTools, type UseToolsetToolsResult } from '@/hooks/use-toolset-tools';
import { ToolsStatus } from '@/types/toolset-tools';

const { fetchToolsetToolNames } = vi.hoisted(() => ({ fetchToolsetToolNames: vi.fn() }));

vi.mock('@/utils/dial-client', () => ({ fetchToolsetToolNames }));

interface Deferred {
  resolve: (names: string[]) => void;
  reject: (error: Error) => void;
}

const defer = (): Deferred => {
  const deferred = {} as Deferred;
  fetchToolsetToolNames.mockImplementationOnce(
    () =>
      new Promise<string[]>((resolve, reject) => {
        deferred.resolve = resolve;
        deferred.reject = reject;
      }),
  );
  return deferred;
};

let root: Root;
let latest: UseToolsetToolsResult;

interface HarnessProps {
  toolsetId?: string;
  isEnabled?: boolean;
}

const Harness = ({ toolsetId, isEnabled }: HarnessProps) => {
  latest = useToolsetTools(toolsetId, isEnabled);
  return null;
};

const render = (props: HarnessProps) => {
  act(() => {
    root.render(<Harness {...props} />);
  });
};

beforeEach(() => {
  (globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;
  fetchToolsetToolNames.mockReset();
  root = createRoot(document.createElement('div'));
});

afterEach(() => {
  act(() => root.unmount());
});

describe('useToolsetTools', () => {
  it('makes no request while disabled or without a toolset', () => {
    render({ toolsetId: 'toolsets/public/figma', isEnabled: false });
    expect(latest.status).toBe(ToolsStatus.Idle);

    render({ toolsetId: undefined, isEnabled: true });
    expect(latest.status).toBe(ToolsStatus.Idle);

    expect(fetchToolsetToolNames).not.toHaveBeenCalled();
  });

  it('reports loading, then the tool names', async () => {
    const request = defer();
    render({ toolsetId: 'toolsets/public/figma', isEnabled: true });

    expect(latest.status).toBe(ToolsStatus.Loading);

    await act(async () => request.resolve(['a', 'b']));

    expect(latest.status).toBe(ToolsStatus.Ready);
    expect(latest.names).toEqual(['a', 'b']);
  });

  it('reports an error and loads again on retry', async () => {
    const failing = defer();
    render({ toolsetId: 'toolsets/public/figma', isEnabled: true });
    await act(async () => failing.reject(new Error('boom')));

    expect(latest.status).toBe(ToolsStatus.Error);

    const retried = defer();
    act(() => latest.retry());

    expect(latest.status).toBe(ToolsStatus.Loading);

    await act(async () => retried.resolve(['a']));

    expect(latest.status).toBe(ToolsStatus.Ready);
    expect(fetchToolsetToolNames).toHaveBeenCalledTimes(2);
  });

  it('ignores a response for a toolset that is no longer shown', async () => {
    const first = defer();
    const second = defer();
    render({ toolsetId: 'toolsets/public/a', isEnabled: true });
    render({ toolsetId: 'toolsets/public/b', isEnabled: true });

    await act(async () => first.resolve(['first']));

    expect(latest.status).toBe(ToolsStatus.Loading);

    await act(async () => second.resolve(['second']));

    expect(latest.names).toEqual(['second']);
  });

  it('aborts the request on unmount', () => {
    defer();
    render({ toolsetId: 'toolsets/public/figma', isEnabled: true });
    const signal = fetchToolsetToolNames.mock.calls[0][1] as AbortSignal;

    act(() => root.unmount());
    root = createRoot(document.createElement('div'));

    expect(signal.aborted).toBe(true);
  });
});
