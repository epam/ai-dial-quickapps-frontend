import { OutboundMessageType } from '@/types/editor-messages';

/** Opens the host's application credential forms without sharing any secrets with this editor. */
export const requestApplicationCredentials = (appId: string, allowedOrigin?: string) => {
  window.parent.postMessage(
    { type: OutboundMessageType.RequestApplicationCredentials, appId },
    allowedOrigin || '*',
  );
};
