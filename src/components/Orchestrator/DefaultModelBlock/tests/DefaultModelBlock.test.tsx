import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { DialEntityType } from '@/types/dial-entities';
import type { DialModel } from '@/types/dial-entities';

import { DefaultModelBlock } from '../DefaultModelBlock';

let models: DialModel[] = [];
let status: 'idle' | 'loading' | 'ready' | 'error' = 'ready';

vi.mock('@/hooks/use-translation', () => ({
  useTranslation: () => ({ language: 'en', t: (key: string) => key }),
}));
vi.mock('@/context/DataContext', () => ({
  useDataContext: () => ({
    modelsMap: Object.fromEntries(models.map((model) => [model.id, model])),
    status,
  }),
}));
// The picker has its own tests; here it only has to open with the current
// value and report a confirmed id or a close.
vi.mock('@/components/Orchestrator/ModelCatalogModal/ModelCatalogModal', () => ({
  ModelCatalogModal: ({
    value,
    onConfirm,
    onClose,
  }: {
    value: string;
    onConfirm: (id: string) => void;
    onClose: () => void;
  }) => (
    <div role="dialog" aria-label="Model picker" data-value={value}>
      <button onClick={() => onConfirm('models/gpt__2.0.0')}>Confirm picker</button>
      <button onClick={onClose}>Close picker</button>
    </div>
  ),
}));

const gemini: DialModel = {
  id: 'models/gemini__1.0.3',
  reference: 'gemini',
  name: 'Google Gemini 3.5 Flash Lite',
  type: DialEntityType.Model,
  version: '1.0.3',
  features: { tools: true },
};

let root: Root;
let container: HTMLDivElement;

const render = (props: Partial<Parameters<typeof DefaultModelBlock>[0]> = {}) =>
  act(() => root.render(<DefaultModelBlock value={gemini.id} onChange={vi.fn()} {...props} />));

const getButton = (text: string) =>
  [...container.querySelectorAll('button')].find((button) => button.textContent === text);

const getPicker = () => container.querySelector('[role="dialog"]');

const getChangeButton = () => getButton('Change');

// The picker is lazy-loaded; let the import settle before asserting on it.
const openPicker = () => act(async () => getChangeButton()?.click());

const hasElementWithText = (text: string) =>
  [...container.querySelectorAll('span, div')].some((el) => el.textContent === text);

const getSectionName = () => {
  const labelledBy = container.querySelector('section')?.getAttribute('aria-labelledby');
  return labelledBy ? document.getElementById(labelledBy)?.textContent : undefined;
};

beforeEach(() => {
  (globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;
  models = [gemini];
  status = 'ready';
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

describe('DefaultModelBlock', () => {
  it('is a "Default model" section with the Change button in it', () => {
    render();

    expect(getSectionName()).toBe('Default model');
    expect(getChangeButton()?.closest('section')).toBe(container.querySelector('section'));
  });

  it('shows the type label, the name as a level-4 heading and the version as text', () => {
    render();

    expect(hasElementWithText('Model')).toBe(true);
    expect(container.querySelector('h4')?.textContent).toBe('Google Gemini 3.5 Flash Lite');
    expect(container.textContent).toContain('1.0.3');
    expect(container.querySelector('[role="combobox"]')).toBeNull();
    expect(container.textContent).not.toContain('Featured');
  });

  it('shows only the selected version when the model has several', () => {
    models = [gemini, { ...gemini, id: 'models/gemini__2.0.0', version: '2.0.0' }];
    render();

    expect(container.textContent).toContain('1.0.3');
    expect(container.textContent).not.toContain('2.0.0');
    expect(container.querySelector('[role="combobox"]')).toBeNull();
  });

  it('opens the model picker with the current value when Change is clicked', async () => {
    render();
    expect(getPicker()).toBeNull();

    await openPicker();

    expect(getPicker()?.getAttribute('data-value')).toBe(gemini.id);
  });

  it('sets the model confirmed in the picker and closes it', async () => {
    const onChange = vi.fn();
    render({ onChange });
    await openPicker();

    act(() => getButton('Confirm picker')?.click());

    expect(onChange).toHaveBeenCalledWith('models/gpt__2.0.0');
    expect(getPicker()).toBeNull();
  });

  it('keeps the model when the picker is closed without confirming', async () => {
    const onChange = vi.fn();
    render({ onChange });
    await openPicker();

    act(() => getButton('Close picker')?.click());

    expect(onChange).not.toHaveBeenCalled();
    expect(getPicker()).toBeNull();
  });

  it('disables Change when the field is disabled', () => {
    render({ isDisabled: true });

    expect(getChangeButton()?.disabled).toBe(true);
    act(() => getChangeButton()?.click());
    expect(getPicker()).toBeNull();
  });

  it('disables Change and hides the name while models are loading', () => {
    models = [];
    status = 'loading';
    render();

    expect(getChangeButton()?.disabled).toBe(true);
    expect(container.querySelector('h4')).toBeNull();
  });

  it('shows the validation error below the card', () => {
    render({ error: 'Selected model does not support tools' });

    expect(container.textContent).toContain('Selected model does not support tools');
  });

  it('shows an unknown id as the name, without a type label', () => {
    render({ value: 'models/removed-model' });

    expect(container.textContent).toContain('models/removed-model');
    expect(container.querySelector('h4')).toBeNull();
    expect(hasElementWithText('Model')).toBe(false);
  });

  it('still shows a saved application on the card', () => {
    models = [
      {
        ...gemini,
        id: 'applications/bucket/some-agent__1.0.0',
        name: 'Some agent',
        type: DialEntityType.Application,
      },
    ];
    render({ value: 'applications/bucket/some-agent__1.0.0' });

    expect(container.querySelector('h4')?.textContent).toBe('Some agent');
    expect(hasElementWithText('Model')).toBe(true);
  });
});
