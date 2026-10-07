import { describe, expect, it } from 'vitest';

import { QuickAppEditorI18nKeys } from '@/constants/i18n';
import { getTemperatureScaleLabelKey } from '@/utils/application';

describe('getTemperatureScaleLabelKey', () => {
  it.each([0, 0.1, 0.3, 0.1 + 0.2])('labels %s as Precise', (value) => {
    expect(getTemperatureScaleLabelKey(value)).toBe(QuickAppEditorI18nKeys.TemperaturePrecise);
  });

  it.each([0.4, 0.5, 0.6])('labels %s as Neutral', (value) => {
    expect(getTemperatureScaleLabelKey(value)).toBe(QuickAppEditorI18nKeys.TemperatureNeutral);
  });

  it.each([0.7, 0.9, 1])('labels %s as Creative', (value) => {
    expect(getTemperatureScaleLabelKey(value)).toBe(QuickAppEditorI18nKeys.TemperatureCreative);
  });
});
