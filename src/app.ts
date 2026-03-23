import express from "express";
import cors from "cors";

import postgres from "postgres";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { drizzle } from "drizzle-orm/postgres-js";
import { apiRouter } from "./routes/index.js";
import { errorMiddleWare } from "./common/middleware/error.middleware.js";
import { config } from "./config/config.js";
import helmet from "helmet";
import morgan from "morgan";

const migrationClient = postgres(config.db.url, { max: 1 });
await migrate(drizzle(migrationClient), config.db.migrationConfig);

export const app = express();


app.use(helmet());
app.use(cors());
app.use(morgan("dev"));
app.use(express.json());

app.use("/api", apiRouter);

app.use(errorMiddleWare);
