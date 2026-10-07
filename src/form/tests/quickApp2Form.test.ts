import { describe, expect, it } from 'vitest';

import { DialDeploymentToolsetToolTypes, ToolsetTypes } from '@/constants/quick-apps';
import { buildQuickApp2Config, getQuickApp2FormData } from '@/form/quickApp2Form';
import { AnyToolset, QuickApp2Config } from '@/types/quick-apps';

const MODEL_ID = 'gpt-4o';

const mcpToolset = {
  type: ToolsetTypes.DialMcp,
  deployment_id: 'toolsets/bucket/weather-mcp',
};

const dialAppToolset = {
  type: ToolsetTypes.DialApp,
  name: 'Research agent',
  deployment_id: 'applications/bucket/research-agent',
};

const deploymentToolset = {
  name: 'dial-deployment-tool-set',
  type: ToolsetTypes.DialDeployment,
  tools: [{ type: DialDeploymentToolsetToolTypes.DialDeploymentSimple, deployment_id: 'dall-e-3' }],
};

const inlineToolset = {
  name: 'inline-calculator',
  type: 'custom-inline',
  tools: [{ type: 'function', name: 'add' }],
};

const codeInterpreterToolset = {
  template_name: 'py_interpreter',
  type: ToolsetTypes.CodeInterpreter,
};

const createApp = (toolSets: AnyToolset[]) => ({
  applicationProperties: {
    orchestrator: {
      deployment: { deployment_id: MODEL_ID },
      system_prompt: { type: 'custom', variables: {}, content: 'Be helpful' },
    },
    contexts: [],
    tool_sets: toolSets,
    conversation_starters: null,
  } satisfies QuickApp2Config,
});

const loadAndSave = (toolSets: AnyToolset[], overrides: { codeInterpreter?: boolean } = {}) => {
  const data = {
    ...getQuickApp2FormData(createApp(toolSets), [MODEL_ID], [MODEL_ID]),
    ...overrides,
  };
  return buildQuickApp2Config({ data, allEntitiesMap: {}, language: 'en' }).tool_sets;
};

describe('Quick App tool_sets round-trip', () => {
  it('keeps MCP, DIAL app, DIAL deployment, inline toolsets and the code interpreter unchanged', () => {
    const toolSets = [
      mcpToolset,
      dialAppToolset,
      deploymentToolset,
      inlineToolset,
      codeInterpreterToolset,
    ] as AnyToolset[];

    expect(loadAndSave(toolSets)).toEqual(toolSets);
  });

  it('keeps an inline toolset without a deployment_id when it is the only toolset', () => {
    const savedToolSets = loadAndSave([inlineToolset] as AnyToolset[]);

    expect(savedToolSets).toContainEqual(inlineToolset);
  });

  it('adds the code interpreter toolset when the code interpreter is enabled', () => {
    const savedToolSets = loadAndSave([mcpToolset] as AnyToolset[], { codeInterpreter: true });

    expect(savedToolSets).toContainEqual(codeInterpreterToolset);
    expect(savedToolSets).toContainEqual(mcpToolset);
  });

  it('omits the code interpreter toolset when the code interpreter is disabled', () => {
    const savedToolSets = loadAndSave([mcpToolset, codeInterpreterToolset] as AnyToolset[], {
      codeInterpreter: false,
    });

    expect(savedToolSets).not.toContainEqual(codeInterpreterToolset);
    expect(savedToolSets).toContainEqual(mcpToolset);
  });
});
