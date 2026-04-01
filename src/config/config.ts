import dotenv from "dotenv";
import { MigrationConfig } from "drizzle-orm/migrator";

dotenv.config({ path: process.env.ENV_FILE ?? ".env" });

type Config = {
  api: APIConfig;
  db: DBConfig;
  jwt: JWTConfig;
  auth: AuthConfig;
};

type APIConfig = {
  port: number;
  corsAllowedOrigins: string[];
  corsAllowedOriginSuffixes: string[];
};

type DBConfig = {
  url: string;
  migrationConfig: MigrationConfig;
};

type JWTConfig = {
  secret: string;
  defaultDuration: number;
  refreshDuration: number;
};

type AuthConfig = {
  refreshCookieName: string;
  cookieDomain?: string;
  cookieSecure: boolean;
  cookieSameSite: "lax" | "strict" | "none";
  cookiePath: string;
};

function envOrThrow(key: string) {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Environment variable ${key} is not set`);
  }
  return value;
}

function envOrDefault(key: string, defaultValue: string): string {
  const value = process.env[key];
  if (!value) {
    return defaultValue;
  }
  return value;
}

function numberEnvOrDefault(key: string, defaultValue: number): number {
  const value = process.env[key];
  if (!value) {
    return defaultValue;
  }
  const parsed = Number(value);
  if (Number.isNaN(parsed)) {
    throw new Error(`Environment variable ${key} must be a number`);
  }
  return parsed;
}

function booleanEnvOrDefault(key: string, defaultValue: boolean): boolean {
  const value = process.env[key];
  if (!value) {
    return defaultValue;
  }
  return value === "true" || value === "1";
}

function csvEnvOrDefault(key: string, defaultValues: string[]): string[] {
  const value = process.env[key];
  if (!value) {
    return defaultValues;
  }
  return value
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

function sameSiteEnvOrDefault(
  key: string,
  defaultValue: "lax" | "strict" | "none",
): "lax" | "strict" | "none" {
  const value = process.env[key];
  if (!value) {
    return defaultValue;
  }
  const normalized = value.toLowerCase();
  if (normalized === "lax" || normalized === "strict" || normalized === "none") {
    return normalized;
  }
  throw new Error(`Environment variable ${key} must be one of lax, strict, none`);
}

const migrationConfig: MigrationConfig = {
  migrationsFolder: "./src/db/migrations",
};

export const config: Config = {
  api: {
    port: Number(envOrThrow("PORT")),
    corsAllowedOrigins: csvEnvOrDefault("CORS_ALLOWED_ORIGINS", [
      "http://localhost:3000",
      "http://127.0.0.1:3000",
      "http://localhost:5173",
      "http://127.0.0.1:5173",
    ]),
    corsAllowedOriginSuffixes: csvEnvOrDefault("CORS_ALLOWED_ORIGIN_SUFFIXES", [
      ".studiqo.io",
    ]),
  },
  db: {
    url: envOrThrow("DB_URL"),
    migrationConfig,
  },
  jwt: {
    secret: envOrThrow("JWT_SECRET"),
    defaultDuration: Number(envOrThrow("JWT_DEFAULT_DURATION")),
    refreshDuration: numberEnvOrDefault(
      "JWT_REFRESH_DURATION",
      Number(envOrThrow("JWT_DEFAULT_DURATION")) * 24 * 30,
    ),
  },
  auth: {
    refreshCookieName: envOrDefault("AUTH_REFRESH_COOKIE_NAME", "studiqo_refresh"),
    cookieDomain: process.env.AUTH_COOKIE_DOMAIN,
    cookieSecure: booleanEnvOrDefault("AUTH_COOKIE_SECURE", false),
    cookieSameSite: sameSiteEnvOrDefault("AUTH_COOKIE_SAME_SITE", "lax"),
    cookiePath: envOrDefault("AUTH_COOKIE_PATH", "/api/v1/auth"),
  },
};
