import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    // One shared Postgres; parallel test files would race TRUNCATE/inserts.
    fileParallelism: false,
    setupFiles: ["./tests/loadEnv.ts", "./tests/setup.ts"],
    testTimeout: 10000,
    hookTimeout: 15000,
  },
});
