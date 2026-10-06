#!/usr/bin/env node
// Runs the published chat-api image with this app's freshly-built `dist/`
// mounted over its frontend path — the fast local-testing loop from
// README.md's "Docker build" section, without waiting on a full
// `npm ci && npm run build` inside a container each time.
//
// A plain Node script (invoked via `npm run docker:run:dist`) rather than a
// shell one-liner in package.json, so it works identically from bash, cmd,
// PowerShell or zsh — no shell-specific path syntax ($(pwd) vs %cd% vs
// ${PWD}) or quoting rules to get wrong.
//
// Override the image with: CHAT_API_IMAGE=ghcr.io/epam/ai-dial-chat-bff:<tag> npm run docker:run

import { execSync, spawnSync } from 'node:child_process';
import path from 'node:path';

execSync('npm run build', { stdio: 'inherit' });

const distPath = path.resolve(process.cwd(), 'dist');
const chatApiImage = process.env.CHAT_API_IMAGE ?? 'ghcr.io/epam/ai-dial-chat-bff:development';

// `docker run` reuses whatever's already cached locally under this tag and
// never checks the registry on its own — a floating tag like `:development`
// moves forward on every chat-api merge, so without an explicit pull first
// this silently runs a stale image indefinitely once it's been pulled once.
execSync(`docker pull ${chatApiImage}`, { stdio: 'inherit' });

// Print exactly which build this actually resolved to (image id + build
// date) — a floating tag's own name never changes, so this is the only way
// to tell whether you're on a fresh pull or a stale local one at a glance.
const [imageId, createdAt] = execSync(
  `docker inspect --format "{{.Id}}|{{.Created}}" ${chatApiImage}`,
)
  .toString()
  .trim()
  .split('|');
console.log(`[docker:run] ${chatApiImage} -> ${imageId} (built ${createdAt})`);

const result = spawnSync(
  'docker',
  [
    'run',
    '--rm',
    '-p',
    '5001:5001',
    '--env-file',
    '.env.docker',
    // Keep the local QuickApps BFF on 5001, isolated from a separate Chat API
    // instance and from the deployable image's 5000 default, even if .env.docker
    // was copied from an older template.
    '-e',
    'PORT=5001',
    '-v',
    `${distPath}:/app/apps/chat/dist`,
    chatApiImage,
  ],
  { stdio: 'inherit' },
);

process.exit(result.status ?? 1);
