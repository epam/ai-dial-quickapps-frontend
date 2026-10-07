import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ConversationStartersList } from '../ConversationStartersField';

vi.mock('@/hooks/useTranslation', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock('@epam/ai-dial-ui-kit', () => ({
  Input: ({
    value,
    onChange,
    disabled,
  }: {
    value: string;
    onChange: (value: string) => void;
    disabled?: boolean;
  }) => (
    <input
      data-testid="starter-input"
      value={value}
      disabled={disabled}
      onChange={(event) => onChange(event.target.value)}
    />
  ),
  DialGhostIconButton: ({ onClick, disabled }: { onClick: () => void; disabled?: boolean }) => (
    <button type="button" data-testid="remove-starter" onClick={onClick} disabled={disabled} />
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

describe('ConversationStartersList', () => {
  it('appends a blank row when the last starter becomes non-empty', () => {
    const onChange = vi.fn();
    const initialValue = [{ id: 'starter-1', title: '', text: '' }];

    act(() => {
      root.render(<ConversationStartersList value={initialValue} onChange={onChange} />);
    });

    const titleInput = container.querySelector('[data-testid="starter-input"]') as HTMLInputElement;
    act(() => {
      titleInput.dispatchEvent(new Event('input', { bubbles: true }));
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set?.call(
        titleInput,
        'Travel',
      );
      titleInput.dispatchEvent(new Event('change', { bubbles: true }));
    });

    expect(onChange).toHaveBeenCalledTimes(1);
    const nextValue = onChange.mock.calls[0][0] as Array<{
      id: string;
      title: string;
      text: string;
    }>;
    expect(nextValue).toHaveLength(2);
    expect(nextValue[0]).toMatchObject({ id: 'starter-1', title: 'Travel', text: '' });
    expect(nextValue[1]).toMatchObject({ title: '', text: '' });
    expect(nextValue[1].id).not.toBe('starter-1');
  });

  it('removes non-last starters but keeps the trailing blank row', () => {
    const onChange = vi.fn();
    const initialValue = [
      { id: 'starter-1', title: 'First', text: 'First text' },
      { id: 'starter-2', title: '', text: '' },
    ];

    act(() => {
      root.render(<ConversationStartersList value={initialValue} onChange={onChange} />);
    });

    const removeButtons = container.querySelectorAll('[data-testid="remove-starter"]');
    expect(removeButtons).toHaveLength(2);
    expect((removeButtons[1] as HTMLButtonElement).disabled).toBe(true);

    act(() => {
      removeButtons[0].dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(onChange).toHaveBeenCalledWith([{ id: 'starter-2', title: '', text: '' }]);
  });

  it('calls blur only when focus leaves the starters container', () => {
    const onBlur = vi.fn();
    const value = [{ id: 'starter-1', title: '', text: '' }];

    act(() => {
      root.render(<ConversationStartersList value={value} onChange={vi.fn()} onBlur={onBlur} />);
    });

    const list = container.firstElementChild as HTMLDivElement;
    act(() => {
      list.dispatchEvent(new FocusEvent('focusout', { bubbles: true, relatedTarget: null }));
    });

    expect(onBlur).toHaveBeenCalledTimes(1);
  });
});
