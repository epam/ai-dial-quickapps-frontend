import { ResponseError } from '@epam/ai-dial-chat-api-client';
import { getApiErrorMessage } from '@epam/ai-dial-chat-hooks/utils';

/**
 * The message chat-api put in an error response body (`message`, a joined
 * `message[]`, or `error`), or `null` when there is none. The generated
 * client's generic `ResponseError.message` ("Response returned an error code")
 * and browser network messages are untranslated and say nothing useful, so the
 * caller shows its own translated text instead.
 */
export const getChatApiErrorMessage = async (error: unknown): Promise<string | null> => {
  if (!(error instanceof ResponseError)) return null;
  const message = await getApiErrorMessage(error);
  // getApiErrorMessage falls back to `error.message` when the body has none.
  if (!message || message === error.message) return null;
  return message;
};
