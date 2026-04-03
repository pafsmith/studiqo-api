import { config as loadDotenv } from "dotenv";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { defineConfig } from "vitest/config";

function resolveTestEnvPath(): string {
  const workspacePath = resolve(process.cwd(), ".env.test");
  if (existsSync(workspacePath)) {
    return workspacePath;
  }
  return resolve(process.cwd(), "../../.env.test");
}

loadDotenv({ path: resolveTestEnvPath(), override: true });

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    fileParallelism: false,
  },
});
