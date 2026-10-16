import { defineConfig } from 'vitest/config';
// Rules tests share one emulator; run files serially.
export default defineConfig({ test: { include: ['**/*.rules.test.ts'], fileParallelism: false, testTimeout: 15000, hookTimeout: 30000 } });
