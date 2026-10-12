import { act } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { click, getButton } from '@/test-utils/dom';
import { setupTestRoot } from '@/test-utils/test-root';
import { DialEntityType } from '@/types/dial-entities';
import type { DialModel } from '@/types/dial-entities';

import { DefaultModelBlock } from '../DefaultModelBlock';

let models: DialModel[] = [];
let status: 'idle' | 'loading' | 'ready' | 'error' = 'ready';

vi.mock('@/hooks/use-translation', () => import('@/test-utils/mock-translation'));
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

const dom = setupTestRoot();

const render = (props: Partial<Parameters<typeof DefaultModelBlock>[0]> = {}) =>
  dom.render(<DefaultModelBlock value={gemini.id} onChange={vi.fn()} {...props} />);

const getPicker = () => dom.container.querySelector('[role="dialog"]');

const getChangeButton = () => getButton('Change');

// The picker is lazy-loaded; let the import settle before asserting on it.
const openPicker = () => act(async () => getChangeButton()?.click());

const hasElementWithText = (text: string) =>
  [...dom.container.querySelectorAll('span, div')].some((el) => el.textContent === text);

const getSectionName = () => {
  const labelledBy = dom.container.querySelector('section')?.getAttribute('aria-labelledby');
  return labelledBy ? document.getElementById(labelledBy)?.textContent : undefined;
};

beforeEach(() => {
  models = [gemini];
  status = 'ready';
});

describe('DefaultModelBlock', () => {
  it('is a "Default model" section with the Change button in it', () => {
    render();

    expect(getSectionName()).toBe('Default model');
    expect(getChangeButton()?.closest('section')).toBe(dom.container.querySelector('section'));
  });

  it('shows the type label, the name as a level-4 heading and the version as text', () => {
    render();

    expect(hasElementWithText('Model')).toBe(true);
    expect(dom.container.querySelector('h4')?.textContent).toBe('Google Gemini 3.5 Flash Lite');
    expect(dom.container.textContent).toContain('1.0.3');
    expect(dom.container.querySelector('[role="combobox"]')).toBeNull();
    expect(dom.container.textContent).not.toContain('Featured');
  });

  it('shows only the selected version when the model has several', () => {
    models = [gemini, { ...gemini, id: 'models/gemini__2.0.0', version: '2.0.0' }];
    render();

    expect(dom.container.textContent).toContain('1.0.3');
    expect(dom.container.textContent).not.toContain('2.0.0');
    expect(dom.container.querySelector('[role="combobox"]')).toBeNull();
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

    click(getButton('Confirm picker'));

    expect(onChange).toHaveBeenCalledWith('models/gpt__2.0.0');
    expect(getPicker()).toBeNull();
  });

  it('keeps the model when the picker is closed without confirming', async () => {
    const onChange = vi.fn();
    render({ onChange });
    await openPicker();

    click(getButton('Close picker'));

    expect(onChange).not.toHaveBeenCalled();
    expect(getPicker()).toBeNull();
  });

  it('disables Change when the field is disabled', () => {
    render({ isDisabled: true });

    expect(getChangeButton()?.disabled).toBe(true);
    click(getChangeButton());
    expect(getPicker()).toBeNull();
  });

  it('disables Change and hides the name while models are loading', () => {
    models = [];
    status = 'loading';
    render();

    expect(getChangeButton()?.disabled).toBe(true);
    expect(dom.container.querySelector('h4')).toBeNull();
  });

  it('shows the validation error below the card', () => {
    render({ error: 'Selected model does not support tools' });

    expect(dom.container.textContent).toContain('Selected model does not support tools');
  });

  it('shows an unknown id as the name, without a type label', () => {
    render({ value: 'models/removed-model' });

    expect(dom.container.textContent).toContain('models/removed-model');
    expect(dom.container.querySelector('h4')).toBeNull();
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

    expect(dom.container.querySelector('h4')?.textContent).toBe('Some agent');
    expect(hasElementWithText('Model')).toBe(true);
  });
});
