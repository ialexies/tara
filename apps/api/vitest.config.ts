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
    globalSetup: ['src/test/global-setup.ts'],
    testTimeout: 30_000,
    hookTimeout: 90_000,
    pool: 'forks',
  },
});
