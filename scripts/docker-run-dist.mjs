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
// Override the image with: CHAT_API_IMAGE=ghcr.io/epam/ai-dial-chat:<tag> npm run docker:run:dist

import { execSync, spawnSync } from 'node:child_process';
import path from 'node:path';

execSync('npm run build', { stdio: 'inherit' });

const distPath = path.resolve(process.cwd(), 'dist');
const chatApiImage = process.env.CHAT_API_IMAGE ?? 'ghcr.io/epam/ai-dial-chat:development';

const result = spawnSync(
  'docker',
  [
    'run',
    '--rm',
    '-p',
    '4600:4600',
    '--env-file',
    '.env.example',
    '-v',
    `${distPath}:/app/apps/chat/dist`,
    chatApiImage,
  ],
  { stdio: 'inherit' },
);

process.exit(result.status ?? 1);
