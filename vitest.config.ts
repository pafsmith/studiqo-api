import { config as loadDotenv } from "dotenv";
import { resolve } from "node:path";
import { defineConfig } from "vitest/config";

loadDotenv({ path: resolve(process.cwd(), ".env.test"), override: true });

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    fileParallelism: false,
  },
});
