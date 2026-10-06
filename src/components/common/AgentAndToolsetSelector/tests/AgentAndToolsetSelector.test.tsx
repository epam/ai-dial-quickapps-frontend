import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AgentAndToolsetSelector } from '../AgentAndToolsetSelector';

vi.mock('@/hooks/useTranslation', () => ({
  useTranslation: () => ({ t: (key: string) => key, language: 'en' }),
}));
vi.mock('@/context/AppContext', () => ({
  useAppContext: () => ({ settings: { allowedOrigin: '*' } }),
}));
vi.mock('@/hooks/useSearchParams', () => ({
  useSearchParams: () => ({ get: () => null }),
}));
vi.mock('@/utils/request-application-credentials', () => ({
  requestApplicationCredentials: vi.fn(),
}));
vi.mock('../AgentAndToolsetChip', () => ({
  AgentAndToolsetChip: ({ id, onRemove }: { id: string; onRemove?: (id: string) => void }) => (
    <div data-testid="agent-toolset-chip">
      <span>{id}</span>
      {onRemove && (
        <button type="button" onClick={() => onRemove(id)}>
          Remove
        </button>
      )}
    </div>
  ),
}));
vi.mock('../AgentAndToolsetModal', () => ({ AgentAndToolsetModal: () => null }));
vi.mock('../ToolsetLoginModal', () => ({ ToolsetLoginModal: () => null }));
vi.mock('@/components/common/ToggleSwitch/ToggleSwitch', () => ({
  ToggleSwitch: ({ disabled, additionalText }: { disabled?: boolean; additionalText: string }) => (
    <button type="button" disabled={disabled}>
      {additionalText}
    </button>
  ),
}));
vi.mock('@epam/ai-dial-ui-kit', () => ({
  mergeClasses: (...values: Array<string | undefined>) => values.filter(Boolean).join(' '),
  DialLinkButton: ({
    disabled,
    label,
    onClick,
  }: {
    disabled?: boolean;
    label: string;
    onClick: () => void;
  }) => (
    <button type="button" disabled={disabled} onClick={onClick}>
      {label}
    </button>
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

const renderSelector = (
  value: string[],
  onChange = vi.fn(),
  readonly = false,
  onJsonSwitchClick?: () => void,
) => {
  act(() => {
    root.render(
      <AgentAndToolsetSelector
        value={value}
        onChange={onChange}
        readonly={readonly}
        allItemsMap={{}}
        onJsonSwitchClick={onJsonSwitchClick}
      />,
    );
  });
  return onChange;
};

describe('AgentAndToolsetSelector', () => {
  it('keeps Add visible and hides the empty content window', () => {
    renderSelector([]);

    expect(container.querySelector('button')).toBeTruthy();
    expect(container.querySelector('[data-testid="agent-toolset-chip"]')).toBeNull();
    expect(container.textContent).not.toContain('NoAgentsAndToolsetsAdded');
  });

  it('renders the existing chip panel when an agent or toolset is selected', () => {
    renderSelector(['toolset-1']);

    expect(container.querySelector('[data-testid="agent-toolset-chip"]')).toBeTruthy();
    expect(container.querySelector('.rounded.border')).toBeTruthy();
  });

  it('updates the form value when the last agent or toolset is removed', () => {
    const onChange = renderSelector(['toolset-1']);
    const removeButton = [...container.querySelectorAll('button')].find(
      (button) => button.textContent === 'Remove',
    );

    act(() => removeButton?.click());

    expect(onChange).toHaveBeenCalledWith([]);
  });

  it('keeps Add and JSON controls disabled in read-only mode', () => {
    renderSelector(['toolset-1'], vi.fn(), true, vi.fn());

    expect(container.querySelectorAll('button')[0]?.disabled).toBe(true);
    expect(container.textContent).toContain('JSON');
  });
});
