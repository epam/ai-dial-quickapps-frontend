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

  // Use pathname directly to preserve trailing slashes (e.g. /v1/metadata/files/bucket/)
  // which are required by DIAL Core for folder listings. params.path.join('/') strips them.
  await params; // consume params promise even though we don't use the value
  const dialPath = req.nextUrl.pathname.slice("/api/dial".length);
  const search = req.nextUrl.search;
  const backendUrl = `${dialApiHost}${dialPath}${search}`;

  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
  };
  const contentType = req.headers.get("content-type");
  if (contentType) headers["Content-Type"] = contentType;

  const hasBody = req.method !== "GET" && req.method !== "HEAD";
  const isBinaryUpload =
    contentType?.includes("multipart/form-data") ||
    contentType?.includes("application/octet-stream");
  const body = hasBody
    ? isBinaryUpload
      ? await req.arrayBuffer()
      : await req.text()
    : undefined;

  const backendRes = await fetch(backendUrl, {
    method: req.method,
    headers,
    body: body as BodyInit | undefined,
  });

  const responseContentType =
    backendRes.headers.get("content-type") ?? "application/json";
  const isJsonOrText =
    responseContentType.includes("application/json") ||
    responseContentType.includes("text/");

  const responseHeaders: Record<string, string> = {
    "Content-Type": responseContentType,
  };
  const disposition = backendRes.headers.get("content-disposition");
  if (disposition) responseHeaders["Content-Disposition"] = disposition;

  if (isJsonOrText) {
    const responseBody = await backendRes.text();
    return new NextResponse(responseBody, {
      status: backendRes.status,
      headers: responseHeaders,
    });
  }

  return new NextResponse(backendRes.body, {
    status: backendRes.status,
    headers: responseHeaders,
  });
};

export const GET = proxyDial;
export const POST = proxyDial;
export const PUT = proxyDial;
export const DELETE = proxyDial;
export const PATCH = proxyDial;
