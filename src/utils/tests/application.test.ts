import { describe, expect, it } from 'vitest';

import { EntityType } from '@epam/ai-dial-ui-kit';

import { QuickAppEditorI18nKeys } from '@/constants/i18n';
import { getModelEntityType, getModelTypeI18nKey } from '@/utils/application';

describe('getModelEntityType', () => {
  it('presents a model deployment as a model', () => {
    expect(getModelEntityType('model')).toBe(EntityType.Model);
  });

  it('presents an application deployment as an agent', () => {
    expect(getModelEntityType('application')).toBe(EntityType.Agent);
  });
});

describe('getModelTypeI18nKey', () => {
  it('labels a model deployment "Model"', () => {
    expect(getModelTypeI18nKey('model')).toBe(QuickAppEditorI18nKeys.Model);
  });

  it('labels an application deployment "Agent"', () => {
    expect(getModelTypeI18nKey('application')).toBe(QuickAppEditorI18nKeys.Agent);
  });
});
