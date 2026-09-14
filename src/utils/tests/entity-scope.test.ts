import { describe, expect, it } from 'vitest';

import { ResourceScope } from '@/types/resource-scope';
import { getEntityScopeInfo } from '@/utils/entity-scope';

const USER_BUCKET = 'user-bucket-123';

describe('getEntityScopeInfo', () => {
  describe('bucketed roots (toolsets, applications)', () => {
    it('classifies a public-bucket entity at the bucket root as Organization', () => {
      expect(getEntityScopeInfo('toolsets/public/my-toolset', USER_BUCKET)).toEqual({
        scope: ResourceScope.Organization,
        folderPath: [],
      });
    });

    it('classifies a public-bucket entity in subfolders as Organization with the folder path', () => {
      expect(
        getEntityScopeInfo('toolsets/public/folder1/folder2/my-toolset__1.0.0', USER_BUCKET),
      ).toEqual({
        scope: ResourceScope.Organization,
        folderPath: ['folder1', 'folder2'],
      });
    });

    it('classifies a user-bucket toolset as Personal', () => {
      expect(getEntityScopeInfo('toolsets/user-bucket-123/my-toolset', USER_BUCKET)).toEqual({
        scope: ResourceScope.Personal,
        folderPath: [],
      });
    });

    it('classifies a user-bucket application in a subfolder as Personal', () => {
      expect(getEntityScopeInfo('applications/user-bucket-123/f/my-app__2.0', USER_BUCKET)).toEqual(
        {
          scope: ResourceScope.Personal,
          folderPath: ['f'],
        },
      );
    });

    it('classifies an entity in another bucket as Shared', () => {
      expect(getEntityScopeInfo('toolsets/other-bucket/my-toolset', USER_BUCKET)).toEqual({
        scope: ResourceScope.Shared,
        folderPath: [],
      });
    });

    it('returns undefined for a non-public bucket while the user bucket is unknown', () => {
      expect(getEntityScopeInfo('toolsets/user-bucket-123/my-toolset')).toBeUndefined();
    });

    it('classifies a public-bucket entity even without the user bucket', () => {
      expect(getEntityScopeInfo('toolsets/public/my-toolset')).toEqual({
        scope: ResourceScope.Organization,
        folderPath: [],
      });
    });

    it('decodes URL-encoded folder segments', () => {
      expect(getEntityScopeInfo('toolsets/public/my%20folder/my-toolset', USER_BUCKET)).toEqual({
        scope: ResourceScope.Organization,
        folderPath: ['my folder'],
      });
    });

    it('keeps folder segments untouched for names containing the version separator', () => {
      expect(getEntityScopeInfo('toolsets/public/a__b__1.0', USER_BUCKET)).toEqual({
        scope: ResourceScope.Organization,
        folderPath: [],
      });
    });

    it('returns undefined for an id shorter than root/bucket/name', () => {
      expect(getEntityScopeInfo('toolsets/my-toolset', USER_BUCKET)).toBeUndefined();
    });
  });

  describe('model roots (model, models)', () => {
    it('classifies a publisher-path model as Organization with no folder path', () => {
      expect(getEntityScopeInfo('model/openai/gpt-4o', USER_BUCKET)).toEqual({
        scope: ResourceScope.Organization,
        folderPath: [],
      });
    });

    it('classifies a public-bucket model as Organization with the folder path', () => {
      expect(getEntityScopeInfo('model/public/f/x__1', USER_BUCKET)).toEqual({
        scope: ResourceScope.Organization,
        folderPath: ['f'],
      });
    });

    it('classifies a user-bucket model as Personal', () => {
      expect(getEntityScopeInfo('model/user-bucket-123/mymodel', USER_BUCKET)).toEqual({
        scope: ResourceScope.Personal,
        folderPath: [],
      });
    });

    it('treats a non-bucket second segment as a publisher path (Organization)', () => {
      expect(getEntityScopeInfo('model/openai/gpt/gpt-4o', USER_BUCKET)).toEqual({
        scope: ResourceScope.Organization,
        folderPath: ['gpt'],
      });
    });
  });

  describe('unrecognized roots', () => {
    it('returns undefined for a free-form custom tool id', () => {
      expect(getEntityScopeInfo('my custom tool', USER_BUCKET)).toBeUndefined();
    });

    it('returns undefined for a prompt id', () => {
      expect(getEntityScopeInfo('prompts/public/x', USER_BUCKET)).toBeUndefined();
    });
  });
});
