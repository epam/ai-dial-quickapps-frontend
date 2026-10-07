import { OutboundMessageType } from '@/types/editor-messages';
import { postToHost } from '@/utils/allowed-origins';

/** Opens the host's application credential forms without sharing any secrets with this editor. */
export const requestApplicationCredentials = (appId: string, allowedOrigins?: string[]) => {
  postToHost({ type: OutboundMessageType.RequestApplicationCredentials, appId }, allowedOrigins);
};
