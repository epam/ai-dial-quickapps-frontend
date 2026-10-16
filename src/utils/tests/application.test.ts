import { describe, expect, it } from 'vitest';

import { ApplicationEditorI18nKeys, ChatSettingsI18nKeys } from '@/constants/translation-keys';
import { getTemperatureScaleLabelKey } from '@/utils/application';

describe('getTemperatureScaleLabelKey', () => {
  it.each([0, 0.1, 0.3, 0.1 + 0.2])('labels %s as Cold', (value) => {
    expect(getTemperatureScaleLabelKey(value)).toBe(
      ApplicationEditorI18nKeys.AdvancedSettingsTemperatureCold,
    );
  });

  it.each([0.4, 0.5, 0.6])('labels %s as Neutral', (value) => {
    expect(getTemperatureScaleLabelKey(value)).toBe(ChatSettingsI18nKeys.TemperatureNeutral);
  });

  it.each([0.7, 0.9, 1])('labels %s as Hot', (value) => {
    expect(getTemperatureScaleLabelKey(value)).toBe(
      ApplicationEditorI18nKeys.AdvancedSettingsTemperatureHot,
    );
  });
});
