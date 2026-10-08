import { act, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { useController, type Control } from 'react-hook-form';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { getQuickApp2FormData, type QuickApp2Form } from '@/form/quickApp2Form';
import type { QuickApp2FormValues } from '@/types/quick-app-form';

vi.mock('@/components/ContextAndTools/ContextAndToolsSection', () => {
  const ContextAndToolsTestSection = ({ control }: { control: Control<QuickApp2Form> }) => {
    const { field } = useController({ control, name: 'documentRelativeUrl' });

    return (
      <div>
        <button
          type="button"
          data-testid="change-document"
          onClick={() => field.onChange(['changed-document'])}
        />
        <output data-testid="document-value">{field.value.join('|')}</output>
      </div>
    );
  };

  return { default: ContextAndToolsTestSection };
});

import QuickApp2FormLegacyFields from '../QuickApp2FormLegacyFields';

const initialValues = getQuickApp2FormData(undefined, ['model-1'], ['model-1'], 'model-1');

const Harness = () => {
  const [values, setValues] = useState<QuickApp2FormValues>(initialValues);

  return (
    <>
      <button
        type="button"
        data-testid="external-document"
        onClick={() => setValues((current) => ({ ...current, documentRelativeUrl: ['external'] }))}
      />
      <QuickApp2FormLegacyFields
        values={values}
        isReadonly={false}
        isCodeInterpreterEnabled={false}
        isWebFetchEnabled={false}
        isAddAttachmentEnabled={false}
        onValuesChange={(changedValues) =>
          setValues((current) => ({ ...current, ...changedValues }))
        }
      />
    </>
  );
};

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

describe('QuickApp2FormLegacyFields', () => {
  it('bridges legacy RHF fields into the custom form state and back', async () => {
    act(() => root.render(<Harness />));

    expect(container.querySelector('[data-testid="document-value"]')?.textContent).toBe('');

    await act(async () => {
      container
        .querySelector('[data-testid="change-document"]')
        ?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });
    expect(container.querySelector('[data-testid="document-value"]')?.textContent).toBe(
      'changed-document',
    );

    act(() => {
      container
        .querySelector('[data-testid="external-document"]')
        ?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    expect(container.querySelector('[data-testid="document-value"]')?.textContent).toBe('external');
  });
});
