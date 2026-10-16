import { ResponseError } from '@epam/ai-dial-chat-api-client';
import { describe, expect, it } from 'vitest';

import { getChatApiErrorMessage } from '@/utils/chat-api-error';

const responseError = (body: string, status = 400) =>
  new ResponseError(new Response(body, { status }));

describe('getChatApiErrorMessage', () => {
  it("returns chat-api's message from the error body", async () => {
    expect(await getChatApiErrorMessage(responseError('{"message":"Name is taken"}'))).toBe(
      'Name is taken',
    );
  });

  it('joins a message array with line breaks', async () => {
    expect(await getChatApiErrorMessage(responseError('{"message":["First","Second"]}'))).toBe(
      'First\nSecond',
    );
  });

  it('returns null for a body without a message', async () => {
    expect(await getChatApiErrorMessage(responseError('{}', 500))).toBeNull();
    expect(await getChatApiErrorMessage(responseError('', 500))).toBeNull();
  });

  it('returns null for errors that are not chat-api responses', async () => {
    expect(await getChatApiErrorMessage(new TypeError('Failed to fetch'))).toBeNull();
    expect(await getChatApiErrorMessage('oops')).toBeNull();
  });
});
