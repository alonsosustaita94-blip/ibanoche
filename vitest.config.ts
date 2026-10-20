import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    environment: "node",
    // Las pruebas de integración usan una base de datos propia (nunca la de desarrollo).
    env: {
      DATABASE_URL: process.env.TEST_DATABASE_URL ?? "postgresql://ibanoche:ibanoche_dev@localhost:5432/ibanoche_crm_test?schema=public",
      APP_TIMEZONE: "America/Mexico_City",
    },
    fileParallelism: false,
    testTimeout: 30000,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      "server-only": path.resolve(__dirname, "tests/support/server-only.ts"),
    },
  },
});
