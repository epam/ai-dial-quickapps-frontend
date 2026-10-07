import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { CommonI18nKeys, QuickAppEditorI18nKeys } from '@/constants/i18n';
import type { ConversationStartersValues } from '@/types/conversation-starters';

import ConversationStartersRow from '../ConversationStartersRow';

interface MockModalProps {
  values: ConversationStartersValues;
  onSave: (values: ConversationStartersValues) => void;
  onClose: () => void;
}

vi.mock('@/hooks/useTranslation', () => ({
  useTranslation: () => ({ language: 'en', t: (key: string) => key }),
}));
vi.mock('../ConversationStartersModal', () => ({
  default: ({ values, onSave, onClose }: MockModalProps) => (
    <div role="dialog" aria-label="Starters modal">
      <button type="button" onClick={() => onSave(values)}>
        Modal save
      </button>
      <button type="button" onClick={onClose}>
        Modal close
      </button>
    </div>
  ),
}));

const blankStarter = { id: 'blank', title: '', text: '' };

const createValues = (starters = [blankStarter]): ConversationStartersValues => ({
  starters,
  autoSubmit: true,
  chatMessageInputDisabled: false,
});

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

const renderRow = (
  props: Partial<React.ComponentProps<typeof ConversationStartersRow>> = {},
) => {
  const onSave = vi.fn();
  act(() =>
    root.render(
      <ConversationStartersRow values={createValues()} isReadonly={false} onSave={onSave} {...props} />,
    ),
  );
  return { onSave };
};

const getActionButton = () =>
  [...container.querySelectorAll('button')].find((button) =>
    [CommonI18nKeys.Add, QuickAppEditorI18nKeys.Manage].includes(
      button.textContent as CommonI18nKeys & QuickAppEditorI18nKeys,
    ),
  ) as HTMLButtonElement;

const getModal = () => container.querySelector('[role="dialog"][aria-label="Starters modal"]');

describe('ConversationStartersRow', () => {
  it('shows the description and an Add action when there are no starters', () => {
    renderRow();

    expect(container.querySelector('h3')?.textContent).toBe(QuickAppEditorI18nKeys.ConversationStarters);
    expect(container.textContent).toContain(QuickAppEditorI18nKeys.ConversationStartersAddOnDescription);
    expect(getActionButton().textContent).toBe(CommonI18nKeys.Add);
    expect(container.querySelector('ul')).toBeNull();
  });

  it('lists saved starters in order with a Manage action and no description', () => {
    renderRow({
      values: createValues([
        { id: 'a', title: 'Visual hierarchy', text: 'Analyze visual hierarchy on the page:' },
        { id: 'b', title: '', text: 'Prompt only' },
        blankStarter,
      ]),
    });

    const items = [...container.querySelectorAll('li')];
    expect(items).toHaveLength(2);
    expect(items[0].textContent).toBe('Visual hierarchyAnalyze visual hierarchy on the page:');
    expect(items[1].textContent).toBe('Prompt only');
    expect(getActionButton().textContent).toBe(QuickAppEditorI18nKeys.Manage);
    expect(container.textContent).not.toContain(QuickAppEditorI18nKeys.ConversationStartersAddOnDescription);
  });

  it('opens the modal from the action and closes it again', () => {
    renderRow();

    expect(getModal()).toBeNull();
    act(() => getActionButton().click());
    expect(getModal()).toBeTruthy();

    const closeButton = [...container.querySelectorAll('button')].find(
      (button) => button.textContent === 'Modal close',
    );
    act(() => closeButton?.click());
    expect(getModal()).toBeNull();
  });

  it('forwards the modal save', () => {
    const values = createValues();
    const { onSave } = renderRow({ values });

    act(() => getActionButton().click());
    const saveButton = [...container.querySelectorAll('button')].find(
      (button) => button.textContent === 'Modal save',
    );
    act(() => saveButton?.click());

    expect(onSave).toHaveBeenCalledWith(values);
  });

  it('disables the action and keeps the list visible when read-only', () => {
    renderRow({
      isReadonly: true,
      tooltip: QuickAppEditorI18nKeys.CannotChangeSharedApp,
      values: createValues([{ id: 'a', title: 'A', text: 'a' }, blankStarter]),
    });

    const button = getActionButton();
    expect(button.disabled || button.getAttribute('aria-disabled') === 'true').toBe(true);
    act(() => button.click());

    expect(getModal()).toBeNull();
    expect(container.querySelectorAll('li')).toHaveLength(1);
  });
});
