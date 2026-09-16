import { describe, expect, it } from 'vitest';

import { getEntityIdWithoutVersion, isHiddenDialFolderId } from '@/utils/api';

describe('isHiddenDialFolderId', () => {
  it('returns true for a toolset id pointing to the hidden .dial_folder', () => {
    expect(isHiddenDialFolderId('toolsets/bucket/.dial_folder')).toBe(true);
  });

  it('returns true for a nested hidden .dial_folder', () => {
    expect(isHiddenDialFolderId('toolsets/public/shn/new/.dial_folder')).toBe(true);
  });

  it('returns true when the id has a version suffix', () => {
    expect(isHiddenDialFolderId('toolsets/public/VB folder for Toolset/.dial_folder__')).toBe(
      true,
    );
  });

  it('returns false for a regular toolset id', () => {
    expect(isHiddenDialFolderId('toolsets/bucket/my-toolset')).toBe(false);
  });

  it('returns false for a regular toolset id with a version suffix', () => {
    expect(isHiddenDialFolderId('toolsets/public/folder/vbtoolset__1.0.0')).toBe(false);
  });

  it('returns false for undefined', () => {
    expect(isHiddenDialFolderId(undefined)).toBe(false);
  });
});

describe('getEntityIdWithoutVersion', () => {
  it('returns the id unchanged when it has no version suffix', () => {
    expect(getEntityIdWithoutVersion('toolsets/public/my-toolset')).toBe(
      'toolsets/public/my-toolset',
    );
  });

  it('strips the version suffix and keeps the full folder path', () => {
    expect(getEntityIdWithoutVersion('toolsets/public/folder1/folder2/my-toolset__1.0.0')).toBe(
      'toolsets/public/folder1/folder2/my-toolset',
    );
  });

  it('preserves a name that itself contains the separator', () => {
    expect(getEntityIdWithoutVersion('toolsets/public/a__b__1.0')).toBe('toolsets/public/a__b');
  });
});
