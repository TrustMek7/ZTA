import { defineConfig } from 'vitest/config';
export default defineConfig({ test: { include: ['backend/test/**/*.test.ts', 'shared/**/*.test.ts', 'frontend/**/*.test.tsx'], environment: 'node' } });
