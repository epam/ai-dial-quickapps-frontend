import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AgentAndToolsetChip } from '../AgentAndToolsetChip';

vi.mock('@/hooks/useTranslation', () => ({
  useTranslation: () => ({ language: 'en', t: (key: string) => key }),
}));
vi.mock('@/hooks/useApplicationAuthentication', () => ({
  useApplicationAuthentication: (appId?: string) => !!appId,
}));
vi.mock('../ChipTooltipContent', () => ({ ChipTooltipContent: () => null }));
vi.mock('@epam/ai-dial-ui-kit', () => ({
  ElementSize: { Small: 'small' },
  mergeClasses: (...values: unknown[]) => values.filter(Boolean).join(' '),
  DialTooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  DialTag: ({ label, onClick }: { label: string; onClick: () => void }) => (
    <button onClick={onClick}>{label}</button>
  ),
  DialGhostIconButton: ({ name, onClick }: { name: string; onClick: () => void }) => (
    <button onClick={onClick}>{name}</button>
  ),
}));
let root: Root;
let container: HTMLDivElement;
beforeEach(() => {
  (globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
});
afterEach(() => {
  act(() => root.unmount());
  container.remove();
});
const clickButton = (name: string) => {
  const button = [...container.querySelectorAll('button')].find(
    (element) => element.textContent === name,
  );
  expect(button).toBeTruthy();
  act(() => button?.click());
};
const agent = {
  id: 'applications/public/agent',
  name: 'Agent',
  type: 'application',
};

describe('application credentials', () => {
  it('opens application credentials instead of treating the agent as a toolset', () => {
    const credentials = vi.fn();
    const toolsetLogin = vi.fn();
    act(() =>
      root.render(
        <AgentAndToolsetChip
          id={agent.id}
          item={agent}
          onApplicationCredentials={credentials}
          onLoginToolset={toolsetLogin}
        />,
      ),
    );
    clickButton('Agent');
    expect(credentials).toHaveBeenCalledWith(agent);
    expect(toolsetLogin).not.toHaveBeenCalled();
  });
  it('offers credentials through the configure control for non-MCP agents', () => {
    const credentials = vi.fn();
    act(() =>
      root.render(
        <AgentAndToolsetChip id={agent.id} item={agent} onApplicationCredentials={credentials} />,
      ),
    );
    clickButton('Configure');
    expect(credentials).toHaveBeenCalledWith(agent);
  });
  it('does not offer application credentials when the host does not support them', () => {
    act(() => root.render(<AgentAndToolsetChip id={agent.id} item={agent} />));
    expect(container.textContent).not.toContain('Configure');
  });
  it('does not open credentials for a readonly chip', () => {
    const credentials = vi.fn();
    act(() =>
      root.render(
        <AgentAndToolsetChip
          id={agent.id}
          item={agent}
          readonly
          onApplicationCredentials={credentials}
        />,
      ),
    );
    clickButton('Agent');
    expect(credentials).not.toHaveBeenCalled();
    expect(container.textContent).not.toContain('Configure');
  });
});
