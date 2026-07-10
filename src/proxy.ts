import { NextResponse } from 'next/server';

const monacoCdnOrigin = 'https://cdn.jsdelivr.net';

const buildCspHeader = (): string => {
  // Space-separated list of origins allowed to embed this app in an <iframe>.
  // Read per-request (not at build time) so it reflects the container's
  // current runtime environment. Defaults to 'self' until configured.
  const frameAncestors = process.env.ALLOWED_FRAME_ANCESTORS?.trim() || "'self'";
  const isDev = process.env.NODE_ENV === 'development';

  return `
    default-src 'self';
    script-src 'self' 'unsafe-inline' ${monacoCdnOrigin}${isDev ? " 'unsafe-eval'" : ''};
    style-src 'self' 'unsafe-inline' ${monacoCdnOrigin};
    img-src 'self' data: blob: https:;
    font-src 'self' ${monacoCdnOrigin};
    worker-src 'self' blob:;
    connect-src 'self' ${monacoCdnOrigin};
    object-src 'none';
    base-uri 'self';
    form-action 'self';
    frame-ancestors ${frameAncestors};
  `
    .replace(/\s{2,}/g, ' ')
    .trim();
};

export const proxy = () => {
  const response = NextResponse.next();
  response.headers.set('Content-Security-Policy', buildCspHeader());
  return response;
};

export const config = {
  matcher: '/((?!_next/static|_next/image|favicon.ico).*)',
};
