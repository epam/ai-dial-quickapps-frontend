#!/usr/bin/env node
// Same idea as docker-run-dist.mjs (mount this app's `dist/` into the
// published chat-api image instead of doing a full `docker:build`), but for
// active development: after one normal blocking build, `vite build --watch`
// keeps running in the background and rewriting `dist/` on every source
// change, so the already-running container picks up edits on the next
// request — no rebuild-and-restart cycle needed.
//
// A plain Node script (invoked via `npm run docker:run:watch`) rather than a
// shell one-liner in package.json, so it works identically from bash, cmd,
// PowerShell or zsh, and so the watch process can be torn down cleanly when
// the container exits or the script is interrupted.
//
// Override the image with: CHAT_API_IMAGE=ghcr.io/epam/ai-dial-chat:<tag> npm run docker:run:watch

import { execSync, spawn, spawnSync } from 'node:child_process';
import path from 'node:path';

const distPath = path.resolve(process.cwd(), 'dist');
const chatApiImage = process.env.CHAT_API_IMAGE ?? 'ghcr.io/epam/ai-dial-chat:development';

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
console.log(`[docker:run:watch] ${chatApiImage} -> ${imageId} (built ${createdAt})`);

// `vite build --watch`'s first pass also empties/rewrites the whole outDir,
// so starting the container against it immediately races the container
// against a half-written `dist/` (stale index.html, a missing hashed asset,
// etc. — the exact 404s this looked like before this blocking build was
// added). Do one normal, blocking build first so `dist/` is a complete,
// consistent build before Docker ever touches it, then switch to `--watch`
// purely for live rebuilds on later edits.
console.log('[docker:run:watch] building dist/ once before starting the container...');
execSync('npx vite build', { stdio: 'inherit' });

console.log('[docker:run:watch] starting `vite build --watch` for live rebuilds...');
const watch = spawn('npx', ['vite', 'build', '--watch'], {
  stdio: 'inherit',
  shell: true,
});

const stopWatch = () => {
  if (!watch.killed) {
    watch.kill();
  }
};
process.on('exit', stopWatch);
process.on('SIGINT', () => {
  stopWatch();
  process.exit(130);
});
process.on('SIGTERM', () => {
  stopWatch();
  process.exit(143);
});

const result = spawnSync(
  'docker',
  [
    'run',
    '--rm',
    '-p',
    '4600:4600',
    '--env-file',
    '.env.docker',
    '-v',
    `${distPath}:/app/apps/chat/dist`,
    chatApiImage,
  ],
  { stdio: 'inherit' },
);

stopWatch();
process.exit(result.status ?? 1);
