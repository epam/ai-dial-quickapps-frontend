import get from 'lodash-es/get';
import { describe, expect, it } from 'vitest';

import { buildQuickApp2Config, getQuickApp2FormData } from '@/form/quickApp2Form';
import type { QuickApp2Config } from '@/types/quick-apps';

type EntitiesMap = Parameters<typeof buildQuickApp2Config>[0]['allEntitiesMap'];

const TEMPERATURE_MODEL = { id: 'model-1', features: { temperature: true } };
const PLAIN_MODEL = { id: 'model-1', features: {} };

const STORED_CONFIG = {
  tool_defaults: { timeout_seconds: 120 },
  hooks: [{ name: 'hook' }],
  starters: ['legacy'],
  orchestrator: {
    deployment: {
      deployment_id: 'model-1',
      name: 'Main',
      parameters: { temperature: 0.2, top_p: 1, seed: 7 },
    },
    system_prompt: { type: 'custom', variables: { team: 'support' }, content: 'Be brief' },
    max_iterations: 25,
    propagate_stages: false,
    tool_discovery: { enabled: true },
  },
  contexts: [
    { url: 'files/a.txt', type: 'file', note: 'keep' },
    { url: 'https://example.com', type: 'link' },
  ],
  tool_sets: [],
  conversation_starters: {
    intro_text: 'Hi',
    chat_message_input_disabled: false,
    auto_submit: true,
    starters: [{ title: 'T', text: 'X', tag: 'marketing' }],
    custom_group_key: 1,
  },
  skills: [
    { type: 'dial-skill', url: 'skills/a', pinned: true },
    { type: 'other-skill', ref: 'r' },
  ],
  features: {
    timestamp: { injection_strategy: 'tool_call' },
    dial_files: {},
    stage_display: { mode: 'full' },
  },
} as unknown as QuickApp2Config;

const load = (config: QuickApp2Config = STORED_CONFIG) =>
  getQuickApp2FormData({ applicationProperties: config }, ['model-1'], ['model-1'], 'model-1');

const compose = (
  data: ReturnType<typeof load>,
  model: Record<string, unknown> | undefined = TEMPERATURE_MODEL,
) =>
  buildQuickApp2Config({
    data,
    allEntitiesMap: (model ? { 'model-1': model } : {}) as unknown as EntitiesMap,
    language: 'en',
  });

describe('split and compose of the stored config', () => {
  it('keeps keys the form has no field for through load and save', () => {
    const saved = compose(load());
    const at = (path: string) => get(saved, path);

    expect(at('tool_defaults')).toEqual({ timeout_seconds: 120 });
    expect(at('hooks')).toEqual([{ name: 'hook' }]);
    expect(at('starters')).toEqual(['legacy']);
    expect(at('orchestrator.max_iterations')).toBe(25);
    expect(at('orchestrator.propagate_stages')).toBe(false);
    expect(at('orchestrator.tool_discovery')).toEqual({ enabled: true });
    expect(at('orchestrator.deployment.name')).toBe('Main');
    expect(at('orchestrator.system_prompt.variables')).toEqual({ team: 'support' });
    expect(at('features.stage_display')).toEqual({ mode: 'full' });
    expect(at('conversation_starters.custom_group_key')).toBe(1);
  });

  it('removes the form-owned leaves from the extra config', () => {
    const { extraConfig } = load();
    const at = (path: string) => get(extraConfig, path);

    expect(at('tool_sets')).toBeUndefined();
    expect(at('orchestrator.deployment.deployment_id')).toBeUndefined();
    expect(at('orchestrator.deployment.parameters')).toEqual({ top_p: 1, seed: 7 });
    expect(at('orchestrator.system_prompt.content')).toBeUndefined();
    expect(at('features')).toEqual({ stage_display: { mode: 'full' } });
    expect(at('conversation_starters')).toEqual({ custom_group_key: 1 });
  });

  it('keeps other deployment parameters next to the temperature', () => {
    const parameters = compose(load()).orchestrator.deployment.parameters;

    expect(parameters).toEqual({ temperature: 0.2, top_p: 1, seed: 7 });
  });

  it('removes only the temperature for a model that does not support it', () => {
    const parameters = compose(load(), PLAIN_MODEL).orchestrator.deployment.parameters;

    expect(parameters).toEqual({ top_p: 1, seed: 7 });
  });

  it('omits the parameters when nothing is left for a model without temperature', () => {
    const data = load({
      orchestrator: {
        deployment: { deployment_id: 'model-1', parameters: { temperature: 0.2 } },
      },
    } as unknown as QuickApp2Config);

    expect(compose(data, PLAIN_MODEL).orchestrator.deployment).not.toHaveProperty('parameters');
  });

  it('keeps the loaded parameters and the form temperature while the model is not loaded', () => {
    const parameters = compose(load(), undefined).orchestrator.deployment.parameters;

    expect(parameters).toEqual({ temperature: 0.2, top_p: 1, seed: 7 });
  });

  it('keeps extra keys of skills, contexts and starters and the entries it does not manage', () => {
    const saved = compose(load());

    expect(saved.skills).toEqual([
      { type: 'dial-skill', url: 'skills/a', pinned: true },
      { type: 'other-skill', ref: 'r' },
    ]);
    expect(saved.contexts).toEqual([
      { url: 'files/a.txt', type: 'file', note: 'keep' },
      { url: 'https://example.com', type: 'link' },
    ]);
    expect(saved.conversation_starters?.starters).toEqual([
      { title: 'T', text: 'X', tag: 'marketing' },
    ]);
  });

  it('shows only the files the form owns as knowledge-base documents', () => {
    expect(load().documentRelativeUrl).toEqual(['files/a.txt']);
  });

  it('lets the form values win over a conflicting extra', () => {
    const data = {
      ...load(),
      model: 'model-1',
      instructions: 'New',
      extraConfig: {
        orchestrator: {
          deployment: { deployment_id: 'stale' },
          system_prompt: { content: 'stale' },
        },
      },
    };
    const { orchestrator } = compose(data);

    expect(orchestrator.deployment.deployment_id).toBe('model-1');
    expect(orchestrator.system_prompt.content).toBe('New');
  });

  it('is stable after one load and save pass', () => {
    const once = compose(load());
    const twice = compose(load(once));

    expect(twice).toEqual(once);
  });

  it('drops a removed skill and keeps the entries the form does not manage', () => {
    const data = { ...load(), agentSkills: [] };

    expect(compose(data).skills).toEqual([{ type: 'other-skill', ref: 'r' }]);
  });
});
