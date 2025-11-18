import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts', 'tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'dist/',
        '**/*.test.ts',
        'install.js',
        'vitest.config.ts',
      ],
    },
    // Isolation: each test file gets fresh imports
    isolate: true,
    // Run tests in parallel for performance
    pool: 'threads',
  },
});
