import { getToken } from 'next-auth/jwt';
import { NextRequest, NextResponse } from 'next/server';

import { errorLog, errorObjLog, warnLog } from '@/server/logger';
import { getDialAuthHeaders } from '@/utils/server/dial-server-auth';

type RouteContext = { params: Promise<{ path: string[] }> };

const proxyDial = async (req: NextRequest, { params }: RouteContext): Promise<NextResponse> => {
  const jwtToken = await getToken({ req });
  if (!jwtToken?.accessToken || jwtToken.error) {
    warnLog('dial-proxy: unauthenticated request');
    return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });
  }

  const token = jwtToken.accessToken;
  const dialApiHost = process.env.DIAL_CORE_URL;

  if (!dialApiHost) {
    errorLog('dial-proxy: DIAL_CORE_URL is not configured');
    return NextResponse.json({ error: 'DIAL_CORE_URL is not configured.' }, { status: 500 });
  }

  // Use pathname directly to preserve trailing slashes (e.g. /v1/metadata/files/bucket/)
  // which are required by DIAL Core for folder listings. params.path.join('/') strips them.
  await params; // consume params promise even though we don't use the value
  const dialPath = req.nextUrl.pathname.slice('/api/dial'.length);
  const search = req.nextUrl.search;
  const backendUrl = `${dialApiHost}${dialPath}${search}`;

  const headers: Record<string, string> = getDialAuthHeaders(token);
  const contentType = req.headers.get('content-type');
  if (contentType) headers['Content-Type'] = contentType;

  const hasBody = req.method !== 'GET' && req.method !== 'HEAD';
  const isBinaryUpload =
    contentType?.includes('multipart/form-data') ||
    contentType?.includes('application/octet-stream');
  const body = hasBody ? (isBinaryUpload ? await req.arrayBuffer() : await req.text()) : undefined;

  const backendRes = await fetch(backendUrl, {
    method: req.method,
    headers,
    body: body as BodyInit | undefined,
  });

  const responseContentType = backendRes.headers.get('content-type') ?? 'application/json';
  const isJsonOrText =
    responseContentType.includes('application/json') || responseContentType.includes('text/');

  const responseHeaders: Record<string, string> = {
    'Content-Type': responseContentType,
  };
  const disposition = backendRes.headers.get('content-disposition');
  if (disposition) responseHeaders['Content-Disposition'] = disposition;

  if (isJsonOrText) {
    const responseBody = await backendRes.text();
    if (!backendRes.ok) {
      errorObjLog(
        { message: responseBody, statusCode: backendRes.status },
        `dial-proxy: ${req.method} ${backendUrl} -> ${backendRes.status}`,
      );
    }
    return new NextResponse(responseBody, {
      status: backendRes.status,
      headers: responseHeaders,
    });
  }

  if (!backendRes.ok) {
    errorLog(`dial-proxy: ${req.method} ${backendUrl} -> ${backendRes.status}`);
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
