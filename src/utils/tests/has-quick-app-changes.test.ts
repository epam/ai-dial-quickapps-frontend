import { describe, expect, it } from 'vitest';

import type { QuickApp2Config } from '@/types/quick-apps';
import {
  hasQuickAppChanges,
  type StoredGeneralFields,
} from '@/utils/has-quick-app-changes';

const createConfig = (overrides: Record<string, unknown> = {}): QuickApp2Config =>
  ({ model: 'model', contexts: [], tool_sets: [], ...overrides }) as unknown as QuickApp2Config;

const createGeneral = (overrides: StoredGeneralFields = {}): StoredGeneralFields => ({
  name: 'Name',
  description: 'Description',
  iconUrl: 'icon.svg',
  topics: ['topic'],
  display_version: '1.0.0',
  ...overrides,
});

describe('hasQuickAppChanges', () => {
  it('returns false for identical configuration without general fields', () => {
    const config = createConfig();

    expect(hasQuickAppChanges(config, createConfig(), undefined, createGeneral())).toEqual({
      hasChanges: false,
    });
  });

  it('returns false when the existing configuration is absent but both configs are empty', () => {
    expect(hasQuickAppChanges(undefined, {} as unknown as QuickApp2Config, undefined, createGeneral())).toEqual({
      hasChanges: false,
    });
  });

  it('detects a configuration change', () => {
    expect(
      hasQuickAppChanges(createConfig(), createConfig({ model: 'different-model' }), undefined, createGeneral()),
    ).toEqual({ hasChanges: true });
  });

  it.each([
    ['name', { name: 'New name' }],
    ['description', { description: 'New description' }],
    ['icon URL', { iconUrl: 'new-icon.svg' }],
    ['topics', { topics: ['new-topic'] }],
    ['display version', { display_version: '2.0.0' }],
  ])('detects a changed general %s field', (_field, changedField) => {
    const general = createGeneral();

    expect(hasQuickAppChanges(createConfig(), createConfig(), { ...general, ...changedField }, general)).toEqual({
      hasChanges: true,
    });
  });
});
