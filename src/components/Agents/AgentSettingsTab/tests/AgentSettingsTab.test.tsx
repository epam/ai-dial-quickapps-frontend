import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { setupTestRoot } from '@/test-utils/test-root';

import { DialAppTransportType } from '@/types/quick-apps';

import { AgentSettingsTab, type AgentSettingsTabProps } from '../AgentSettingsTab';
import { ApplicationEditorI18nKeys } from '@/constants/translation-keys';

const dom = setupTestRoot();
const onTransportChange = vi.fn();

const render = (props: Partial<AgentSettingsTabProps> = {}) => {
  dom.render(
    <AgentSettingsTab
      agentId="applications/public/research"
      isTransportDisabled={false}
      onTransportChange={onTransportChange}
      {...props}
    />,
  );
};

const getRadio = (label: string) =>
  [...dom.container.querySelectorAll<HTMLInputElement>('input[type="radio"]')].find((radio) =>
    [...(radio.labels ?? [])].some((node) => node.textContent?.trim() === label),
  );

beforeEach(() => {
  onTransportChange.mockReset();
});

afterEach(() => {
  document.documentElement.dir = '';
});

describe('AgentSettingsTab', () => {
  it('labels the group "Connect via" and checks MCP when nothing is saved', () => {
    render();

    expect(dom.container.textContent).toContain(ApplicationEditorI18nKeys.AgentsConnectVia);
    expect(getRadio(ApplicationEditorI18nKeys.AgentsTransportMcp)?.checked).toBe(true);
    expect(getRadio(ApplicationEditorI18nKeys.AgentsTransportChatCompletion)?.checked).toBe(false);
  });

  it('checks the saved transport', () => {
    render({ transport: DialAppTransportType.ChatCompletion });

    expect(getRadio(ApplicationEditorI18nKeys.AgentsTransportChatCompletion)?.checked).toBe(true);
  });

  it('reports the chosen transport', () => {
    render();

    act(() => getRadio(ApplicationEditorI18nKeys.AgentsTransportChatCompletion)?.click());

    expect(onTransportChange).toHaveBeenCalledWith(DialAppTransportType.ChatCompletion);
  });

  it('disables both options when the transport is read-only', () => {
    render({ isTransportDisabled: true });

    expect(getRadio(ApplicationEditorI18nKeys.AgentsTransportMcp)?.disabled).toBe(true);
    expect(getRadio(ApplicationEditorI18nKeys.AgentsTransportChatCompletion)?.disabled).toBe(true);
  });

  it('keeps both options and their names in a right-to-left document', () => {
    document.documentElement.dir = 'rtl';
    render();

    expect(getRadio(ApplicationEditorI18nKeys.AgentsTransportMcp)).toBeTruthy();
    expect(getRadio(ApplicationEditorI18nKeys.AgentsTransportChatCompletion)).toBeTruthy();
  });
});
