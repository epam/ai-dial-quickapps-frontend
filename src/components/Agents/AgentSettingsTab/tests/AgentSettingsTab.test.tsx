import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { DialAppTransportType } from '@/types/quick-apps';

import { AgentSettingsTab, type AgentSettingsTabProps } from '../AgentSettingsTab';

vi.mock('@/hooks/use-translation', () => ({
  useTranslation: () => ({ language: 'en-US', t: (key: string) => key }),
}));

let root: Root;
let container: HTMLDivElement;
const onTransportChange = vi.fn();

const render = (props: Partial<AgentSettingsTabProps> = {}) => {
  act(() =>
    root.render(
      <AgentSettingsTab
        agentId="applications/public/research"
        isTransportDisabled={false}
        onTransportChange={onTransportChange}
        {...props}
      />,
    ),
  );
};

const getRadio = (label: string) =>
  [...container.querySelectorAll<HTMLInputElement>('input[type="radio"]')].find((radio) =>
    [...(radio.labels ?? [])].some((node) => node.textContent?.trim() === label),
  );

beforeEach(() => {
  (globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;
  onTransportChange.mockReset();
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  document.documentElement.dir = '';
});

describe('AgentSettingsTab', () => {
  it('labels the group "Connect via" and checks MCP when nothing is saved', () => {
    render();

    expect(container.textContent).toContain('Connect via');
    expect(getRadio('MCP')?.checked).toBe(true);
    expect(getRadio('Chat Completion')?.checked).toBe(false);
  });

  it('checks the saved transport', () => {
    render({ transport: DialAppTransportType.ChatCompletion });

    expect(getRadio('Chat Completion')?.checked).toBe(true);
  });

  it('reports the chosen transport', () => {
    render();

    act(() => getRadio('Chat Completion')?.click());

    expect(onTransportChange).toHaveBeenCalledWith(DialAppTransportType.ChatCompletion);
  });

  it('disables both options when the transport is read-only', () => {
    render({ isTransportDisabled: true });

    expect(getRadio('MCP')?.disabled).toBe(true);
    expect(getRadio('Chat Completion')?.disabled).toBe(true);
  });

  it('keeps both options and their names in a right-to-left document', () => {
    document.documentElement.dir = 'rtl';
    render();

    expect(getRadio('MCP')).toBeTruthy();
    expect(getRadio('Chat Completion')).toBeTruthy();
  });
});
