import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";

import postgres from "postgres";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { drizzle } from "drizzle-orm/postgres-js";
import { apiRouter } from "./routes/index.js";
import { errorMiddleWare } from "./common/middleware/error.middleware.js";
import { config } from "./config/config.js";
import helmet from "helmet";
import morgan from "morgan";

const allowedOrigins = new Set(config.api.corsAllowedOrigins);

function isAllowedOrigin(origin: string): boolean {
  if (allowedOrigins.has(origin)) {
    return true;
  }
  try {
    const parsedOrigin = new URL(origin);
    if (parsedOrigin.protocol !== "https:") {
      return false;
    }
    const hostname = parsedOrigin.hostname;
    return config.api.corsAllowedOriginSuffixes.some((suffix) =>
      hostname.endsWith(suffix),
    );
  } catch {
    return false;
  }
}

const migrationClient = postgres(config.db.url, { max: 1 });
await migrate(drizzle(migrationClient), config.db.migrationConfig);

export const app = express();

app.use(helmet());
app.use(
  cors({
    credentials: true,
    origin: (origin, callback) => {
      if (!origin || isAllowedOrigin(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error("CORS origin denied"));
    },
  }),
);
app.use(morgan("dev"));
app.use(express.json());
app.use(cookieParser());

app.use("/api", apiRouter);

app.use(errorMiddleWare);
