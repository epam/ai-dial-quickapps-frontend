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
  useTranslation: () => ({
    language: 'en',
    t: (key: string, options?: Record<string, string>) =>
      key.replace(/\{\{(\w+)\}\}/g, (_, name: string) => options?.[name] ?? ''),
  }),
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

const renderRow = (props: Partial<React.ComponentProps<typeof ConversationStartersRow>> = {}) => {
  const onSave = vi.fn();
  act(() =>
    root.render(
      <ConversationStartersRow
        values={createValues()}
        isReadonly={false}
        onSave={onSave}
        {...props}
      />,
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

    expect(container.querySelector('h3')?.textContent).toBe(
      QuickAppEditorI18nKeys.ConversationStarters,
    );
    expect(container.textContent).toContain(
      QuickAppEditorI18nKeys.ConversationStartersAddOnDescription,
    );
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
    expect(container.textContent).not.toContain(
      QuickAppEditorI18nKeys.ConversationStartersAddOnDescription,
    );
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

  describe('removing a starter from the row', () => {
    const starters = [
      { id: 'a', title: 'A', text: 'prompt a' },
      { id: 'b', title: 'B', text: 'prompt b' },
      { id: 'c', title: '', text: 'Summarize this page' },
      blankStarter,
    ];

    const StatefulRow = ({ onSave }: { onSave: (values: ConversationStartersValues) => void }) => {
      const [values, setValues] = React.useState(createValues(starters));
      return (
        <ConversationStartersRow
          values={values}
          isReadonly={false}
          onSave={(next) => {
            onSave(next);
            setValues(next);
          }}
        />
      );
    };

    const getRemoveButton = (name: string) =>
      container.querySelector<HTMLButtonElement>(`button[aria-label="Remove starter ${name}"]`);

    it('gives each starter a remove button that shows on hover or focus, named by its title or prompt', () => {
      renderRow({ values: createValues(starters) });

      const remove = getRemoveButton('B');
      expect(remove).not.toBeNull();
      expect(remove?.className).toContain('opacity-0');
      expect(remove?.className).toContain('group-hover:opacity-100');
      expect(remove?.className).toContain('group-focus-within:opacity-100');
      expect(getRemoveButton('Summarize this page')).not.toBeNull();
    });

    it('removes the starter, keeps the settings, and does not open the modal', () => {
      const values = { ...createValues(starters), introText: 'Hi', chatMessageInputDisabled: true };
      const { onSave } = renderRow({ values });

      act(() => getRemoveButton('B')?.click());

      expect(onSave).toHaveBeenCalledWith({
        ...values,
        starters: [starters[0], starters[2], blankStarter],
      });
      expect(getModal()).toBeNull();
    });

    it('moves focus to the first remaining remove button', () => {
      const onSave = vi.fn();
      act(() => root.render(<StatefulRow onSave={onSave} />));

      act(() => getRemoveButton('B')?.click());

      expect(container.querySelectorAll('li')).toHaveLength(2);
      expect(document.activeElement).toBe(getRemoveButton('A'));
    });

    it('returns the row to its empty state when the last starter is removed', () => {
      const onSave = vi.fn();
      act(() => root.render(<StatefulRow onSave={onSave} />));

      act(() => getRemoveButton('A')?.click());
      act(() => getRemoveButton('B')?.click());
      act(() => getRemoveButton('Summarize this page')?.click());

      expect(container.querySelector('ul')).toBeNull();
      expect(getActionButton().textContent).toBe(CommonI18nKeys.Add);
    });

    it('renders no remove buttons when read-only', () => {
      renderRow({ isReadonly: true, values: createValues(starters) });

      expect(container.querySelector('button[aria-label^="Remove starter"]')).toBeNull();
    });
  });
});
