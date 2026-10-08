import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AgentAndToolsetSelector } from '../AgentAndToolsetSelector';

vi.mock('@/context/AppContext', () => ({
  useAppContext: () => ({ settings: { allowedOrigins: ['*'] } }),
}));
vi.mock('@/hooks/use-search-params', () => ({
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
vi.mock('../AgentAndToolsetModal', () => ({
  AgentAndToolsetModal: ({ onConfirm }: { onConfirm: (ids: string[]) => void }) => (
    <div data-testid="agent-toolset-modal">
      <button type="button" onClick={() => onConfirm(['toolset-1', 'agent-1'])}>
        Confirm
      </button>
    </div>
  ),
}));
vi.mock('../ToolsetLoginModal', () => ({ ToolsetLoginModal: () => null }));

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

const renderSelector = ({
  value = [] as string[],
  readonly = false,
  isSelectModalOpen = false,
  onChange = vi.fn(),
  onSelectModalOpenChange = vi.fn(),
} = {}) => {
  act(() => {
    root.render(
      <AgentAndToolsetSelector
        value={value}
        onChange={onChange}
        readonly={readonly}
        allItemsMap={{}}
        isSelectModalOpen={isSelectModalOpen}
        onSelectModalOpenChange={onSelectModalOpenChange}
      />,
    );
  });
  return { onChange, onSelectModalOpenChange };
};

describe('AgentAndToolsetSelector', () => {
  it('renders nothing when no agents or toolsets are selected', () => {
    renderSelector();

    expect(container.querySelector('[data-testid="agent-toolset-chip"]')).toBeNull();
    expect(container.querySelector('.rounded.border')).toBeNull();
  });

  it('renders the chip panel when an agent or toolset is selected', () => {
    renderSelector({ value: ['toolset-1'] });

    expect(container.querySelector('[data-testid="agent-toolset-chip"]')).toBeTruthy();
    expect(container.querySelector('.rounded.border')).toBeTruthy();
  });

  it('updates the form value when the last agent or toolset is removed', () => {
    const { onChange } = renderSelector({ value: ['toolset-1'] });
    const removeButton = [...container.querySelectorAll('button')].find(
      (button) => button.textContent === 'Remove',
    );

    act(() => removeButton?.click());

    expect(onChange).toHaveBeenCalledWith([]);
  });

  it('hides chip removal and the modal in read-only mode', () => {
    renderSelector({ value: ['toolset-1'], readonly: true, isSelectModalOpen: true });

    expect(container.textContent).not.toContain('Remove');
    expect(container.querySelector('[data-testid="agent-toolset-modal"]')).toBeNull();
  });

  it('applies the selection and closes the modal on confirm', () => {
    const { onChange, onSelectModalOpenChange } = renderSelector({ isSelectModalOpen: true });
    const confirmButton = [...container.querySelectorAll('button')].find(
      (button) => button.textContent === 'Confirm',
    );

    act(() => confirmButton?.click());

    expect(onChange).toHaveBeenCalledWith(['toolset-1', 'agent-1']);
    expect(onSelectModalOpenChange).toHaveBeenCalledWith(false);
  });
});
