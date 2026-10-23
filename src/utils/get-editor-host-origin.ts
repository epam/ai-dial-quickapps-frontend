import type { AppSettings } from '@/types/dial-entities';

const normalizeOrigin = (host?: string): string | null => {
  if (!host) return null;
  try {
    const origin = new URL(host).origin;
    return origin === 'null' ? null : origin;
  } catch {
    return null;
  }
};

/** Keeps Admin-first targeting, preferring Chat when it is the embedding ancestor. */
export const getEditorHostOrigin = (
  { dialAdminHost, dialChatHost }: Pick<AppSettings, 'dialAdminHost' | 'dialChatHost'>,
  ancestorOrigin?: string,
): string | null => {
  const chatOrigin = normalizeOrigin(dialChatHost);
  if (chatOrigin && chatOrigin === normalizeOrigin(ancestorOrigin)) return chatOrigin;
  return normalizeOrigin(dialAdminHost || dialChatHost);
};
