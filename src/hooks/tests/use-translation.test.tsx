import { act, type FC } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useTranslation } from '@/hooks/use-translation';
import { Translation } from '@/types/translation';

const i18nT = vi.fn();
const useI18nTranslation = vi.fn();

vi.mock('react-i18next', () => ({
  useTranslation: (ns: string) => useI18nTranslation(ns),
}));

let latest: ReturnType<typeof useTranslation>;

const Probe: FC = () => {
  latest = useTranslation(Translation.Common);
  return null;
};

let root: Root;
let container: HTMLDivElement;

beforeEach(() => {
  vi.resetAllMocks();
  (globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;
  useI18nTranslation.mockReturnValue({ t: i18nT, i18n: { language: 'ar' } });
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

describe('useTranslation', () => {
  it('uses the given namespace and exposes the active language', () => {
    act(() => root.render(<Probe />));

    expect(useI18nTranslation).toHaveBeenCalledWith(Translation.Common);
    expect(latest.language).toBe('ar');
  });

  it('passes interpolation options through only when given', () => {
    i18nT.mockImplementation((key: string) => `translated:${key}`);
    act(() => root.render(<Probe />));

    expect(latest.t('a.key')).toBe('translated:a.key');
    expect(i18nT).toHaveBeenLastCalledWith('a.key');

    latest.t('b.key', { count: 2 });
    expect(i18nT).toHaveBeenLastCalledWith('b.key', { count: 2 });
  });

  it('falls back to the key when i18next returns nothing', () => {
    i18nT.mockReturnValue(undefined);
    act(() => root.render(<Probe />));

    expect(latest.t('missing.key')).toBe('missing.key');
  });

  it('keeps the same result object while nothing changes', () => {
    act(() => root.render(<Probe />));
    const first = latest;
    act(() => root.render(<Probe />));

    expect(latest).toBe(first);
  });
});
