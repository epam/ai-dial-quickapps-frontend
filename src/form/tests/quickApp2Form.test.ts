import { describe, expect, it } from 'vitest';

import { ToolsetTypes } from '@/constants/quick-apps';
import {
  AgentOrToolsetSchemaKeys,
  QuickApp2Schema,
  getAgentsAndToolsetsFormValue,
  getQuickApp2FormData,
  getQuickApp2Toolsets,
  type QuickApp2Form,
} from '@/form/quickApp2Form';
import type { AnyToolset } from '@/types/quick-apps';

const createForm = (overrides: Partial<QuickApp2Form> = {}): QuickApp2Form => ({
  instructions: '',
  temperature: 1,
  documentRelativeUrl: [],
  model: 'model-1',
  agentsAndToolsets: [],
  codeInterpreter: false,
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

describe('QuickApp2Schema', () => {
  it('accepts a complete default form', () => {
    const result = QuickApp2Schema.safeParse(createForm());

    expect(result.success).toBe(true);
  });

  it('rejects a model that is not available', () => {
    const result = QuickApp2Schema.safeParse(
      createForm({ model: 'missing-model', availableModelIds: ['model-1'] }),
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            path: ['model'],
            message: 'Not available agent selected. Please, change the agent to proceed',
          }),
        ]),
      );
    }
  });

  it('rejects a model without tool support', () => {
    const result = QuickApp2Schema.safeParse(
      createForm({ model: 'model-2', availableModelIds: ['model-1', 'model-2'] }),
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            path: ['model'],
            message: 'Selected model does not support tools',
          }),
        ]),
      );
    }
  });

  it('accepts an empty attachment count as an optional value', () => {
    const result = QuickApp2Schema.safeParse(
      createForm({ maxInputAttachments: '' as unknown as number }),
    );

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.maxInputAttachments).toBeUndefined();
    }
  });

  it('coerces a positive attachment count and rejects non-positive counts', () => {
    const validResult = QuickApp2Schema.safeParse(
      createForm({ maxInputAttachments: '3' as unknown as number }),
    );
    const invalidResult = QuickApp2Schema.safeParse(
      createForm({ maxInputAttachments: 0 }),
    );

    expect(validResult.success).toBe(true);
    if (validResult.success) {
      expect(validResult.data.maxInputAttachments).toBe(3);
    }
    expect(invalidResult.success).toBe(false);
  });
});

describe('getQuickApp2FormData', () => {
  it('creates a valid empty-app form with a trailing blank starter', () => {
    const data = getQuickApp2FormData(undefined, ['model-1'], ['model-1'], 'model-1');

    expect(data).toMatchObject({
      model: 'model-1',
      instructions: '',
      temperature: 1,
      documentRelativeUrl: [],
      agentsAndToolsets: [],
      autoSubmit: true,
      timestamp: true,
      processLargeFiles: false,
      fileTools: false,
      addAttachment: false,
      webFetch: false,
    });
    expect(data.starters).toHaveLength(1);
    expect(data.starters[0]).toMatchObject({ title: '', text: '' });
    expect(data.starters[0].id).toEqual(expect.any(String));
    expect(QuickApp2Schema.safeParse(data).success).toBe(true);
  });

  it('preserves toolset metadata when converting configured toolsets to form values', () => {
    const toolsets: AnyToolset[] = [
      {
        type: ToolsetTypes.DialApp,
        name: 'Weather',
        deployment_id: 'applications/weather',
      },
    ];

    const values = getAgentsAndToolsetsFormValue(toolsets);

    expect(values).toHaveLength(1);
    expect(values[0]).toMatchObject({
      [AgentOrToolsetSchemaKeys.id]: 'applications/weather',
      [AgentOrToolsetSchemaKeys.tool]: toolsets[0],
      [AgentOrToolsetSchemaKeys.isDialDeploymentTool]: false,
    });
  });

  it('builds toolsets from the simple representation', () => {
    const toolset = {
      type: ToolsetTypes.DialApp,
      name: 'Weather',
      deployment_id: 'applications/weather',
    } as AnyToolset;
    const formValue = getAgentsAndToolsetsFormValue([toolset]);
    const simpleToolsets = getQuickApp2Toolsets({
      allEntitiesMap: {},
      data: createForm({ agentsAndToolsets: formValue }),
      language: 'en',
    });
    expect(simpleToolsets).toEqual(
      expect.arrayContaining([
        expect.objectContaining(toolset),
        expect.objectContaining({ type: ToolsetTypes.DialDeployment }),
      ]),
    );
  });

  it('preserves attachment values from the app when building defaults', () => {
    const data = getQuickApp2FormData(
      {
        applicationProperties: {},
        inputAttachmentTypes: ['image/png'],
        maxInputAttachments: 4,
      },
      ['model-1'],
      ['model-1'],
      'model-1',
    );

    expect(data.inputAttachmentTypes).toEqual(['image/png']);
    expect(data.maxInputAttachments).toBe(4);
  });
});
