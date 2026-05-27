import { defineConfig } from 'vitest/config';
import swc from 'unplugin-swc';

export default defineConfig({
  plugins: [
    swc.vite({
      module: { type: 'es6' },
      jsc: {
        parser: { syntax: 'typescript', decorators: true },
        transform: { decoratorMetadata: true },
        target: 'es2022',
      },
    }),
  ],
  test: {
    include: ['src/**/*.test.ts'],
    // globalSetup removed — old DB integration tests are gone (see auth.integration.test.ts).
    // Re-add with a testcontainer setup when adding DB-dependent integration tests.
    testTimeout: 10_000,
    pool: 'forks',
  },
});
