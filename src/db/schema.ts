import { pgTable, timestamp, varchar, uuid } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom().notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at")
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
  email: varchar("email", { length: 256 }).unique().notNull(),
  hasedPassword: varchar("hased_password", { length: 256 }).notNull(),
});

export type NewUser = typeof users.$inferInsert;

export const refreshTokens = pgTable("refresh_tokens", {
  token: varchar("token", { length: 256 }).primaryKey().notNull(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at")
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
  expiresAt: timestamp("expires_at").notNull(),
  revokedAt: timestamp("revoked_at"),
});

export type NewRefreshToken = typeof refreshTokens.$inferInsert;
