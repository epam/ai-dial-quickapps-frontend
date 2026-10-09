import { CatalogEntityType } from '@epam/ai-dial-chat-shared';
import { describe, expect, it } from 'vitest';

import { DialEntityType } from '@/types/dial-entities';
import type { DialModel } from '@/types/dial-entities';
import { ResourceScope } from '@/types/resource-scope';
import { mapModelToCatalogItem } from '@/utils/map-model-to-catalog-item';

const USER_BUCKET = 'user-bucket-123';

const OPTIONS = {
  language: 'en',
  userBucket: USER_BUCKET,
  scopeLabels: {
    [ResourceScope.Personal]: 'Personal',
    [ResourceScope.Shared]: 'Shared',
    [ResourceScope.Organization]: 'Organization',
  },
};

const makeModel = (overrides: Partial<DialModel> = {}): DialModel => ({
  id: 'models/gemini__1.0.3',
  reference: 'gemini',
  name: 'Google Gemini 3.5 Flash Lite',
  type: DialEntityType.Model,
  version: '1.0.3',
  features: { tools: true },
  ...overrides,
});

describe('mapModelToCatalogItem', () => {
  it('maps a model to a catalog row that keeps its full versioned id', () => {
    const item = mapModelToCatalogItem(
      makeModel({ description: 'Fast model', topics: ['Business', 'Domain'] }),
      OPTIONS,
    );

    expect(item).toMatchObject({
      id: 'models/gemini__1.0.3',
      type: CatalogEntityType.Model,
      name: 'Google Gemini 3.5 Flash Lite',
      version: '1.0.3',
      description: 'Fast model',
      topics: ['Business', 'Domain'],
      lastUsed: '',
    });
  });

  it('uses the name for the active language and falls back to the id', () => {
    expect(
      mapModelToCatalogItem(makeModel({ name: { en: 'Gemini', de: 'Gemini DE' } }), {
        ...OPTIONS,
        language: 'de',
      }).name,
    ).toBe('Gemini DE');
    expect(mapModelToCatalogItem(makeModel({ name: '' }), OPTIONS).name).toBe(
      'models/gemini__1.0.3',
    );
  });

  it('uses an empty version, description and topics when the model has none', () => {
    const item = mapModelToCatalogItem(
      makeModel({ version: undefined, description: undefined, topics: undefined }),
      OPTIONS,
    );

    expect(item.version).toBe('');
    expect(item.description).toBe('');
    expect(item.topics).toEqual([]);
  });

  it('resolves the icon url and omits it when the model has no icon', () => {
    expect(
      mapModelToCatalogItem(makeModel({ iconUrl: 'https://cdn.example.com/g.svg' }), OPTIONS)
        .iconUrl,
    ).toBe('https://cdn.example.com/g.svg');
    expect(mapModelToCatalogItem(makeModel(), OPTIONS).iconUrl).toBeUndefined();
  });

  it('converts updatedAt to epoch ms and omits a missing or invalid value', () => {
    expect(
      mapModelToCatalogItem(makeModel({ updatedAt: '2026-01-02T00:00:00.000Z' }), OPTIONS)
        .updatedAt,
    ).toBe(Date.UTC(2026, 0, 2));
    expect(mapModelToCatalogItem(makeModel({ updatedAt: 1700000000000 }), OPTIONS).updatedAt).toBe(
      1700000000000,
    );
    expect(mapModelToCatalogItem(makeModel(), OPTIONS).updatedAt).toBeUndefined();
    expect(
      mapModelToCatalogItem(makeModel({ updatedAt: 'not a date' }), OPTIONS).updatedAt,
    ).toBeUndefined();
  });

  describe('folder', () => {
    it('files a configured model without a bucket under Organization', () => {
      const item = mapModelToCatalogItem(makeModel(), OPTIONS);

      expect(item.folder).toEqual(['Organization']);
      expect(item.isMyApp).toBe(false);
    });

    it('files a configured model with a bare deployment id under Organization', () => {
      expect(
        mapModelToCatalogItem(makeModel({ id: 'llama-3.2-1b-instruct' }), OPTIONS).folder,
      ).toEqual(['Organization']);
    });

    it('adds the folder path of a model published into a public sub-folder', () => {
      expect(
        mapModelToCatalogItem(makeModel({ id: 'models/public/folder1/gemini__1.0.3' }), OPTIONS)
          .folder,
      ).toEqual(['Organization', 'folder1']);
    });

    it('files a publisher-path model under Organization', () => {
      expect(
        mapModelToCatalogItem(makeModel({ id: 'model/openai/gpt-4o' }), OPTIONS).folder,
      ).toEqual(['Organization']);
    });

    it("marks a model in the user's bucket as Personal and as the user's own", () => {
      const item = mapModelToCatalogItem(
        makeModel({ id: `models/${USER_BUCKET}/mine/gemini__1.0.3` }),
        OPTIONS,
      );

      expect(item.folder).toEqual(['Personal', 'mine']);
      expect(item.isMyApp).toBe(true);
    });

    it('leaves the folder empty when the scope cannot be determined', () => {
      const item = mapModelToCatalogItem(makeModel({ id: 'deployments/gemini' }), OPTIONS);

      expect(item.folder).toEqual([]);
      expect(item.isMyApp).toBe(false);
    });
  });
});
