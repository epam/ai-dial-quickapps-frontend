#!/usr/bin/env node
// Runs chat-api from a local checkout instead of a Docker image — for
// working on this app and chat-api together, with both sides live-reloading
// (this app via `npm run dev`, chat-api via its own `nx serve chat-api`
// watch mode).
//
// Reads this repo's own `.env.local` (not read by anything else in this
// script other than to build the child process's env — see below) for:
//   - CHAT_API_LOCAL_DIR — absolute path to a local ai-dial-chat checkout,
//     e.g. CHAT_API_LOCAL_DIR=/c/projects/dial/ai-dial-chat
// Every other variable in `.env.local` (PORT, DIAL_CORE_URL, AUTH_*, ...) is
// passed straight through as chat-api's own runtime env, same set as
// `.env.template` documents for the Docker path — set PORT=5000 there to
// match `vite.config.ts`'s dev-server proxy target.
//
// A plain Node script (invoked via `npm run chat-api:local`) rather than a
// shell one-liner, so it works identically from bash, cmd, PowerShell or zsh
// — no `export`/`set` or path-quoting differences to get wrong, and no
// dependency on chat-api's own env files.

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const ENV_LOCAL_VAR = 'CHAT_API_LOCAL_DIR';
const envLocalPath = path.resolve(process.cwd(), '.env.local');

const parseEnvFile = (filePath) => {
  const env = {};
  const contents = fs.readFileSync(filePath, 'utf8');
  for (const rawLine of contents.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (line === '' || line.startsWith('#')) {
      continue;
    }
    const match = /^([\w.-]+)\s*=\s*(.*)$/.exec(line);
    if (!match) {
      continue;
    }
    const [, key, rawValue] = match;
    const isQuoted =
      (rawValue.startsWith('"') && rawValue.endsWith('"')) ||
      (rawValue.startsWith("'") && rawValue.endsWith("'"));
    env[key] = isQuoted ? rawValue.slice(1, -1) : rawValue;
  }
  return env;
};

if (!fs.existsSync(envLocalPath)) {
  console.error(
    `[chat-api:local] ${envLocalPath} not found. Create it with at least:\n` +
      `  ${ENV_LOCAL_VAR}=/absolute/path/to/ai-dial-chat\n` +
      'plus chat-api\'s own runtime vars (see .env.template) — PORT=5000 to match vite.config.ts.',
  );
  process.exit(1);
}

const envLocal = parseEnvFile(envLocalPath);
const chatApiDir = envLocal[ENV_LOCAL_VAR];

if (!chatApiDir) {
  console.error(`[chat-api:local] Set ${ENV_LOCAL_VAR} in ${envLocalPath} to your local ai-dial-chat checkout.`);
  process.exit(1);
}

const resolvedChatApiDir = path.resolve(chatApiDir);
if (!fs.existsSync(path.join(resolvedChatApiDir, 'package.json'))) {
  console.error(
    `[chat-api:local] ${ENV_LOCAL_VAR} (${resolvedChatApiDir}) doesn't look like an ai-dial-chat checkout — no package.json there.`,
  );
  process.exit(1);
}

console.log(`[chat-api:local] starting chat-api from ${resolvedChatApiDir}...`);

const result = spawnSync('npm', ['run', 'start:api'], {
  cwd: resolvedChatApiDir,
  env: { ...process.env, ...envLocal },
  stdio: 'inherit',
  shell: true,
});

process.exit(result.status ?? 1);
