import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@shared': resolve(import.meta.dirname, 'src/shared'),
      '@main': resolve(import.meta.dirname, 'src/main'),
      '@renderer': resolve(import.meta.dirname, 'src/renderer'),
    },
  },
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
    testTimeout: 30_000,
    pool: 'forks',
    coverage: {
      provider: 'v8',
      reporter: ['text-summary', 'text', 'html'],
      reportsDirectory: 'coverage',
      include: [
        'src/main/droid/**/*.ts',
        'src/main/models.ts',
        'src/main/prefs.ts',
        'src/main/env.ts',
      ],
      exclude: [
        'src/renderer/**',
        'src/preload/**',
        'src/main/main.ts',
        'src/main/ipc.ts',
        '**/*.d.ts',
      ],
      thresholds: {
        lines: 80,
      },
    },
  },
});
