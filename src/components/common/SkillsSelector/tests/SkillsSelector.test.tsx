import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { SkillsSelector } from '../SkillsSelector';

vi.mock('@/context/DataContext', () => ({
  useDataContext: () => ({ skillsMap: { 'skill-1': { id: 'skill-1', name: 'Skill 1' } } }),
}));
vi.mock('../SkillChip', () => ({
  SkillChip: ({ id, onRemove }: { id: string; onRemove?: (id: string) => void }) => (
    <div data-testid="skill-chip">
      <span>{id}</span>
      {onRemove && (
        <button type="button" onClick={() => onRemove(id)}>
          Remove
        </button>
      )}
    </div>
  ),
}));
vi.mock('../SkillsModal', () => ({
  SkillsModal: ({ onConfirm }: { onConfirm: (ids: string[]) => void }) => (
    <div data-testid="skills-modal">
      <button type="button" onClick={() => onConfirm(['skill-1', 'skill-2'])}>
        Confirm
      </button>
    </div>
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

const renderSelector = ({
  value = [] as string[],
  readonly = false,
  isSelectModalOpen = false,
  onChange = vi.fn(),
  onSelectModalOpenChange = vi.fn(),
} = {}) => {
  act(() => {
    root.render(
      <SkillsSelector
        value={value}
        onChange={onChange}
        readonly={readonly}
        isSelectModalOpen={isSelectModalOpen}
        onSelectModalOpenChange={onSelectModalOpenChange}
      />,
    );
  });
  return { onChange, onSelectModalOpenChange };
};

describe('SkillsSelector', () => {
  it('renders nothing when no skills are selected', () => {
    renderSelector();

    expect(container.querySelector('[data-testid="skill-chip"]')).toBeNull();
    expect(container.querySelector('.rounded.border')).toBeNull();
  });

  it('renders the chip panel when a skill is selected', () => {
    renderSelector({ value: ['skill-1'] });

    expect(container.querySelector('[data-testid="skill-chip"]')).toBeTruthy();
    expect(container.querySelector('.rounded.border')).toBeTruthy();
  });

  it('updates the form value when the last skill is removed', () => {
    const { onChange } = renderSelector({ value: ['skill-1'] });
    const removeButton = [...container.querySelectorAll('button')].find(
      (button) => button.textContent === 'Remove',
    );

    act(() => removeButton?.click());

    expect(onChange).toHaveBeenCalledWith([]);
  });

  it('hides chip removal and the modal in read-only mode', () => {
    renderSelector({ value: ['skill-1'], readonly: true, isSelectModalOpen: true });

    expect(container.textContent).not.toContain('Remove');
    expect(container.querySelector('[data-testid="skills-modal"]')).toBeNull();
  });

  it('applies the selection and closes the modal on confirm', () => {
    const { onChange, onSelectModalOpenChange } = renderSelector({ isSelectModalOpen: true });
    const confirmButton = [...container.querySelectorAll('button')].find(
      (button) => button.textContent === 'Confirm',
    );

    act(() => confirmButton?.click());

    expect(onChange).toHaveBeenCalledWith(['skill-1', 'skill-2']);
    expect(onSelectModalOpenChange).toHaveBeenCalledWith(false);
  });
});
