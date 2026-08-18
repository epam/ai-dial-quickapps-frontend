import isEqual from 'lodash-es/isEqual';

import type { MaybeLocalizedText } from '@/types/dial-entities';
import { QuickApp2Config } from '@/types/quick-apps';

export interface StoredGeneralFields {
  name?: MaybeLocalizedText;
  description?: MaybeLocalizedText;
  iconUrl?: string;
  topics?: string[];
  intro?: string;
  display_version?: string;
}

type FieldDiff = Record<string, { before: unknown; after: unknown }>;

export interface HasQuickAppChangesResult {
  hasChanges: boolean;
}

/**
 * Whether this save actually changed any user-editable field — Settings-step
 * config or a forwarded General-step field — versus a no-op re-save that only
 * touches server-managed metadata like updatedAt.
 *
 * `general` must already be normalized (`name`/`description` recombined into
 * their final `LocalizedText` form via `buildLocalizedText`) — this only
 * diffs values, it doesn't know about the wire-level primary/locales split.
 */
export const hasQuickAppChanges = (
  existingConfig: QuickApp2Config | undefined,
  newConfig: QuickApp2Config,
  general: StoredGeneralFields | undefined,
  storedGeneral: StoredGeneralFields,
): HasQuickAppChangesResult => {
  const existingRecord = (existingConfig ?? {}) as unknown as Record<string, unknown>;
  const newRecord = newConfig as unknown as Record<string, unknown>;
  const keys = new Set([...Object.keys(existingRecord), ...Object.keys(newRecord)]);
  const configDiff: FieldDiff = {};
  keys.forEach((key) => {
    if (!isEqual(existingRecord[key], newRecord[key])) {
      configDiff[key] = { before: existingRecord[key], after: newRecord[key] };
    }
  });

  if (Object.keys(configDiff).length > 0) {
    return { hasChanges: true };
  }

  if (!general) return { hasChanges: false };

  const generalDiff: FieldDiff = {};
  if (!isEqual(general.name, storedGeneral.name)) {
    generalDiff.name = { before: storedGeneral.name, after: general.name };
  }
  if (!isEqual(general.description, storedGeneral.description)) {
    generalDiff.description = { before: storedGeneral.description, after: general.description };
  }
  if (general.iconUrl !== storedGeneral.iconUrl) {
    generalDiff.iconUrl = { before: storedGeneral.iconUrl, after: general.iconUrl };
  }
  if (general.intro !== storedGeneral.intro) {
    generalDiff.intro = { before: storedGeneral.intro, after: general.intro };
  }
  if (!isEqual(general.topics, storedGeneral.topics)) {
    generalDiff.topics = { before: storedGeneral.topics, after: general.topics };
  }
  if (general.display_version !== storedGeneral.display_version) {
    generalDiff.display_version = {
      before: storedGeneral.display_version,
      after: general.display_version,
    };
  }

  return { hasChanges: Object.keys(generalDiff).length > 0 };
};
