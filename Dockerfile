# syntax=docker/dockerfile:1

# Must be declared before the first FROM: an ARG used in a later FROM has to be
# in global scope for classic builders (no buildx/BuildKit).
# Point it at a real, published release tag of ai-dial-chat (the "Packages" tab of
# the epam/ai-dial-chat repo). Run `docker login ghcr.io` first if the package is private.
ARG CHAT_API_IMAGE=ghcr.io/epam/ai-dial-chat:<pinned-release>

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

USER node

# Match this app's own dev port (vite.config.ts) so the URL is the same
# whether you're running `npm run dev` or this built image locally — override
# with `-e PORT=...`/`--env-file` for a real deployment. chat-api's own
# default (absent this) is 5000.
ENV PORT=4600
EXPOSE 4600

# No curl in the image, so use Node's fetch. Respects PORT and API_PREFIX overrides.
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:' + (process.env.PORT || '5000') + '/' + (process.env.API_PREFIX || 'api').replace(/^[/]+|[/]+$/g, '') + '/health', {signal: AbortSignal.timeout(4000), redirect: 'error'}).then(r => process.exit(r.status === 200 ? 0 : 1)).catch(() => process.exit(1))"]

CMD ["node", "apps/chat-api/dist/main.js"]
