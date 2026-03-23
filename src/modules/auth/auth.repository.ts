import { db } from "../../db/index.js";
import {
  NewRefreshToken,
  NewUser,
  refreshTokens,
  users,
} from "../../db/schema.js";
import { and, eq, gt, isNull } from "drizzle-orm";

export const authRepository = {
  createUser: async (user: NewUser) => {
    const [result] = await db
      .insert(users)
      .values(user)
      .onConflictDoNothing()
      .returning();
    return result;
  },
  getUserByEmail: async (email: string) => {
    const [result] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);
    return result;
  },
  getUserById: async (id: string) => {
    const [result] = await db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1);
    return result;
  },
  createRefreshToken: async (refreshToken: NewRefreshToken) => {
    const [result] = await db
      .insert(refreshTokens)
      .values(refreshToken)
      .returning();
    return result;
  },
  getUserfromRefreshToken: async (token: string) => {
    const [result] = await db
      .select({ user: users })
      .from(users)
      .innerJoin(refreshTokens, eq(users.id, refreshTokens.userId))
      .where(
        and(
          eq(refreshTokens.token, token),
          isNull(refreshTokens.revokedAt),
          gt(refreshTokens.expiresAt, new Date()),
        ),
      )
      .limit(1);
    return result;
  },
  revokeRefreshToken: async (token: string) => {
    await db
      .update(refreshTokens)
      .set({ revokedAt: new Date() })
      .where(
        and(eq(refreshTokens.token, token), isNull(refreshTokens.revokedAt)),
      );
  },
};
