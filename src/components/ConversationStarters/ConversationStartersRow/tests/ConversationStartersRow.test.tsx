import React, { act } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { click, getButton } from '@/test-utils/dom';
import { setupTestRoot } from '@/test-utils/test-root';

import { ApplicationEditorI18nKeys, ButtonsI18nKeys } from '@/constants/translation-keys';
import type { ConversationStartersValues } from '@/types/conversation-starters';

import ConversationStartersRow from '../ConversationStartersRow';

interface MockModalProps {
  values: ConversationStartersValues;
  onSave: (values: ConversationStartersValues) => void;
  onClose: () => void;
}

vi.mock(
  '@/components/ConversationStarters/ConversationStartersModal/ConversationStartersModal',
  () => ({
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
  }),
);

const blankStarter = { id: 'blank', title: '', text: '' };

const createValues = (starters = [blankStarter]): ConversationStartersValues => ({
  starters,
  autoSubmit: true,
  chatMessageInputDisabled: false,
});

const dom = setupTestRoot();

const renderRow = (props: Partial<React.ComponentProps<typeof ConversationStartersRow>> = {}) => {
  const onSave = vi.fn();
  dom.render(
    <ConversationStartersRow
      values={createValues()}
      isReadonly={false}
      onSave={onSave}
      {...props}
    />,
  );
  return { onSave };
};

const getActionButton = () =>
  [...dom.container.querySelectorAll('button')].find((button) =>
    [ButtonsI18nKeys.Add, ButtonsI18nKeys.Manage].includes(button.textContent as ButtonsI18nKeys),
  ) as HTMLButtonElement;

const getModal = () => dom.container.querySelector('[role="dialog"][aria-label="Starters modal"]');

describe('ConversationStartersRow', () => {
  it('shows the description and an Add action when there are no starters', () => {
    renderRow();

    expect(dom.container.querySelector('h3')?.textContent).toBe(
      ApplicationEditorI18nKeys.StartersTitle,
    );
    expect(dom.container.textContent).toContain(ApplicationEditorI18nKeys.StartersDescription);
    expect(getActionButton().textContent).toBe(ButtonsI18nKeys.Add);
    expect(dom.container.querySelector('ul')).toBeNull();
  });

  it('lists saved starters in order with a Manage action and no description', () => {
    renderRow({
      values: createValues([
        { id: 'a', title: 'Visual hierarchy', text: 'Analyze visual hierarchy on the page:' },
        { id: 'b', title: '', text: 'Prompt only' },
        blankStarter,
      ]),
    });

    const items = [...dom.container.querySelectorAll('li')];
    expect(items).toHaveLength(2);
    expect(items[0].textContent).toBe('Visual hierarchyAnalyze visual hierarchy on the page:');
    expect(items[1].textContent).toBe('Prompt only');
    expect(getActionButton().textContent).toBe(ButtonsI18nKeys.Manage);
    expect(dom.container.textContent).not.toContain(ApplicationEditorI18nKeys.StartersDescription);
  });

  it('mirrors the starter message icon for right-to-left locales', () => {
    renderRow({ values: createValues([{ id: 'a', title: 'A', text: 'a' }, blankStarter]) });

    expect(dom.container.querySelector('li svg')?.getAttribute('class')).toContain(
      'rtl:scale-x-[-1]',
    );
  });

  it('opens the modal from the action and closes it again', () => {
    renderRow();

    expect(getModal()).toBeNull();
    act(() => getActionButton().click());
    expect(getModal()).toBeTruthy();

    click(getButton('Modal close'));
    expect(getModal()).toBeNull();
  });

  it('forwards the modal save', () => {
    const values = createValues();
    const { onSave } = renderRow({ values });

    act(() => getActionButton().click());
    click(getButton('Modal save'));

    expect(onSave).toHaveBeenCalledWith(values);
  });

  it('disables the action and keeps the list visible when read-only', () => {
    renderRow({
      isReadonly: true,
      tooltip: ApplicationEditorI18nKeys.CannotChangeSharedApp,
      values: createValues([{ id: 'a', title: 'A', text: 'a' }, blankStarter]),
    });

    const button = getActionButton();
    expect(button.disabled || button.getAttribute('aria-disabled') === 'true').toBe(true);
    act(() => button.click());

    expect(getModal()).toBeNull();
    expect(dom.container.querySelectorAll('li')).toHaveLength(1);
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

    const removeSelector = `button[aria-label="${ApplicationEditorI18nKeys.StartersRemove}"]`;

    // Every remove button shares one label key, so find it by the row showing the starter.
    const getRemoveButton = (name: string) =>
      [...dom.container.querySelectorAll('li')]
        .find((item) =>
          [...item.querySelectorAll('span')].some((span) => span.textContent === name),
        )
        ?.querySelector<HTMLButtonElement>(removeSelector) ?? null;

    it('gives each starter, titled or prompt-only, a remove button that shows on hover or focus', () => {
      renderRow({ values: createValues(starters) });

      const remove = getRemoveButton('B');
      expect(remove).not.toBeNull();
      expect(remove?.className).toContain('opacity-0');
      expect(remove?.className).toContain('group-hover:opacity-100');
      expect(remove?.className).toContain('group-focus-within:opacity-100');
      expect(getRemoveButton('Summarize this page')).not.toBeNull();
      expect(dom.container.querySelectorAll(removeSelector)).toHaveLength(3);
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
      dom.render(<StatefulRow onSave={onSave} />);

      act(() => getRemoveButton('B')?.click());

      expect(dom.container.querySelectorAll('li')).toHaveLength(2);
      expect(document.activeElement).toBe(getRemoveButton('A'));
    });

    it('returns the row to its empty state when the last starter is removed', () => {
      const onSave = vi.fn();
      dom.render(<StatefulRow onSave={onSave} />);

      act(() => getRemoveButton('A')?.click());
      act(() => getRemoveButton('B')?.click());
      act(() => getRemoveButton('Summarize this page')?.click());

      expect(dom.container.querySelector('ul')).toBeNull();
      expect(getActionButton().textContent).toBe(ButtonsI18nKeys.Add);
    });

    it('renders no remove buttons when read-only', () => {
      renderRow({ isReadonly: true, values: createValues(starters) });

      expect(dom.container.querySelector(removeSelector)).toBeNull();
    });
  });
});
