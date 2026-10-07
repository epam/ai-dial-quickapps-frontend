import { act, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { DialModel } from '@/types/dial-entities';

import { ModelField } from '../ModelField';

let models: DialModel[] = [];
let status: 'idle' | 'loading' | 'ready' | 'error' = 'ready';

vi.mock('@/hooks/useTranslation', () => ({
  useTranslation: () => ({ language: 'en', t: (key: string) => key }),
}));
vi.mock('@/context/AppContext', () => ({
  useAppContext: () => ({ app: { id: 'applications/bucket/my-app__1.0.0' } }),
}));
vi.mock('@/context/DataContext', () => ({
  useDataContext: () => ({
    modelsWithFavorites: models,
    favoriteIds: new Set<string>(),
    status,
    error: null,
    refreshAll: vi.fn(),
  }),
}));
// Virtualisation renders nothing without layout in jsdom; list the entity keys instead.
vi.mock('@/components/common/VirtualCardGrid/VirtualCardGrid', () => ({
  VirtualCardGrid: <T,>({ items, getKey }: { items: T[]; getKey: (item: T) => string }) => (
    <ul aria-label="Model cards">
      {items.map((item) => (
        <li key={getKey(item)}>{getKey(item)}</li>
      ))}
    </ul>
  ),
}));
vi.mock('@epam/ai-dial-ui-kit', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@epam/ai-dial-ui-kit')>();
  return {
    ...actual,
    DialPopup: ({
      open,
      header,
      children,
    }: {
      open: boolean;
      header: ReactNode;
      children: ReactNode;
    }) =>
      open ? (
        <div role="dialog">
          <h2>{header}</h2>
          {children}
        </div>
      ) : null,
  };
});

const gemini: DialModel = {
  id: 'models/gemini__1.0.3',
  reference: 'gemini',
  name: 'Google Gemini 3.5 Flash Lite',
  type: 'model',
  version: '1.0.3',
  features: { tools: true },
};

let root: Root;
let container: HTMLDivElement;

const render = (props: Partial<Parameters<typeof ModelField>[0]> = {}) =>
  act(() => root.render(<ModelField value={gemini.id} onChange={vi.fn()} {...props} />));

const getChangeButton = () =>
  [...container.querySelectorAll('button')].find((button) => button.textContent === 'Change');

const hasElementWithText = (text: string) =>
  [...container.querySelectorAll('span, div')].some((el) => el.textContent === text);

const getSectionName = () => {
  const labelledBy = container.querySelector('section')?.getAttribute('aria-labelledby');
  return labelledBy ? document.getElementById(labelledBy)?.textContent : undefined;
};

beforeEach(() => {
  (globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;
  // The picker's search and tabs measure themselves; jsdom has no ResizeObserver.
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
  models = [gemini];
  status = 'ready';
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
});

describe('ModelField', () => {
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

  it('opens the model picker when Change is clicked', () => {
    render();
    expect(container.querySelector('[role="dialog"]')).toBeNull();

    act(() => getChangeButton()?.click());

    expect(container.querySelector('[role="dialog"] h2')?.textContent).toBe('Select model');
  });

  it('disables Change when the field is disabled', () => {
    render({ disabled: true });

    expect(getChangeButton()?.disabled).toBe(true);
    act(() => getChangeButton()?.click());
    expect(container.querySelector('[role="dialog"]')).toBeNull();
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

  it('offers only tool-supporting models in the picker, not applications', () => {
    models = [
      gemini,
      { ...gemini, id: 'models/no-tools__1.0.0', name: 'No tools', features: {} },
      {
        ...gemini,
        id: 'applications/bucket/some-agent__1.0.0',
        name: 'Some agent',
        type: 'application',
      },
    ];
    render();

    act(() => getChangeButton()?.click());

    const cards = [...container.querySelectorAll('[aria-label="Model cards"] li')].map(
      (item) => item.textContent,
    );
    expect(cards).toEqual(['models/gemini']);
  });

  it('still shows a saved application on the card', () => {
    models = [
      {
        ...gemini,
        id: 'applications/bucket/some-agent__1.0.0',
        name: 'Some agent',
        type: 'application',
      },
    ];
    render({ value: 'applications/bucket/some-agent__1.0.0' });

    expect(container.querySelector('h4')?.textContent).toBe('Some agent');
    expect(hasElementWithText('Model')).toBe(true);
  });
});
