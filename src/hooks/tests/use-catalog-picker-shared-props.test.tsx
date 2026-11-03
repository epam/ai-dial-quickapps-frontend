import { CatalogLoadStatus } from '@epam/ai-dial-catalog';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { BasicI18nKeys, ButtonsI18nKeys, CatalogI18nKeys } from '@/constants/translation-keys';
import {
  type CatalogPickerSharedProps,
  useCatalogPickerSharedProps,
} from '@/hooks/use-catalog-picker-shared-props';
import { setupTestRoot } from '@/test-utils/test-root';
import { LoadStatus } from '@/types/load-status';

const { data } = vi.hoisted(() => ({
  data: {
    status: 'ready' as string,
    error: undefined as string | undefined,
    refreshAll: () => undefined,
  },
}));

vi.mock('@/context/DataContext', () => ({
  useDataContext: () => data,
}));

const dom = setupTestRoot();
let result: CatalogPickerSharedProps;

const HookHarness = () => {
  result = useCatalogPickerSharedProps();
  return null;
};

const renderHook = () => dom.render(<HookHarness />);

beforeEach(() => {
  data.status = LoadStatus.Ready;
  data.error = undefined;
});

describe('useCatalogPickerSharedProps', () => {
  it('translates every string the catalog picker would show in English', () => {
    renderHook();

    expect(result.labels).toEqual({
      noResults: BasicI18nKeys.NoResults,
      retry: ButtonsI18nKeys.Retry,
      sort: ButtonsI18nKeys.Sort,
      sortUpdated: CatalogI18nKeys.SortsUpdated,
      sortNewest: CatalogI18nKeys.SortNewest,
      sortNameAZ: CatalogI18nKeys.SortNameAZ,
      cancel: ButtonsI18nKeys.Cancel,
      add: ButtonsI18nKeys.Add,
      closeDialog: BasicI18nKeys.CloseDialog,
      clearSearch: BasicI18nKeys.ClearSearch,
      from: CatalogI18nKeys.BrowseSettingsFrom,
      my: CatalogI18nKeys.BrowseSettingsMy,
      topics: CatalogI18nKeys.BrowseSettingsTopics,
      clear: ButtonsI18nKeys.Clear,
      apply: ButtonsI18nKeys.Apply,
      scrollToTop: CatalogI18nKeys.ScrollToTop,
    });
  });

  it.each([
    [LoadStatus.Idle, CatalogLoadStatus.Loading],
    [LoadStatus.Loading, CatalogLoadStatus.Loading],
    [LoadStatus.Ready, CatalogLoadStatus.Ready],
    [LoadStatus.Error, CatalogLoadStatus.Error],
  ])('maps the %s data status to the %s picker status', (status, expected) => {
    data.status = status;
    renderHook();

    expect(result.status).toBe(expected);
  });

  it('retries with refreshAll and shows the load error', () => {
    data.status = LoadStatus.Error;
    data.error = 'Forbidden';
    renderHook();

    expect(result.onRetry).toBe(data.refreshAll);
    expect(result.error).toBe('Forbidden');
  });
});
