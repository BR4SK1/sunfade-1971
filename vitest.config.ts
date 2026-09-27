import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    include: ['src/**/__tests__/**/*.test.ts', 'src/**/__tests__/**/*.test.tsx'],
  },
  resolve: {
    alias: {
      '@palette': new URL('./src/palette', import.meta.url).pathname,
    },
  },
});
