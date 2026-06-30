import { getToken } from "next-auth/jwt";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

const COOKIE_NAME = "dial_session";

interface SessionData {
  token: string;
  dialApiHost: string;
}

const getDialSession = async (): Promise<SessionData | null> => {
  const cookieStore = await cookies();
  const cookie = cookieStore.get(COOKIE_NAME);
  if (!cookie) return null;
  try {
    return JSON.parse(cookie.value) as SessionData;
  } catch {
    return null;
  }
};

type RouteContext = { params: Promise<{ path: string[] }> };

const proxyDial = async (
  req: NextRequest,
  { params }: RouteContext,
): Promise<NextResponse> => {
  let token: string | undefined;
  let dialApiHost: string | undefined;

  // Prefer the next-auth JWT (Keycloak login). Fall back to dial_session only
  // when there is no JWT — i.e. the app is embedded in an iframe and the host
  // provided credentials via the INIT postMessage.
  const jwtToken = await getToken({ req });
  if (jwtToken?.accessToken) {
    token = jwtToken.accessToken;
    dialApiHost = process.env.DIAL_CORE_URL;
  } else {
    const dialSession = await getDialSession();
    token = dialSession?.token;
    dialApiHost = dialSession?.dialApiHost;
  }

  if (!token || !dialApiHost) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const { path } = await params;
  const pathStr = path.join("/");
  const search = req.nextUrl.searchParams.toString();
  const backendUrl = `${dialApiHost}/${pathStr}${search ? `?${search}` : ""}`;

  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
  };
  const contentType = req.headers.get("content-type");
  if (contentType) headers["Content-Type"] = contentType;

  const body =
    req.method !== "GET" && req.method !== "HEAD"
      ? await req.text()
      : undefined;

  const backendRes = await fetch(backendUrl, {
    method: req.method,
    headers,
    body,
  });

  const responseBody = await backendRes.text();
  return new NextResponse(responseBody, {
    status: backendRes.status,
    headers: {
      "Content-Type":
        backendRes.headers.get("content-type") ?? "application/json",
    },
  });
};

export const GET = proxyDial;
export const POST = proxyDial;
export const PUT = proxyDial;
export const DELETE = proxyDial;
export const PATCH = proxyDial;
