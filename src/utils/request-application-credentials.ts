import { OutboundMessageType } from '@/types/editor-messages';
import { postEditorMessage } from '@/utils/post-editor-message';

/** Opens the host's application credential forms without sharing any secrets with this editor. */
export const requestApplicationCredentials = (appId: string, allowedOrigins?: string[]) => {
  postEditorMessage(
    { type: OutboundMessageType.RequestApplicationCredentials, appId },
    allowedOrigins,
  );
};
