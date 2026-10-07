import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  AgentOrToolsetSchemaKeys,
  QuickApp2Schema,
  type QuickApp2Form,
} from '@/form/quickApp2Form';
import {
  useQuickApp2Form,
  type UseQuickApp2FormResult,
} from '@/hooks/use-quick-app2-form';
import {
  QuickApp2ModelStatus,
  type QuickApp2FormValidationResult,
  type QuickApp2FormValues,
} from '@/types/quick-app-form';
import { DialAppTransportType } from '@/types/quick-apps';

const createValues = (overrides: Partial<QuickApp2FormValues> = {}): QuickApp2FormValues => ({
  instructions: '',
  temperature: 1,
  documentRelativeUrl: [],
  model: 'model-1',
  agentsAndToolsets: [],
  codeInterpreter: false,
  attachmentsEnabled: false,
  inputAttachmentTypes: [],
  maxInputAttachments: undefined,
  introText: undefined,
  chatMessageInputDisabled: false,
  autoSubmit: true,
  starters: [{ id: 'starter-1', title: '', text: '' }],
  toolSupportingModelIds: ['model-1'],
  availableModelIds: ['model-1'],
  agentSkills: [],
  timestamp: true,
  processLargeFiles: false,
  fileTools: false,
  addAttachment: false,
  webFetch: false,
  ...overrides,
});

let root: Root;
let container: HTMLDivElement;
let latestForm: UseQuickApp2FormResult;

const HookHarness = ({ defaultValues }: { defaultValues: QuickApp2FormValues }) => {
  latestForm = useQuickApp2Form({ defaultValues });
  return null;
};

const renderHook = (defaultValues: QuickApp2FormValues = createValues()) => {
  act(() => {
    root.render(<HookHarness defaultValues={defaultValues} />);
  });
  return latestForm;
};

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

describe('useQuickApp2Form values and validation', () => {
  it('tracks dirty state against the initial baseline and preserves raw values', () => {
    renderHook();

    expect(latestForm.isDirty).toBe(false);

    act(() => {
      latestForm.setField('instructions', 'Updated instructions');
      latestForm.setField('maxInputAttachments', '');
    });

    expect(latestForm.values.instructions).toBe('Updated instructions');
    expect(latestForm.values.maxInputAttachments).toBe('');
    expect(latestForm.isDirty).toBe(true);

    act(() => {
      latestForm.setField('instructions', '');
    });
    expect(latestForm.isDirty).toBe(true);

    act(() => {
      latestForm.setField('maxInputAttachments', undefined);
    });
    expect(latestForm.isDirty).toBe(false);
  });

  it('maps Zod errors to field and nested array paths and gates submit data', async () => {
    renderHook();
    act(() => {
      latestForm.setValues(
        {
          starters: [{ id: 'starter-1', title: 7 as unknown as string, text: '' }],
        },
        { shouldValidate: false },
      );
    });
    let nestedResult: QuickApp2FormValidationResult | undefined;
    await act(async () => {
      nestedResult = latestForm.submit();
      await Promise.resolve();
    });
    expect(nestedResult?.isValid).toBe(false);
    expect(latestForm.errors['starters[0].title']).toBeDefined();

    act(() => {
      latestForm.setValues({ starters: [{ id: 'starter-1', title: '', text: '' }] });
    });
    let validResult: QuickApp2FormValidationResult | undefined;
    await act(async () => {
      validResult = latestForm.submit();
      await Promise.resolve();
    });
    expect(validResult?.isValid).toBe(true);
  });

  it('returns parsed submit data while retaining empty numeric editing values', () => {
    renderHook(createValues({ maxInputAttachments: '' }));

    let result: QuickApp2FormValidationResult | undefined;
    act(() => {
      result = latestForm.submit();
    });

    expect(result?.isValid).toBe(true);
    if (result?.isValid) {
      expect(result.data.maxInputAttachments).toBeUndefined();
    }
    expect(latestForm.values.maxInputAttachments).toBe('');
    expect(QuickApp2Schema.safeParse(latestForm.values).success).toBe(true);
  });
});

describe('useQuickApp2Form external state', () => {
  it('resolves a model, clears disabled features, and reports readiness without becoming dirty', () => {
    renderHook(createValues({ model: '' }));

    act(() => {
      latestForm.syncExternalState({
        modelStatus: QuickApp2ModelStatus.Loading,
        toolSupportingModelIds: [],
        availableModelIds: [],
        isCodeInterpreterEnabled: false,
        isWebFetchEnabled: false,
        isAddAttachmentEnabled: false,
      });
    });
    expect(latestForm.isModelReady).toBe(false);

    act(() => {
      latestForm.syncExternalState({
        modelStatus: QuickApp2ModelStatus.Ready,
        toolSupportingModelIds: ['model-2'],
        availableModelIds: ['model-2'],
        defaultModelId: 'model-2',
        isCodeInterpreterEnabled: false,
        isWebFetchEnabled: false,
        isAddAttachmentEnabled: false,
        shouldValidate: true,
      });
    });

    expect(latestForm.values.model).toBe('model-2');
    expect(latestForm.values.toolSupportingModelIds).toEqual(['model-2']);
    expect(latestForm.values.availableModelIds).toEqual(['model-2']);
    expect(latestForm.values.codeInterpreter).toBe(false);
    expect(latestForm.values.webFetch).toBe(false);
    expect(latestForm.values.addAttachment).toBe(false);
    expect(latestForm.isModelReady).toBe(true);
    expect(latestForm.isDirty).toBe(false);
  });

  it('preserves an existing model when external model lists change', () => {
    renderHook(createValues({ model: 'saved-model' }));

    act(() => {
      latestForm.syncExternalState({
        modelStatus: QuickApp2ModelStatus.Ready,
        existingModelId: 'saved-model',
        toolSupportingModelIds: ['model-1'],
        availableModelIds: ['model-1'],
        defaultModelId: 'model-1',
        isCodeInterpreterEnabled: true,
        isWebFetchEnabled: true,
        isAddAttachmentEnabled: true,
      });
    });

    expect(latestForm.values.model).toBe('saved-model');
    expect(latestForm.values.availableModelIds).toEqual(['model-1']);
    expect(latestForm.values.toolSupportingModelIds).toEqual(['model-1']);
    expect(latestForm.isModelReady).toBe(true);

    act(() => {
      latestForm.syncExternalState({
        modelStatus: QuickApp2ModelStatus.Ready,
        isCodeInterpreterEnabled: true,
        isWebFetchEnabled: true,
        isAddAttachmentEnabled: true,
      });
    });

    expect(latestForm.values.availableModelIds).toEqual(['model-1']);
    expect(latestForm.values.toolSupportingModelIds).toEqual(['model-1']);
  });
});

describe('useQuickApp2Form semantic actions', () => {
  it('updates agent IDs while preserving metadata and applies transport configuration', () => {
    const existing = {
      [AgentOrToolsetSchemaKeys.id]: 'agent-1',
      [AgentOrToolsetSchemaKeys.tool]: { name: 'Agent 1' },
    };
    renderHook(createValues({ agentsAndToolsets: [existing] as QuickApp2Form['agentsAndToolsets'] }));

    act(() => {
      latestForm.setAgentIds(['agent-1', 'agent-2']);
      latestForm.configureAgent('agent-1', DialAppTransportType.MCP);
    });

    expect(latestForm.values.agentsAndToolsets).toHaveLength(2);
    expect(latestForm.values.agentsAndToolsets[0]).toMatchObject({
      [AgentOrToolsetSchemaKeys.id]: 'agent-1',
      [AgentOrToolsetSchemaKeys.tool]: { name: 'Agent 1', transport: DialAppTransportType.MCP },
    });
    expect(latestForm.values.agentsAndToolsets[1]).toEqual({
      [AgentOrToolsetSchemaKeys.id]: 'agent-2',
    });
  });

  it('preserves starter identity and trailing blank-row behavior', () => {
    renderHook();
    const initialId = latestForm.values.starters[0].id;

    act(() => {
      latestForm.updateStarter(0, 'title', 'Welcome');
    });

    expect(latestForm.values.starters).toHaveLength(2);
    expect(latestForm.values.starters[0]).toMatchObject({ id: initialId, title: 'Welcome' });
    expect(latestForm.values.starters[1]).toMatchObject({ title: '', text: '' });

    act(() => {
      latestForm.removeStarter(0);
    });
    expect(latestForm.values.starters).toHaveLength(1);
    expect(latestForm.values.starters[0].id).not.toBe(initialId);
  });

  it('deduplicates decoded files and supports removal', () => {
    renderHook(createValues({ documentRelativeUrl: ['existing'] }));

    act(() => {
      latestForm.addDocuments(['existing', 'new%20file']);
    });
    expect(latestForm.values.documentRelativeUrl).toEqual(['existing', 'new file']);

    act(() => {
      latestForm.removeDocument('existing');
    });
    expect(latestForm.values.documentRelativeUrl).toEqual(['new file']);
  });

});
