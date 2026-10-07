import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/**/*.d.ts',
        'src/**/tests/**',
        'src/vite-env.d.ts',
        // Bootstrap only (providers/router wiring), not worth unit-testing.
        'src/main.tsx',
      ],
      // Real baseline as of 2026-09-30 (~15% statements, ~7% branches), rounded
      // down slightly so a trivial fluctuation doesn't fail the build. 70% is
      // the long-term goal (see docs/TECH_DEBT.md), not where we are today —
      // setting it there now would just fail every build. `autoUpdate: true`
      // ratchets these up automatically whenever coverage improves, so the
      // gate only ever tightens as tests are added; it will not raise them all
      // the way to 70% on its own, and won't lower them if coverage regresses
      // (the build fails instead) — bump the 70% target itself in
      // docs/TECH_DEBT.md once these numbers get close to it.
      thresholds: {
        statements: 42.97,
        branches: 37.14,
        functions: 36.94,
        lines: 44.25,
        autoUpdate: true,
      },
    },
  },
});
