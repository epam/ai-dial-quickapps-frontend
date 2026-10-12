/**
 * Stand-in for `@/hooks/use-translation`: every key is its own English text,
 * so `t` returns the key with `{{name}}` placeholders filled from the options.
 *
 * vi.mock('@/hooks/use-translation', () => import('@/test-utils/mock-translation'));
 */
const t = (key: string, options?: Record<string, unknown>) =>
  key.replace(/\{\{(\w+)\}\}/g, (_, name: string) => String(options?.[name] ?? ''));

export const useTranslation = () => ({ language: 'en', t });
