import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { SkillsSelector } from '../SkillsSelector';

vi.mock('@/hooks/useTranslation', () => ({
  useTranslation: () => ({ t: (key: string) => key, language: 'en' }),
}));
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
vi.mock('../SkillsModal', () => ({ SkillsModal: () => null }));
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

const renderSelector = (value: string[], onChange = vi.fn(), readonly = false) => {
  act(() => {
    root.render(<SkillsSelector value={value} onChange={onChange} readonly={readonly} />);
  });
  return onChange;
};

describe('SkillsSelector', () => {
  it('keeps Add visible and hides the empty content window', () => {
    renderSelector([]);

    expect(container.querySelector('button')).toBeTruthy();
    expect(container.querySelector('[data-testid="skill-chip"]')).toBeNull();
    expect(container.textContent).not.toContain('NoAgentSkillsAdded');
  });

  it('renders the existing chip panel when a skill is selected', () => {
    renderSelector(['skill-1']);

    expect(container.querySelector('[data-testid="skill-chip"]')).toBeTruthy();
    expect(container.querySelector('.rounded.border')).toBeTruthy();
  });

  it('updates the form value when the last skill is removed', () => {
    const onChange = renderSelector(['skill-1']);
    const removeButton = [...container.querySelectorAll('button')].find(
      (button) => button.textContent === 'Remove',
    );

    act(() => removeButton?.click());

    expect(onChange).toHaveBeenCalledWith([]);
  });

  it('disables Add and hides chip removal in read-only mode', () => {
    renderSelector(['skill-1'], vi.fn(), true);

    expect(container.querySelector('button')?.disabled).toBe(true);
    expect(container.textContent).not.toContain('Remove');
  });
});
