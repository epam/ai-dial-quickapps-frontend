import React, { act, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { useController, type Control } from 'react-hook-form';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { getQuickApp2FormData, type QuickApp2Form } from '@/form/quickApp2Form';
import type { QuickApp2FormValues } from '@/types/quick-app-form';

vi.mock('@/components/ContextAndTools/ContextAndToolsSection', () => {
  const ContextAndToolsTestSection = ({
    control,
    agentsAndToolsetsJson,
  }: {
    control: Control<QuickApp2Form>;
    agentsAndToolsetsJson: string;
  }) => {
    const { field } = useController({ control, name: 'documentRelativeUrl' });

    return (
      <div>
        <button
          type="button"
          data-testid="change-document"
          onClick={() => field.onChange(['changed-document'])}
        />
        <output data-testid="document-value">{field.value.join('|')}</output>
        <output data-testid="toolset-json">{agentsAndToolsetsJson}</output>
      </div>
    );
  };

  return { default: ContextAndToolsTestSection };
});

vi.mock('@/components/ConversationStarters/ConversationStartersSection', () => ({
  default: ({ autoSubmit }: { autoSubmit: boolean }) => (
    <output data-testid="auto-submit">{String(autoSubmit)}</output>
  ),
}));

vi.mock('@/components/UserAttachments/UserAttachmentsSection', () => ({
  default: ({
    errors,
    attachmentTypesResetKey,
  }: {
    errors: Record<string, { message?: string } | undefined>;
    attachmentTypesResetKey: number;
  }) => (
    <div>
      <output data-testid="attachment-error">{errors.inputAttachmentTypes?.message}</output>
      <output data-testid="attachment-reset-key">{attachmentTypesResetKey}</output>
    </div>
  ),
}));

import QuickApp2FormLegacyFields from '../QuickApp2FormLegacyFields';

const initialValues = getQuickApp2FormData(undefined, ['model-1'], ['model-1'], 'model-1');

const Harness = ({ errors = {} }: { errors?: Record<string, string | undefined> }) => {
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
        errors={errors}
        isReadonly={false}
        isCodeInterpreterEnabled={false}
        isWebFetchEnabled={false}
        isAddAttachmentEnabled={false}
        attachmentTypesResetKey={2}
        agentSkills={<output data-testid="agent-skills">skills</output>}
        startersSettingsTooltip="starter tooltip"
        onValuesChange={(changedValues) => setValues((current) => ({ ...current, ...changedValues }))}
        onAttachmentTypesChange={vi.fn()}
        onAgentsChange={vi.fn()}
        onJsonChange={vi.fn()}
        onSwitchToJsonView={vi.fn()}
        onSwitchToSimpleView={vi.fn()}
        onDiscardJson={vi.fn()}
        onConfigureAgent={vi.fn()}
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
    act(() => root.render(<Harness errors={{ inputAttachmentTypes: 'Invalid MIME type' }} />));

    expect(container.querySelector('[data-testid="document-value"]')?.textContent).toBe('');
    expect(container.querySelector('[data-testid="toolset-json"]')?.textContent).toBe('[]');
    expect(container.querySelector('[data-testid="agent-skills"]')?.textContent).toBe('skills');
    expect(container.querySelector('[data-testid="attachment-error"]')?.textContent).toBe(
      'Invalid MIME type',
    );
    expect(container.querySelector('[data-testid="attachment-reset-key"]')?.textContent).toBe('2');

    await act(async () => {
      container.querySelector('[data-testid="change-document"]')?.dispatchEvent(
        new MouseEvent('click', { bubbles: true }),
      );
      await Promise.resolve();
    });
    expect(container.querySelector('[data-testid="document-value"]')?.textContent).toBe(
      'changed-document',
    );

    act(() => {
      container.querySelector('[data-testid="external-document"]')?.dispatchEvent(
        new MouseEvent('click', { bubbles: true }),
      );
    });
    expect(container.querySelector('[data-testid="document-value"]')?.textContent).toBe('external');
  });
});
