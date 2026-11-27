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
    setupFiles: ['src/test-utils/setup.ts'],
    // The canvas package imports CSS; Vite must transform it before Node loads it.
    server: { deps: { inline: ['@epam/ai-dial-attachment-canvas', '@epam/ai-dial-chat-hooks'] } },
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/**/*.d.ts',
        'src/**/tests/**',
        'src/test-utils/**',
        'src/vite-env.d.ts',
        // Bootstrap only (providers/router wiring), not worth unit-testing.
        'src/main.tsx',
      ],
      // Fixed 70% gate on every metric, edited by hand only (no `autoUpdate`).
      thresholds: {
        statements: 70,
        branches: 70,
        functions: 70,
        lines: 70,
      },
    },
  },
});
