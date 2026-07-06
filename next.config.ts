import type { NextConfig } from "next";

// Space-separated list of origins allowed to embed this app in an <iframe>.
// Defaults to 'self' so the app cannot be framed by an unknown host until configured.
const frameAncestors = process.env.ALLOWED_FRAME_ANCESTORS?.trim() || "'self'";

const isDev = process.env.NODE_ENV === "development";

const monacoCdnOrigin = "https://cdn.jsdelivr.net";

const cspHeader = `
  default-src 'self';
  script-src 'self' 'unsafe-inline' ${monacoCdnOrigin}${isDev ? " 'unsafe-eval'" : ""};
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
  .replace(/\s{2,}/g, " ")
  .trim();

const nextConfig: NextConfig = {
  output: "standalone",
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Content-Security-Policy",
            value: cspHeader,
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
