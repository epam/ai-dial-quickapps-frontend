import { getToken } from 'next-auth/jwt';
import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';

const COOKIE_NAME = 'dial_session';

interface DialSessionData {
  token: string;
  dialApiHost: string;
}

export const getDialSession = async (): Promise<DialSessionData | null> => {
  const cookieStore = await cookies();
  const cookie = cookieStore.get(COOKIE_NAME);
  if (!cookie) return null;
  try {
    return JSON.parse(cookie.value) as DialSessionData;
  } catch {
    return null;
  }
};

export const getDialAuth = async (
  req: NextRequest,
): Promise<{ token?: string; dialApiHost?: string }> => {
  const jwtToken = await getToken({ req });
  if (jwtToken?.accessToken) {
    return {
      token: jwtToken.accessToken as string,
      dialApiHost: process.env.DIAL_CORE_URL,
    };
  }
  const session = await getDialSession();
  return { token: session?.token, dialApiHost: session?.dialApiHost };
};

export const JSON_CONTENT_TYPE_HEADERS = { 'Content-Type': 'application/json' };

export const getDialAuthHeaders = (
  token: string,
  options?: { isJson?: boolean },
): Record<string, string> => ({
  Authorization: `Bearer ${token}`,
  ...(options?.isJson ? JSON_CONTENT_TYPE_HEADERS : {}),
});

export const encodeDialPath = (id: string): string =>
  id
    .split('/')
    .map((part) => encodeURIComponent(part))
    .join('/');
