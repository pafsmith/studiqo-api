import { db } from "../../db/index.js";
import {
  NewRefreshToken,
  NewUser,
  refreshTokens,
  users,
} from "../../db/schema.js";
import { eq } from "drizzle-orm";

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
  createRefreshToken: async (refreshToken: NewRefreshToken) => {
    const [result] = await db
      .insert(refreshTokens)
      .values(refreshToken)
      .returning();
    return result;
  },
};
