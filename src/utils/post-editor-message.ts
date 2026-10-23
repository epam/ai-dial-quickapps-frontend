import type { EditorOutboundMessage } from '@/types/editor-messages';
import { postToHost } from '@/utils/allowed-origins';

/** Preserve Admin envelopes and origin fan-out while checking the shared editor contract. */
export const postEditorMessage = (
  message: EditorOutboundMessage,
  allowedOrigins?: string[],
): void => postToHost(message, allowedOrigins);
