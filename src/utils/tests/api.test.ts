import { describe, expect, it } from 'vitest';

import { isHiddenDialFolderId } from '@/utils/api';

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
