# syntax=docker/dockerfile:1

# Must be declared before the first FROM: an ARG used in a later FROM has to be
# in global scope for classic builders (no buildx/BuildKit).
# Use a published ai-dial-chat-bff image from the epam/ai-dial-chat repository's Packages tab.
# Run `docker login ghcr.io` first if the package is private.
ARG CHAT_API_IMAGE=ghcr.io/epam/ai-dial-chat-bff:development

# Pin exact Node (and, if needed for a security patch, npm) versions for reproducible builds.
FROM node:24.17-alpine AS builder
# RUN npm install --global npm@<patched-version>
WORKDIR /app

# Copy manifests first so the dependency layer is cached across source-only changes.
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts

COPY . .
RUN npm run build

# Take the published chat-api image as-is and swap its frontend for our build.
# chat-api's static-assets.ts resolves the frontend root by walking up from its
# own dist dir to ../../chat/dist, i.e. /app/apps/chat/dist inside the image.
# The image is amd64-only: build with --platform=linux/amd64 (ARM needs emulation).
FROM ${CHAT_API_IMAGE} AS runner

COPY --from=builder /app/dist /app/apps/chat/dist

# Patch OS packages the upstream chat-api image ships unpatched (e.g. zlib
# CVE-2026-85091, fixed in 1.3.2-r1). Drop once the base image picks it up.
USER root
RUN apk upgrade --no-cache zlib

USER node

# The deployable QuickApps image uses chat-api's default listener port. Local runners
# override it to 5001 so a local QuickApps BFF can stay isolated from another chat-api.
# Override when deploying behind a platform that requires a different listener port.
ENV PORT=5000
EXPOSE 5000

# No curl in the image, so use Node's fetch. Respects PORT and API_PREFIX overrides.
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:' + (process.env.PORT || '5000') + '/' + (process.env.API_PREFIX || 'api').replace(/^[/]+|[/]+$/g, '') + '/health', {signal: AbortSignal.timeout(4000), redirect: 'error'}).then(r => process.exit(r.status === 200 ? 0 : 1)).catch(() => process.exit(1))"]

CMD ["node", "apps/chat-api/dist/main.js"]
