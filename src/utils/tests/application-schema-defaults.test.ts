import { describe, expect, it } from 'vitest';

import { getApplicationSchemaDefaults } from '../application-schema-defaults';

// The shapes of the QuickApps application type schema: a default beside `$ref`, defaults inside a
// definition, and an optional object declared as `anyOf` with a `null` branch.
const createSchema = (overrides: Record<string, unknown> = {}) => ({
  $defs: {
    DialDeploymentConfig: {
      properties: {
        deployment_id: { type: 'string' },
        parameters: { $ref: '#/$defs/DialDeploymentParameters' },
      },
      type: 'object',
    },
    DialDeploymentParameters: {
      properties: {
        temperature: { anyOf: [{ type: 'number' }, { type: 'null' }], default: 0.2 },
      },
    },
    ConversationStartersConfig: {
      properties: {
        intro_text: { anyOf: [{ type: 'string' }, { type: 'null' }], default: 'Select an action' },
        chat_message_input_disabled: { default: false, type: 'boolean' },
        auto_submit: { default: true, type: 'boolean' },
      },
    },
    RepresentationToolingConfig: { properties: { add_attachment: { default: true } } },
    WebFetchConfig: { properties: { enabled: { default: false, type: 'boolean' } } },
    Features: {
      properties: {
        representation_tooling: {
          anyOf: [{ $ref: '#/$defs/RepresentationToolingConfig' }, { type: 'null' }],
          default: null,
        },
        web_fetch: {
          anyOf: [{ $ref: '#/$defs/WebFetchConfig' }, { type: 'null' }],
          default: null,
        },
      },
    },
  },
  properties: {
    orchestrator: {
      properties: {
        deployment: {
          $ref: '#/$defs/DialDeploymentConfig',
          default: { deployment_id: 'model-2' },
        },
      },
    },
    conversation_starters: {
      anyOf: [{ $ref: '#/$defs/ConversationStartersConfig' }, { type: 'null' }],
      default: null,
    },
    features: { anyOf: [{ $ref: '#/$defs/Features' }, { type: 'null' }], default: null },
  },
  ...overrides,
});

describe('getApplicationSchemaDefaults', () => {
  it('reads every default the form edits', () => {
    expect(getApplicationSchemaDefaults(createSchema())).toEqual({
      deploymentId: 'model-2',
      temperature: 0.2,
      conversationStarters: {
        introText: 'Select an action',
        autoSubmit: true,
        chatMessageInputDisabled: false,
      },
      addAttachment: true,
      webFetch: false,
    });
  });

  it('keeps the default that sits beside $ref', () => {
    expect(getApplicationSchemaDefaults(createSchema()).deploymentId).toBe('model-2');
  });

  it('lets the keywords beside a $ref override the referenced definition', () => {
    const schema = createSchema({
      properties: {
        features: {
          anyOf: [{ $ref: '#/$defs/Features' }, { type: 'null' }],
          properties: {
            web_fetch: { properties: { enabled: { default: true } } },
          },
        },
      },
    });

    expect(getApplicationSchemaDefaults(schema).webFetch).toBe(true);
  });

  it('follows a chain of references and decodes JSON Pointer escapes', () => {
    const schema = {
      $defs: {
        'a/b': { properties: { enabled: { default: true } } },
        Alias: { $ref: '#/$defs/a~1b' },
      },
      properties: {
        features: { properties: { web_fetch: { $ref: '#/$defs/Alias' } } },
      },
    };

    expect(getApplicationSchemaDefaults(schema)).toEqual({ webFetch: true });
  });

  it('returns nothing for a reference that is missing, remote or circular', () => {
    const schema = {
      $defs: { Loop: { $ref: '#/$defs/Loop' } },
      properties: {
        orchestrator: { properties: { deployment: { $ref: '#/$defs/Missing' } } },
        conversation_starters: { $ref: 'https://example.com/schema.json' },
        features: { $ref: '#/$defs/Loop' },
      },
    };

    expect(getApplicationSchemaDefaults(schema)).toEqual({});
  });

  it('keeps a node whose anyOf has several non-null branches as it is', () => {
    const schema = {
      properties: {
        features: {
          anyOf: [{ type: 'object' }, { type: 'string' }],
          properties: { web_fetch: { properties: { enabled: { default: true } } } },
        },
      },
    };

    expect(getApplicationSchemaDefaults(schema).webFetch).toBe(true);
  });

  it.each([
    ['null deployment default', { deployment: { default: null } }],
    ['empty deployment id', { deployment: { default: { deployment_id: '' } } }],
    ['non-string deployment id', { deployment: { default: { deployment_id: 5 } } }],
    ['no deployment default', { deployment: { $ref: '#/$defs/DialDeploymentConfig' } }],
  ])('ignores a %s', (_name, orchestratorProperties) => {
    const schema = {
      ...createSchema(),
      properties: { orchestrator: { properties: orchestratorProperties } },
    };

    expect(getApplicationSchemaDefaults(schema).deploymentId).toBeUndefined();
  });

  it.each([
    ['zero', 0, 0],
    ['one', 1, 1],
    ['null', null, undefined],
    ['above the range', 1.5, undefined],
    ['below the range', -0.1, undefined],
    ['a string', '0.5', undefined],
  ])('reads a temperature default of %s', (_name, value, expected) => {
    const schema = createSchema({
      $defs: {
        DialDeploymentConfig: {
          properties: { parameters: { $ref: '#/$defs/DialDeploymentParameters' } },
        },
        DialDeploymentParameters: { properties: { temperature: { default: value } } },
      },
    });

    expect(getApplicationSchemaDefaults(schema).temperature).toBe(expected);
  });

  it('ignores defaults of the wrong type', () => {
    const schema = createSchema({
      $defs: {
        ConversationStartersConfig: {
          properties: {
            intro_text: { default: 3 },
            auto_submit: { default: 'yes' },
          },
        },
        WebFetchConfig: { properties: { enabled: { default: 'no' } } },
        RepresentationToolingConfig: { properties: { add_attachment: { default: null } } },
        Features: {
          properties: {
            representation_tooling: { $ref: '#/$defs/RepresentationToolingConfig' },
            web_fetch: { $ref: '#/$defs/WebFetchConfig' },
          },
        },
      },
    });

    expect(getApplicationSchemaDefaults(schema)).toEqual({ deploymentId: 'model-2' });
  });

  it.each([
    ['a string', 'schema'],
    ['undefined', undefined],
    ['null', null],
    ['a schema without properties', {}],
  ])('returns nothing for %s', (_name, schema) => {
    expect(getApplicationSchemaDefaults(schema)).toEqual({});
  });
});
